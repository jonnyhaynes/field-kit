/**
 * The rule that matters most in this app: a position taken *now* is not the same thing as a position
 * taken *earlier*, and the second must never be shown as the first (plan §4.1 rule 1).
 *
 * The types carry the rule rather than a comment. A current-position slot accepts `CurrentPosition`;
 * a `RecordedLocation` is a different type, so passing one does not compile. `assertCurrent` covers
 * the other way in — a value that came back from storage and lost its type on the way.
 */

import type { Coordinates } from '@/aed';

/** Taken from the device just now. It has no sample time because it *is* now. */
export type CurrentPosition = {
  readonly kind: 'current';
  readonly coordinates: Coordinates;
};

/** Recorded at some point in the past, and only ever shown as such. */
export type RecordedLocation = {
  readonly kind: 'recorded';
  readonly coordinates: Coordinates;
  /** ISO-8601: when the position was taken, not when it was read. */
  readonly sampledAt: string;
  /** The what3words location resolved at the time, if one was. */
  readonly words?: string;
};

export type AnyLocation = CurrentPosition | RecordedLocation;

export class StalePositionError extends Error {
  constructor(detail: string) {
    super(`Not a current position: ${detail}`);
    this.name = 'StalePositionError';
  }
}

export function currentFrom(coordinates: Coordinates): CurrentPosition {
  return { kind: 'current', coordinates };
}

export function recordedFrom(
  coordinates: Coordinates,
  sampledAt: string,
  words?: string,
): RecordedLocation {
  return { kind: 'recorded', coordinates, sampledAt, words };
}

export function isCurrent(location: AnyLocation): location is CurrentPosition {
  return location.kind === 'current';
}

function isPlausibleCoordinates(value: unknown): value is Coordinates {
  if (value === null || typeof value !== 'object') return false;

  const { latitude, longitude } = value as { latitude?: unknown; longitude?: unknown };
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180
  );
}

/**
 * For values that lost their types on the way through JSON. Throws rather than returning something
 * the caller might render: a stale position shown as current is the failure this whole module is
 * about, and it would send help to the wrong place.
 */
export function assertCurrent(location: AnyLocation): CurrentPosition {
  if (!isCurrent(location)) {
    throw new StalePositionError(`it was recorded at ${location.sampledAt}`);
  }
  if (!isPlausibleCoordinates(location.coordinates)) {
    throw new StalePositionError('its coordinates are missing or not real');
  }
  return location;
}

/**
 * The only shape a current-position slot may render.
 *
 * The parameter type is the guard: a `RecordedLocation` is not assignable, so a slot cannot be
 * handed one by accident. `assertCurrent` still has to be used for anything that came from storage.
 */
export function describeCurrentPosition(position: CurrentPosition): string[] {
  return [position.coordinates.latitude.toFixed(5), position.coordinates.longitude.toFixed(5)];
}

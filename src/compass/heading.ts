/**
 * Heading, and when we are allowed to show it.
 *
 * The substance of this slice is not reading the sensor, it is deciding what may be shown. That
 * decision is `chooseCompassDisplay`, a pure function, and it is the only path from a reading to a
 * number on screen — which is what stops a wrong bearing leaking out through the UI.
 *
 * Three things make that necessary, all of them platform behaviour rather than our own:
 *
 * - `accuracy` does not mean the same thing on both platforms. iOS buckets a real angular error, so
 *   `2` is "within 35°". Android reports a raw calibration status, and initialises it to `0`.
 * - Both platforms use a **negative sentinel** for an unavailable true heading, and neither exposes
 *   the magnetic declination, so we cannot correct magnetic north into true north ourselves.
 * - A GPS "course" is not a compass. On Android a stationary device reports **0°, due north**,
 *   because expo never checks `hasBearing()`. Accepting it while stopped would be the exact
 *   confidently-wrong bearing this app must not show.
 */

import { toRadians, type Coordinates } from '@/aed';

export type HeadingAccuracy = 0 | 1 | 2 | 3;

export type HeadingReading = {
  /** Degrees from true north. Absent when the platform cannot say, which it signals with a negative. */
  trueHeading?: number;
  /** Degrees from magnetic north. Always present when there is a reading at all. */
  magneticHeading: number;
  accuracy: HeadingAccuracy;
};

export type CourseReading = {
  /** Degrees of travel, relative to true north. */
  degrees: number;
  /** Metres per second. The gate that makes a course trustworthy. */
  speedMetresPerSecond: number;
};

export type CompassDisplay =
  | { kind: 'heading'; degrees: number; reference: 'true' | 'magnetic' }
  | { kind: 'course'; degrees: number }
  | { kind: 'needs-calibration' }
  | { kind: 'unsupported' };

/**
 * Below this, no needle.
 *
 * On iOS `1` is a 35–50° error, which is worse than useless for choosing a path. Erring towards
 * "no bearing" is the safe direction: a stuck calibration state is a degradation, a wrong bearing
 * is a hazard.
 */
export const MINIMUM_TRUSTED_ACCURACY: HeadingAccuracy = 2;

/** Below this speed a GPS course is not a direction, it is noise. See the note above. */
export const MINIMUM_COURSE_SPEED_METRES_PER_SECOND = 2;

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function normaliseDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** `N`, `NE`, … because nobody says "042" out loud when they mean north-east. */
export function cardinal(degrees: number): string {
  return CARDINALS[Math.round(normaliseDegrees(degrees) / 45) % CARDINALS.length];
}

function isUsableHeading(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * The forward azimuth from one position to another: the bearing you would walk on.
 *
 * Computed from the two positions, so a defibrillator's bearing does not depend on which way the
 * phone happens to be pointing.
 */
export function initialBearing(from: Coordinates, to: Coordinates): number {
  const latitudeFrom = toRadians(from.latitude);
  const latitudeTo = toRadians(to.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLongitude) * Math.cos(latitudeTo);
  const x =
    Math.cos(latitudeFrom) * Math.sin(latitudeTo) -
    Math.sin(latitudeFrom) * Math.cos(latitudeTo) * Math.cos(deltaLongitude);

  return normaliseDegrees((Math.atan2(y, x) * 180) / Math.PI);
}

/**
 * Where a bearing sits relative to where you are facing: 0 is straight ahead, 90 is to your right.
 * This is what a needle is rotated by, and what "turn 40° right" is computed from.
 */
export function relativeBearing(bearing: number, heading: number): number {
  return normaliseDegrees(bearing - heading);
}

/** Which way to turn, and how far, for a target relative to the direction you face. */
export function turnInstruction(relative: number): {
  direction: 'left' | 'right' | 'straight';
  degrees: number;
} {
  const normalised = normaliseDegrees(relative);
  if (normalised <= 5 || normalised >= 355) return { direction: 'straight', degrees: 0 };

  return normalised <= 180
    ? { direction: 'right', degrees: Math.round(normalised) }
    : { direction: 'left', degrees: Math.round(360 - normalised) };
}

/**
 * What the screen is allowed to show, given whatever the device has produced.
 *
 * Precedence: a trustworthy heading first, because it is a compass; then a course, but only while
 * actually moving; then a calibration prompt if there is a magnetometer that needs one; and
 * otherwise an honest acknowledgement that this device cannot say which way it is pointing.
 */
export function chooseCompassDisplay({
  heading,
  course,
}: {
  heading?: HeadingReading;
  course?: CourseReading;
}): CompassDisplay {
  const usableCourse =
    course &&
    course.speedMetresPerSecond >= MINIMUM_COURSE_SPEED_METRES_PER_SECOND &&
    isUsableHeading(course.degrees)
      ? course
      : undefined;

  if (!heading) {
    return usableCourse
      ? { kind: 'course', degrees: normaliseDegrees(usableCourse.degrees) }
      : { kind: 'unsupported' };
  }

  if (heading.accuracy < MINIMUM_TRUSTED_ACCURACY) {
    // A magnetometer exists but cannot be trusted; only a moving course can rescue the screen.
    return usableCourse
      ? { kind: 'course', degrees: normaliseDegrees(usableCourse.degrees) }
      : { kind: 'needs-calibration' };
  }

  if (isUsableHeading(heading.trueHeading)) {
    return { kind: 'heading', degrees: normaliseDegrees(heading.trueHeading), reference: 'true' };
  }

  // Magnetic is still worth showing, but it must be called magnetic: declination is not exposed,
  // so presenting it as true north would be a quiet lie of up to a few degrees, more in the west.
  return isUsableHeading(heading.magneticHeading)
    ? { kind: 'heading', degrees: normaliseDegrees(heading.magneticHeading), reference: 'magnetic' }
    : usableCourse
      ? { kind: 'course', degrees: normaliseDegrees(usableCourse.degrees) }
      : { kind: 'unsupported' };
}

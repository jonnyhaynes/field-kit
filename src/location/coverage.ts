/**
 * Whether a position is somewhere an OS grid reference means anything.
 *
 * The OS grid's published area of use is a *rectangle* (49.75°N–61°N, 9.01°W–2.01°E) that
 * contains the whole island of Ireland. Dublin projects inside it to a perfectly plausible
 * reference in a different country, so the rectangle is only a fast reject and the real answer
 * comes from an outline. That is the same rectangle trap the map archive has.
 */

import type { Coordinates } from '@/aed';

import { GB_OUTLINE, type OutlinePoint, type OutlineRing } from './gb-outline';

/** The OS grid's declared area of use. Outside this there is nothing to project into. */
export const OS_AREA_OF_USE = {
  minLatitude: 49.75,
  maxLatitude: 61.01,
  minLongitude: -9.01,
  maxLongitude: 2.01,
} as const;

/**
 * How far outside the coastline still counts as covered.
 *
 * A 1:50m outline simplified to ~2 km is imprecise at the coast, and a position on a beach must
 * not be told it has no grid reference. So the test errs towards "covered": the dangerous
 * failure is a confident wrong reference, and a missing one is merely unhelpful.
 */
export const COASTAL_PAD_METRES = 2_000;

const METRES_PER_DEGREE_LATITUDE = 111_320;

function metresPerDegreeLongitude(latitude: number): number {
  return METRES_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180);
}

function isWithinAreaOfUse(coordinates: Coordinates): boolean {
  return (
    coordinates.latitude >= OS_AREA_OF_USE.minLatitude &&
    coordinates.latitude <= OS_AREA_OF_USE.maxLatitude &&
    coordinates.longitude >= OS_AREA_OF_USE.minLongitude &&
    coordinates.longitude <= OS_AREA_OF_USE.maxLongitude
  );
}

/** Ray casting in lat/long, which is safe here: it is a containment test, not a measurement. */
function isInsideRing(coordinates: Coordinates, ring: OutlineRing): boolean {
  let inside = false;

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const [latitude, longitude] = ring[index];
    const [previousLatitude, previousLongitude] = ring[previous];

    const crosses = latitude > coordinates.latitude !== previousLatitude > coordinates.latitude;
    if (
      crosses &&
      coordinates.longitude <
        ((previousLongitude - longitude) * (coordinates.latitude - latitude)) /
          (previousLatitude - latitude) +
          longitude
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/** Local planar projection around the query point — accurate enough for a 2 km safety margin. */
function toLocalMetres(
  origin: Coordinates,
  point: OutlinePoint,
  metresPerLongitude: number,
): [number, number] {
  return [
    (point[1] - origin.longitude) * metresPerLongitude,
    (point[0] - origin.latitude) * METRES_PER_DEGREE_LATITUDE,
  ];
}

function distanceToSegmentMetres(
  a: [number, number],
  b: [number, number],
  point: [number, number],
): number {
  const [ax, ay] = a;
  const [bx, by] = b;
  const [px, py] = point;

  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));

  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function isWithinPadOfRing(coordinates: Coordinates, ring: OutlineRing): boolean {
  const metresPerLongitude = metresPerDegreeLongitude(coordinates.latitude);
  const origin: [number, number] = [0, 0];
  const metres = ring.map((point) => toLocalMetres(coordinates, point, metresPerLongitude));

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    if (distanceToSegmentMetres(metres[previous], metres[index], origin) <= COASTAL_PAD_METRES) {
      return true;
    }
  }

  return false;
}

/**
 * True when the point is on land the OS grid is meaningful for: Great Britain, Northern Ireland
 * or the Isle of Man, or close enough to the coast to count.
 *
 * Northern Ireland is included deliberately. OS's own stated coverage is Great Britain and the
 * Isle of Man, with Ireland on a separate grid, but the GB grid is computable across Northern
 * Ireland and it is part of the UK — refusing to give someone in Belfast a reference would be
 * worse than the ambiguity.
 */
export function isWithinOsGridCoverage(coordinates: Coordinates): boolean {
  if (!isWithinAreaOfUse(coordinates)) return false;

  return GB_OUTLINE.some(
    (ring) => isInsideRing(coordinates, ring) || isWithinPadOfRing(coordinates, ring),
  );
}

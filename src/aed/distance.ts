/**
 * Great-circle distance, and the bounding box that makes proximity search cheap.
 *
 * Pure maths, so it can be tested without a dataset, a device or a network. The box is
 * always a *superset* of the circle it is derived from — `nearestAeds` leans on that to
 * argue its prefilter cannot hide a true neighbour.
 */

import type { Coordinates } from './types';

/** Mean Earth radius (IUGG), in metres. */
export const EARTH_RADIUS_M = 6_371_008.8;

const DEGREES_PER_RADIAN = 180 / Math.PI;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Distance between two points along a great circle, in metres.
 *
 * Uses the atan2 form rather than `acos`: it stays accurate for the small distances
 * this app is actually used at, where `acos` loses precision to rounding.
 */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const deltaLatitude = toRadians(b.latitude - a.latitude);
  const deltaLongitude = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);

  const h =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export type BoundingBox = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

/** The smallest lat/long box that contains every point within `radiusMeters`. */
export function boundingBoxAround(center: Coordinates, radiusMeters: number): BoundingBox {
  const latitudeDelta = (radiusMeters / EARTH_RADIUS_M) * DEGREES_PER_RADIAN;
  // Guard the cosine near the poles so the longitude spread cannot run off to infinity.
  const longitudeDelta = Math.min(
    180,
    latitudeDelta / Math.max(Math.cos(toRadians(center.latitude)), Number.EPSILON),
  );

  return {
    minLatitude: center.latitude - latitudeDelta,
    maxLatitude: center.latitude + latitudeDelta,
    minLongitude: center.longitude - longitudeDelta,
    maxLongitude: center.longitude + longitudeDelta,
  };
}

export function isWithinBox(point: Coordinates, box: BoundingBox): boolean {
  return (
    point.latitude >= box.minLatitude &&
    point.latitude <= box.maxLatitude &&
    point.longitude >= box.minLongitude &&
    point.longitude <= box.maxLongitude
  );
}

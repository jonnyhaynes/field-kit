/**
 * The extent of the bundled archive.
 *
 * Copied from the committed file's own header (`pmtiles show assets/maps/uk-overview.pmtiles`),
 * so it can be checked against the archive rather than trusted. Outside this box the map has no
 * tiles at all, which is a blank grey rectangle unless the screen says why — and the plan's
 * promise is that the map is never blank.
 */

import type { Coordinates } from '@/aed';

export type MapBounds = {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
};

export const UK_OVERVIEW_BOUNDS: MapBounds = {
  minLongitude: -8.65,
  minLatitude: 49.86,
  maxLongitude: 1.77,
  maxLatitude: 60.86,
};

export function boundsContain(bounds: MapBounds, coordinates: Coordinates): boolean {
  return (
    coordinates.longitude >= bounds.minLongitude &&
    coordinates.longitude <= bounds.maxLongitude &&
    coordinates.latitude >= bounds.minLatitude &&
    coordinates.latitude <= bounds.maxLatitude
  );
}

/**
 * A rough size for a bounding box, in square degrees.
 *
 * Only ever used to compare two boxes against each other — "which pack is more specific" — so
 * the units do not matter and a proper geodesic area would be precision nobody reads.
 */
export function boundsArea(bounds: MapBounds): number {
  return (
    Math.abs(bounds.maxLongitude - bounds.minLongitude) *
    Math.abs(bounds.maxLatitude - bounds.minLatitude)
  );
}

/** True when `inner` sits entirely inside `outer`, allowing for shared edges. */
export function boundsWithin(inner: MapBounds, outer: MapBounds): boolean {
  return (
    inner.minLongitude >= outer.minLongitude &&
    inner.maxLongitude <= outer.maxLongitude &&
    inner.minLatitude >= outer.minLatitude &&
    inner.maxLatitude <= outer.maxLatitude
  );
}

export function isWithinUkOverview(coordinates: Coordinates): boolean {
  return boundsContain(UK_OVERVIEW_BOUNDS, coordinates);
}

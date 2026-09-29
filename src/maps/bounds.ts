/**
 * The extent of the bundled archive.
 *
 * Copied from the committed file's own header (`pmtiles show assets/maps/uk-overview.pmtiles`),
 * so it can be checked against the archive rather than trusted. Outside this box the map has no
 * tiles at all, which is a blank grey rectangle unless the screen says why — and the plan's
 * promise is that the map is never blank.
 */

import type { Coordinates } from '@/aed';

export const UK_OVERVIEW_BOUNDS = {
  minLongitude: -8.65,
  minLatitude: 49.86,
  maxLongitude: 1.77,
  maxLatitude: 60.86,
} as const;

export function isWithinUkOverview(coordinates: Coordinates): boolean {
  return (
    coordinates.longitude >= UK_OVERVIEW_BOUNDS.minLongitude &&
    coordinates.longitude <= UK_OVERVIEW_BOUNDS.maxLongitude &&
    coordinates.latitude >= UK_OVERVIEW_BOUNDS.minLatitude &&
    coordinates.latitude <= UK_OVERVIEW_BOUNDS.maxLatitude
  );
}

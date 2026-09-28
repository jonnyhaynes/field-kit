/**
 * Nearest-defibrillator search over the bundled dataset.
 *
 * The dataset is small enough to hold in memory but large enough that a full scan with a
 * great-circle distance for every record is wasteful, so the search grows a lat/long box
 * outward from the centre and settles once it has enough neighbours inside the radius.
 *
 * Correctness argument: the box is a superset of the circle it is derived from, and the
 * search only stops when at least `limit` records lie *within* the radius. At that point
 * the nth-nearest distance is no larger than the radius, so every record nearer than it
 * lies inside the circle — and therefore inside the box, and therefore in the candidate
 * set. The prefilter cannot hide a true neighbour, which the equivalence test pins down.
 */

import { boundingBoxAround, EARTH_RADIUS_M, haversineMeters, isWithinBox } from './distance';
import type { AedRecord, Coordinates } from './types';

export type AedNeighbour = AedRecord & { meters: number };

export type NearestQuery = {
  center: Coordinates;
  limit: number;
  /** Ids the user has flagged inaccurate. Flagged records never appear in results. */
  excludedIds?: ReadonlySet<number>;
  /** Where the outward search starts. It grows on its own; this only sets the floor. */
  initialRadiusMeters?: number;
};

const DEFAULT_INITIAL_RADIUS_M = 5_000;
/** Half the planet's circumference — grow past this and we are comparing antipodes. */
const MAX_RADIUS_M = Math.PI * EARTH_RADIUS_M;

const byDistance = (a: AedNeighbour, b: AedNeighbour): number => a.meters - b.meters || a.id - b.id;

function withDistance(records: readonly AedRecord[], center: Coordinates): AedNeighbour[] {
  return records.map((record) => ({
    ...record,
    meters: haversineMeters(center, record.coordinates),
  }));
}

/** The nearest defibrillators to a point, nearest first, flagged records excluded. */
export function nearestAeds(records: readonly AedRecord[], query: NearestQuery): AedNeighbour[] {
  if (!Number.isInteger(query.limit) || query.limit <= 0) {
    throw new RangeError(`limit must be a positive integer, received ${String(query.limit)}`);
  }

  const excluded = query.excludedIds ?? new Set<number>();
  const candidates = records.filter((record) => !excluded.has(record.id));

  let radius = Math.max(query.initialRadiusMeters ?? DEFAULT_INITIAL_RADIUS_M, 1);

  for (;;) {
    const box = boundingBoxAround(query.center, radius);
    const within = withDistance(
      candidates.filter((record) => isWithinBox(record.coordinates, box)),
      query.center,
    )
      .filter((neighbour) => neighbour.meters <= radius)
      .sort(byDistance);

    if (within.length >= query.limit) return within.slice(0, query.limit);

    // Fewer than `limit` exist, or the box cannot grow further: answer honestly from the
    // whole corpus rather than looping forever.
    if (radius >= MAX_RADIUS_M) {
      return withDistance(candidates, query.center).sort(byDistance).slice(0, query.limit);
    }

    radius *= 2;
  }
}

import { describe, expect, it } from '@jest/globals';

import { haversineMeters } from '../distance';
import { nearestAeds, type AedNeighbour } from '../proximity';
import type { AedRecord } from '../types';

const CENTRE = { latitude: 51.5074, longitude: -0.1278 };

const record = (id: number, latitude: number, longitude: number): AedRecord => ({
  id,
  coordinates: { latitude, longitude },
  source: { dataset: 'osm-fixture-2026-09-01', osmNodeId: id },
  verification: { status: 'never-verified' },
});

/** A deterministic spread of roughly 190 records across Greater London. */
const grid = (): AedRecord[] => {
  const records: AedRecord[] = [];
  let id = 1;
  for (let latitude = 51.3; latitude <= 51.7; latitude += 0.05) {
    for (let longitude = -0.6; longitude <= 0.4; longitude += 0.05) {
      records.push(record(id, Number(latitude.toFixed(2)), Number(longitude.toFixed(2))));
      id += 1;
    }
  }
  return records;
};

const bruteForce = (
  records: readonly AedRecord[],
  limit: number,
  excluded: ReadonlySet<number> = new Set(),
): AedNeighbour[] =>
  records
    .filter((entry) => !excluded.has(entry.id))
    .map((entry) => ({ ...entry, meters: haversineMeters(CENTRE, entry.coordinates) }))
    .sort((a, b) => a.meters - b.meters || a.id - b.id)
    .slice(0, limit);

describe('nearestAeds', () => {
  it('returns nothing when there is nothing to search', () => {
    expect(nearestAeds([], { center: CENTRE, limit: 3 })).toEqual([]);
  });

  it('orders by true distance, nearest first', () => {
    const results = nearestAeds(grid(), { center: CENTRE, limit: 5 });
    const distances = results.map((entry) => entry.meters);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('caps the result at the requested limit', () => {
    expect(nearestAeds(grid(), { center: CENTRE, limit: 3 })).toHaveLength(3);
  });

  it('finds distant neighbours beyond its starting radius', () => {
    const far = [record(1, 51.5074, -0.1278), record(2, 57.4778, -4.2247)];
    const results = nearestAeds(far, { center: CENTRE, limit: 2, initialRadiusMeters: 1 });
    expect(results.map((entry) => entry.id)).toEqual([1, 2]);
  });

  it('matches brute force exactly, whatever the starting radius', () => {
    const records = grid();
    const excluded = new Set([3, 17, 42]);
    for (const initialRadiusMeters of [1, 100, 5_000, 100_000]) {
      for (const limit of [1, 5, 25, 500]) {
        const viaSearch = nearestAeds(records, {
          center: CENTRE,
          limit,
          excludedIds: excluded,
          initialRadiusMeters,
        });
        expect(viaSearch.map((entry) => entry.id)).toEqual(
          bruteForce(records, limit, excluded).map((entry) => entry.id),
        );
      }
    }
  });

  it('excludes flagged records from the results immediately', () => {
    const unflagged = nearestAeds(grid(), { center: CENTRE, limit: 1 });
    const flaggedId = unflagged[0].id;
    const flagged = nearestAeds(grid(), {
      center: CENTRE,
      limit: 1,
      excludedIds: new Set([flaggedId]),
    });

    expect(flagged[0].id).not.toBe(flaggedId);
  });

  it('never returns more than exists when the limit exceeds the corpus', () => {
    const records = [record(1, 51.51, -0.13), record(2, 51.6, -0.2)];
    expect(nearestAeds(records, { center: CENTRE, limit: 10 })).toHaveLength(2);
  });

  it.each([0, -1, 1.5, Number.NaN])('refuses a limit of %p', (limit) => {
    expect(() => nearestAeds(grid(), { center: CENTRE, limit })).toThrow(RangeError);
  });
});

import { describe, expect, it } from '@jest/globals';

import {
  AED_ATTRIBUTION,
  AED_DB_SCHEMA_VERSION,
  AED_SCHEMA_SQL,
  assertDatasetMeta,
  buildDatasetMeta,
  DatasetIntegrityError,
  datasetMetaProblems,
  datasetMetaRows,
  toDatasetRows,
  type AedDatasetMeta,
} from '../dataset';
import type { AedRecord } from '../types';

const record = (id: number, verification: AedRecord['verification']): AedRecord => ({
  id,
  coordinates: { latitude: 51.5074, longitude: -0.1278 },
  source: { dataset: 'osm-overpass@2026-09-27T20:23:36Z', osmNodeId: id },
  verification,
});

const goodMeta = (): AedDatasetMeta =>
  buildDatasetMeta({
    dataset: 'osm-overpass@2026-09-27T20:23:36Z',
    timestamp: '2026-09-27T20:23:36Z',
    query: 'node["emergency"="defibrillator"](area.uk);',
    builtAt: '2026-09-28T14:00:00.000Z',
    records: [
      record(1, { status: 'verified', on: '2025-06-01' }),
      record(2, { status: 'never-verified' }),
    ],
    rejected: [{ reason: 'not-a-defibrillator' }, { reason: 'not-publicly-accessible' }],
  });

describe('toDatasetRows', () => {
  it('maps a verified record to its ISO date', () => {
    expect(toDatasetRows([record(1, { status: 'verified', on: '2025-06-01' })])).toEqual([
      {
        id: 1,
        latitude: 51.5074,
        longitude: -0.1278,
        verified_on: '2025-06-01',
        source_dataset: 'osm-overpass@2026-09-27T20:23:36Z',
      },
    ]);
  });

  it('maps never-verified to NULL rather than inventing a date', () => {
    expect(toDatasetRows([record(2, { status: 'never-verified' })])[0].verified_on).toBeNull();
  });
});

describe('the shipped schema', () => {
  it('declares the records table, its index and the meta table', () => {
    expect(AED_SCHEMA_SQL).toMatch(/CREATE TABLE aed \(/);
    expect(AED_SCHEMA_SQL).toMatch(/verified_on TEXT/);
    expect(AED_SCHEMA_SQL).toMatch(/CREATE INDEX aed_latitude_longitude/);
    expect(AED_SCHEMA_SQL).toMatch(/CREATE TABLE meta \(/);
  });
});

describe('buildDatasetMeta', () => {
  it('counts rejections by reason and never-verified records', () => {
    const meta = goodMeta();
    expect(meta.counts.accepted).toBe(2);
    expect(meta.counts.rejected).toBe(2);
    expect(meta.counts.rejectedByReason).toEqual({
      'not-a-defibrillator': 1,
      'not-publicly-accessible': 1,
      stale: 0,
    });
    expect(meta.counts.neverVerified).toBe(1);
  });

  it('carries the ODbL licence and attribution', () => {
    expect(goodMeta().licence).toEqual({
      id: 'ODbL-1.0',
      attribution: AED_ATTRIBUTION,
      url: 'https://www.openstreetmap.org/copyright',
    });
  });

  it('stamps the current schema version', () => {
    expect(goodMeta().schemaVersion).toBe(AED_DB_SCHEMA_VERSION);
  });
});

describe('assertDatasetMeta', () => {
  it('passes a well-formed dataset', () => {
    expect(() => assertDatasetMeta(goodMeta())).not.toThrow();
    expect(datasetMetaProblems(goodMeta())).toEqual([]);
  });

  it('refuses an empty dataset rather than shipping nothing', () => {
    const empty = buildDatasetMeta({
      dataset: 'osm-overpass@2026-09-27T20:23:36Z',
      query: 'node["emergency"="defibrillator"](area.uk);',
      builtAt: '2026-09-28T14:00:00.000Z',
      records: [],
      rejected: [],
    });
    expect(() => assertDatasetMeta(empty)).toThrow(DatasetIntegrityError);
    expect(datasetMetaProblems(empty).join(' ')).toMatch(/empty/i);
  });

  it.each([
    ['a schema version from the future', { schemaVersion: 99 }],
    ['a builtAt that is not a date', { builtAt: 'yesterday' }],
    ['an empty source query', { source: { dataset: 'x', query: '  ' } }],
    ['a licence that is not ODbL', { licence: { id: 'proprietary', attribution: 'x', url: 'y' } }],
    ['missing attribution', { licence: { id: 'ODbL-1.0', attribution: '', url: 'y' } }],
  ])('catches %s', (_label, patch) => {
    const meta = { ...goodMeta(), ...patch } as AedDatasetMeta;
    expect(datasetMetaProblems(meta)).not.toEqual([]);
  });
});

describe('datasetMetaRows', () => {
  it('records the licence inside the database, not only beside it', () => {
    const rows = datasetMetaRows(goodMeta());
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    expect(byKey.attribution).toBe(AED_ATTRIBUTION);
    expect(byKey.licence).toBe('ODbL-1.0');
    expect(byKey.schema_version).toBe(String(AED_DB_SCHEMA_VERSION));
    expect(JSON.parse(byKey.meta).counts.accepted).toBe(2);
  });
});

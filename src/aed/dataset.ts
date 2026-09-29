/**
 * The shipped database format, and the metadata that has to travel with it.
 *
 * Two things this encodes deliberately. `verified_on` is nullable and NULL means "never
 * verified" — the common case, since only about 7% of UK defibrillator nodes in OSM carry a
 * check_date. And the ODbL notice lives in a `meta` table *inside* the database as well as
 * in the sidecar JSON, because the licence has to travel with the data rather than depend
 * on someone remembering to ship a readme.
 */

import type { GateRejectionReason } from './gate';
import type { AedRecord } from './types';

export const AED_DB_SCHEMA_VERSION = 1;

export const AED_LICENCE_ID = 'ODbL-1.0';
export const AED_ATTRIBUTION = '© OpenStreetMap contributors';
export const AED_LICENCE_URL = 'https://www.openstreetmap.org/copyright';

export const AED_SCHEMA_SQL = `
CREATE TABLE aed (
  id INTEGER PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  verified_on TEXT,
  source_dataset TEXT NOT NULL
);

CREATE INDEX aed_latitude_longitude ON aed (latitude, longitude);

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export type AedDatasetRow = {
  id: number;
  latitude: number;
  longitude: number;
  /** NULL when the record has never been verified. */
  verified_on: string | null;
  source_dataset: string;
};

/** Records as rows, with `never-verified` becoming NULL rather than a made-up date. */
export function toDatasetRows(records: readonly AedRecord[]): AedDatasetRow[] {
  return records.map((record) => ({
    id: record.id,
    latitude: record.coordinates.latitude,
    longitude: record.coordinates.longitude,
    verified_on: record.verification.status === 'verified' ? record.verification.on : null,
    source_dataset: record.source.dataset,
  }));
}

/**
 * Rows back into records — the inverse of `toDatasetRows`, used when loading the shipped
 * database. NULL becomes `never-verified` again rather than an invented date.
 */
export function toAedRecords(rows: readonly AedDatasetRow[]): AedRecord[] {
  return rows.map((row) => ({
    id: row.id,
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    source: { dataset: row.source_dataset, osmNodeId: row.id },
    verification:
      row.verified_on === null
        ? { status: 'never-verified' }
        : { status: 'verified', on: row.verified_on },
  }));
}

export type AedDatasetMeta = {
  schemaVersion: number;
  builtAt: string;
  source: { dataset: string; timestamp?: string; query: string };
  counts: {
    accepted: number;
    rejected: number;
    rejectedByReason: Record<GateRejectionReason, number>;
    neverVerified: number;
  };
  licence: { id: string; attribution: string; url: string };
};

export type DatasetMetaInput = {
  dataset: string;
  timestamp?: string;
  query: string;
  builtAt: string;
  records: readonly AedRecord[];
  rejected: readonly { reason: GateRejectionReason }[];
};

export function buildDatasetMeta(input: DatasetMetaInput): AedDatasetMeta {
  const rejectedByReason: Record<GateRejectionReason, number> = {
    'not-a-defibrillator': 0,
    'not-publicly-accessible': 0,
    stale: 0,
  };
  for (const entry of input.rejected) rejectedByReason[entry.reason] += 1;

  return {
    schemaVersion: AED_DB_SCHEMA_VERSION,
    builtAt: input.builtAt,
    source: { dataset: input.dataset, timestamp: input.timestamp, query: input.query },
    counts: {
      accepted: input.records.length,
      rejected: input.rejected.length,
      rejectedByReason,
      neverVerified: input.records.filter(
        (record) => record.verification.status === 'never-verified',
      ).length,
    },
    licence: { id: AED_LICENCE_ID, attribution: AED_ATTRIBUTION, url: AED_LICENCE_URL },
  };
}

export class DatasetIntegrityError extends Error {
  constructor(problems: readonly string[]) {
    super(`Unusable AED dataset:\n${problems.join('\n')}`);
    this.name = 'DatasetIntegrityError';
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Everything wrong with a dataset's metadata. Empty array means it passes. */
export function datasetMetaProblems(meta: AedDatasetMeta): string[] {
  const problems: string[] = [];

  if (meta.schemaVersion !== AED_DB_SCHEMA_VERSION) {
    problems.push(
      `schemaVersion is ${String(meta.schemaVersion)}, expected ${AED_DB_SCHEMA_VERSION}`,
    );
  }

  if (!meta.builtAt?.trim() || Number.isNaN(Date.parse(meta.builtAt))) {
    problems.push(`builtAt is not a real date: ${meta.builtAt ?? ''}`);
  }
  if (!ISO_DATE.test(meta.builtAt?.slice(0, 10) ?? '')) {
    problems.push(`builtAt is not an ISO-8601 date: ${String(meta.builtAt)}`);
  }

  if (!meta.source?.dataset?.trim()) problems.push('source.dataset is empty');
  if (!meta.source?.query?.trim()) problems.push('source.query is empty');

  // An empty dataset is a bug, not a legitimate outcome: it would look like a shipped
  // feature while showing a user nothing at a moment they may need it.
  if (!Number.isInteger(meta.counts?.accepted) || meta.counts.accepted <= 0) {
    problems.push(
      `counts.accepted is ${String(meta.counts?.accepted)} — refusing an empty dataset`,
    );
  }
  if (!Number.isInteger(meta.counts?.neverVerified) || meta.counts.neverVerified < 0) {
    problems.push('counts.neverVerified is not a non-negative integer');
  }

  if (meta.licence?.id !== AED_LICENCE_ID) problems.push('licence.id is not ODbL-1.0');
  if (!meta.licence?.attribution?.trim()) problems.push('licence.attribution is empty');
  if (!meta.licence?.url?.trim()) problems.push('licence.url is empty');

  return problems;
}

export function assertDatasetMeta(meta: AedDatasetMeta): void {
  const problems = datasetMetaProblems(meta);
  if (problems.length > 0) throw new DatasetIntegrityError(problems);
}

/** The metadata as rows for the database's own `meta` table. */
export function datasetMetaRows(meta: AedDatasetMeta): { key: string; value: string }[] {
  return [
    { key: 'schema_version', value: String(meta.schemaVersion) },
    { key: 'licence', value: meta.licence.id },
    { key: 'attribution', value: meta.licence.attribution },
    { key: 'licence_url', value: meta.licence.url },
    { key: 'source_dataset', value: meta.source.dataset },
    { key: 'source_timestamp', value: meta.source.timestamp ?? '' },
    { key: 'built_at', value: meta.builtAt },
    { key: 'meta', value: JSON.stringify(meta) },
  ];
}

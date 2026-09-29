/**
 * Build the bundled AED SQLite database from an Overpass export.
 *
 * Deliberately thin: parsing, the quality gate and the schema all live in src/aed, where
 * they are unit-tested. This file is the only part that touches the filesystem, and it has
 * no network path at all — the extract is passed in with `--from-file`, so the same command
 * runs on a laptop and in CI, and CI can prove the pipeline end to end without reaching OSM.
 *
 * It reads Overpass JSON rather than a Geofabrik PBF on purpose: a fixture is a few
 * kilobytes, and a PBF route can be added later by converting to this same shape.
 *
 * The real UK extract is produced by a documented manual run. See docs/plans/fieldkit-v1.md.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

import {
  AED_SCHEMA_SQL,
  applyQualityGate,
  assertDatasetMeta,
  buildDatasetMeta,
  datasetMetaRows,
  overpassTimestamp,
  parseGeoJsonExtract,
  parseOverpassExtract,
  toDatasetRows,
  type AedDatasetMeta,
  type AedDatasetRow,
  type GatePolicy,
  type ParsedExtract,
} from '../src/aed';

/**
 * Recorded in the metadata so a shipped database says exactly how it was produced. The UK
 * boundary comes from the ISO code on the admin_level=2 relation.
 */
const OVERPASS_QUERY = `[out:json][timeout:180];
area["ISO3166-1"="GB"][admin_level=2]->.uk;
(
  node["emergency"="defibrillator"](area.uk);
  way["emergency"="defibrillator"](area.uk);
);
out body center;`;

const DEFAULT_OUT = 'assets/data/aed.db';

const USAGE = `Usage: npm run build:aed -- --from-file <extract.json> [options]

  --from-file <path>          Overpass JSON or GeoJSON export to read (required)
  --out <path>                SQLite database to write (default ${DEFAULT_OUT})
  --meta <path>               Metadata JSON to write (default <out>.json)
  --dataset <label>           Source label recorded on every row
                              (default derived from the extract)
  --source-timestamp <iso>    The extract's OSM data timestamp, when the file
                              does not carry one (a GeoJSON from osmium does not)
  --query <text>              Provenance recorded as the source query or command
  --max-age-years <n>         Drop records whose explicit check_date is older
                              than n years (off by default — the threshold is an
                              open question, see issue #4)`;

/**
 * Overpass JSON (`elements[]`) or GeoJSON (`FeatureCollection`).
 *
 * Sniffed from the payload rather than demanded as a flag: the two shapes are unambiguous, so
 * a wrong file should fail on its contents rather than on how it was described.
 */
function parseExtract(payload: unknown, dataset: string): ParsedExtract {
  const record =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : undefined;

  if (record && 'elements' in record) return parseOverpassExtract(payload, dataset);
  if (record && record.type === 'FeatureCollection') return parseGeoJsonExtract(payload, dataset);

  throw new Error(
    'unrecognised extract: expected Overpass JSON (`elements`) or GeoJSON (`FeatureCollection`)',
  );
}

function parsePolicy(raw: string | undefined): GatePolicy | undefined {
  if (raw === undefined) return undefined;

  const years = Number(raw);
  if (!Number.isFinite(years) || years <= 0) {
    throw new Error(`--max-age-years must be a positive number, received ${raw}`);
  }
  return { maxAgeYears: years };
}

function writeDatabase(path: string, rows: readonly AedDatasetRow[], meta: AedDatasetMeta): void {
  const db = new DatabaseSync(path);
  try {
    // DELETE journal mode, and vacuumed afterwards: a shipped database should not arrive
    // with -wal/-shm sidecars beside it.
    db.exec('PRAGMA journal_mode = DELETE;');
    db.exec(AED_SCHEMA_SQL);

    const insertRecord = db.prepare(
      'INSERT INTO aed (id, latitude, longitude, verified_on, source_dataset) VALUES (?, ?, ?, ?, ?)',
    );
    db.exec('BEGIN');
    for (const row of rows) {
      insertRecord.run(row.id, row.latitude, row.longitude, row.verified_on, row.source_dataset);
    }
    db.exec('COMMIT');

    const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
    for (const row of datasetMetaRows(meta)) insertMeta.run(row.key, row.value);

    db.exec('VACUUM;');
  } finally {
    db.close();
  }
}

function main(): number {
  const { values } = parseArgs({
    options: {
      'from-file': { type: 'string' },
      out: { type: 'string' },
      meta: { type: 'string' },
      dataset: { type: 'string' },
      'source-timestamp': { type: 'string' },
      query: { type: 'string' },
      'max-age-years': { type: 'string' },
    },
  });

  const fromFile = values['from-file'];
  if (!fromFile) {
    console.error(USAGE);
    return 2;
  }

  const payload: unknown = JSON.parse(readFileSync(resolve(fromFile), 'utf8'));

  const timestamp = values['source-timestamp'] ?? overpassTimestamp(payload);
  const dataset =
    values.dataset ?? (timestamp ? `osm-overpass@${timestamp}` : 'osm-overpass@unknown');
  const extract = parseExtract(payload, dataset);

  const builtAt = new Date().toISOString();
  const summary = applyQualityGate(extract.nodes, {
    policy: parsePolicy(values['max-age-years']),
    asOf: new Date(builtAt),
  });

  const meta = buildDatasetMeta({
    dataset,
    timestamp,
    query: values.query ?? OVERPASS_QUERY,
    builtAt,
    records: summary.accepted,
    rejected: summary.rejected,
  });

  // Throws rather than writing an empty or malformed database.
  assertDatasetMeta(meta);

  const outPath = resolve(values.out ?? DEFAULT_OUT);
  const metaPath = resolve(values.meta ?? `${outPath}.json`);

  mkdirSync(dirname(outPath), { recursive: true });
  rmSync(outPath, { force: true });
  writeDatabase(outPath, toDatasetRows(summary.accepted), meta);
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);

  const { counts } = meta;
  console.log(
    `Wrote ${outPath} — ${counts.accepted} records, ${counts.neverVerified} never verified`,
  );
  console.log(`Rejected ${counts.rejected}: ${JSON.stringify(counts.rejectedByReason)}`);
  if (extract.ignored > 0) {
    console.log(`Ignored ${extract.ignored} element(s) with no usable coordinates`);
  }
  console.log(`Source ${dataset}${timestamp ? ` (OSM data ${timestamp})` : ''}`);
  console.log(`Metadata ${metaPath}`);
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exitCode = 1;
}

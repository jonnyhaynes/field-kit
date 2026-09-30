/**
 * Cutting a region pack, and recording it in the catalogue.
 *
 * Deliberately thin, like the AED pipeline: the catalogue rules live in `src/maps/regions.ts`, where
 * they are unit-tested, and this file is the part that touches the filesystem and the network.
 *
 * It shells out to the `pmtiles` CLI rather than reimplementing extraction, because extraction means
 * reading byte ranges out of a 138 GB remote archive — a solved problem, and not one worth a second
 * implementation. That makes the CLI a prerequisite, as `osmium` was for the AED dataset:
 *
 *   brew install pmtiles
 *
 * The pack is *not* committed. It is a release asset, because a 19 MB binary in the repository would
 * be paid for on every clone and every CI run, and because a pack is data rather than code. What the
 * repository keeps is the catalogue: which packs exist, what they hash to, and where to fetch them.
 *
 * Usage:
 *   npm run build:pack -- --region lake-district --name "Lake District" \
 *     --description "Fells and valleys around Windermere." \
 *     --bbox=-3.55,54.20,-2.70,54.75 --maxzoom=14 --tag maps-2026.09
 *
 * Cutting is also how the size question gets answered: run it at two or three maxzooms with
 * `--no-catalogue` and the printed sizes are the measurement, rather than a guess.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import type { MapBounds } from '../src/maps/bounds';
import {
  assertRegionsCatalogue,
  parseRegionsCatalogue,
  REGIONS_SCHEMA_VERSION,
  upsertPack,
  type RegionPack,
  type RegionsCatalogue,
} from '../src/maps/regions';
import { UK_OVERVIEW_SOURCE } from '../src/maps/sources';

const DEFAULT_CATALOGUE = 'assets/maps/regions.json';
const DEFAULT_OUT = 'packs';
const DEFAULT_REPOSITORY = 'jonnyhaynes/field-kit';
const DEFAULT_LICENCE = {
  id: 'ODbL-1.0',
  attribution: '© OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org/copyright',
};

const USAGE = `Usage: npm run build:pack -- --region <id> --name <name> --description <text>
                              --bbox <w,s,e,n> --maxzoom <n> --tag <release-tag> [options]

  --region <id>         Lowercase letters, digits and dashes; also the file name (required)
  --name <name>         Shown in the app (required)
  --description <text>  Shown under the name (required)
  --bbox <w,s,e,n>      The box to cut (required)
  --maxzoom <n>         Deepest zoom to include (required). 14 is about street level
  --tag <tag>           The release the pack will be published under (required)
  --minzoom <n>         Shallowest zoom to include (default 0)
  --source <url|path>   Archive to cut from (default ${UK_OVERVIEW_SOURCE.archive})
  --out <dir>           Where to write the .pmtiles (default ${DEFAULT_OUT}/)
  --catalogue <path>    Catalogue to update (default ${DEFAULT_CATALOGUE})
  --build <id>          Protomaps build, if not the one already recorded
  --repo <owner/name>   Repository the release lives in (default ${DEFAULT_REPOSITORY})
  --no-catalogue        Cut and print the size; leave the catalogue alone
`;

function parseBounds(raw: string): MapBounds {
  const parts = raw.split(',').map((value) => Number(value.trim()));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    throw new Error(`--bbox must be four numbers, w,s,e,n — received ${raw}`);
  }

  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = parts as [
    number,
    number,
    number,
    number,
  ];

  if (minLongitude >= maxLongitude || minLatitude >= maxLatitude) {
    throw new Error(`--bbox is inside out — received ${raw}`);
  }

  return { minLongitude, minLatitude, maxLongitude, maxLatitude };
}

function positiveInteger(raw: string, flag: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 16) {
    throw new Error(`${flag} must be a whole number between 0 and 16, received ${raw}`);
  }
  return value;
}

function main(): number {
  const { values } = parseArgs({
    options: {
      region: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      bbox: { type: 'string' },
      maxzoom: { type: 'string' },
      minzoom: { type: 'string' },
      source: { type: 'string' },
      out: { type: 'string' },
      catalogue: { type: 'string' },
      build: { type: 'string' },
      tag: { type: 'string' },
      repo: { type: 'string' },
      'no-catalogue': { type: 'boolean' },
    },
  });

  const region = values.region;
  const name = values.name;
  const description = values.description;
  const bbox = values.bbox;
  const maxzoom = values.maxzoom;
  const tag = values.tag;

  if (!region || !name || !description || !bbox || !maxzoom || !tag) {
    console.error(USAGE);
    return 2;
  }

  if (!/^[a-z0-9-]+$/.test(region)) {
    // The id becomes the file name on disk, and MapLibre gets that name in a URL: an accent or a
    // space would be escaped into a path that does not exist, and the map would go blank.
    throw new Error(`--region must be lowercase letters, digits and dashes, received ${region}`);
  }

  const bounds = parseBounds(bbox);
  const deepest = positiveInteger(maxzoom, '--maxzoom');
  const shallowest = values.minzoom ? positiveInteger(values.minzoom, '--minzoom') : 0;

  const source = values.source ?? UK_OVERVIEW_SOURCE.archive;
  const outDirectory = resolve(values.out ?? DEFAULT_OUT);
  const outPath = resolve(outDirectory, `${region}.pmtiles`);

  mkdirSync(outDirectory, { recursive: true });

  console.log(`Cutting ${region} from ${source}`);
  execFileSync(
    'pmtiles',
    ['extract', source, outPath, `--bbox=${bbox}`, `--maxzoom=${String(deepest)}`],
    { stdio: 'inherit' },
  );

  const bytes = statSync(outPath).size;
  if (bytes === 0) throw new Error(`pmtiles wrote an empty archive at ${outPath}`);

  const contents = readFileSync(outPath);
  const pack: RegionPack = {
    id: region,
    name,
    description,
    bounds,
    minZoom: shallowest,
    maxZoom: deepest,
    bytes,
    md5: createHash('md5').update(contents).digest('hex'),
    sha256: createHash('sha256').update(contents).digest('hex'),
    url: `https://github.com/${values.repo ?? DEFAULT_REPOSITORY}/releases/download/${tag}/${region}.pmtiles`,
    builtAt: new Date().toISOString(),
    source: {
      build: values.build ?? UK_OVERVIEW_SOURCE.build,
      archive: source,
      command: `pmtiles extract ${source} ${region}.pmtiles --bbox=${bbox} --maxzoom=${deepest}`,
    },
    licence: DEFAULT_LICENCE,
  };

  console.log(`Wrote ${outPath}`);
  console.log(`  ${bytes} bytes (${(bytes / 1_000_000).toFixed(1)} MB), maxzoom ${deepest}`);
  console.log(`  md5    ${pack.md5}`);
  console.log(`  sha256 ${pack.sha256}`);

  if (values['no-catalogue']) {
    console.log('Catalogue left alone (--no-catalogue).');
    return 0;
  }

  const cataloguePath = resolve(values.catalogue ?? DEFAULT_CATALOGUE);
  const existing = parseRegionsCatalogue(
    JSON.parse(readFileSync(cataloguePath, 'utf8')) as unknown,
  );
  const build = values.build ?? (existing.build === '' ? UK_OVERVIEW_SOURCE.build : existing.build);
  const catalogue: RegionsCatalogue = {
    ...upsertPack(existing, pack),
    schemaVersion: REGIONS_SCHEMA_VERSION,
    build,
  };

  // Throws rather than writing a catalogue the app cannot use — an empty one, or a pack whose build
  // does not match the archive it is drawn over.
  assertRegionsCatalogue(catalogue);

  writeFileSync(cataloguePath, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`Catalogue ${cataloguePath} — ${catalogue.packs.length} pack(s), build ${build}`);

  console.log(
    [
      '',
      'Publish it with:',
      `  gh release create ${tag} ${outPath} --title "Map data ${tag}" \\`,
      `    --notes "Region packs cut from Protomaps build ${build}. © OpenStreetMap contributors, ODbL. Includes ${region}."`,
    ].join('\n'),
  );

  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exitCode = 1;
}

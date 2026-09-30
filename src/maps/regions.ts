/**
 * The region packs: what exists, how big it is, and which one applies where.
 *
 * Pure, and the catalogue is data — `assets/maps/regions.json`, committed and shipped inside the
 * app. It is **validated rather than trusted**: a pack nobody can verify is worse than no pack,
 * because the failure shows up as a blank map on a hill rather than as a build error.
 *
 * Nothing here downloads anything. The catalogue says what is *available*; `pack-download.ts` is
 * what puts one on disk, and `pack-store.ts` is what remembers that it did.
 */

import type { Coordinates } from '@/aed';

import {
  boundsArea,
  boundsContain,
  boundsWithin,
  UK_OVERVIEW_BOUNDS,
  type MapBounds,
} from './bounds';

export const REGIONS_SCHEMA_VERSION = 1;

/**
 * Reserved on top of a pack's own size before one may be downloaded.
 *
 * A download that exactly fills the device leaves nothing for the operating system, and the pack
 * that caused it becomes the first thing evicted.
 *
 * Decimal, like every size the app writes and every size in the catalogue: describing the reserve as
 * "20 MB" on screen and then testing against 20 MiB would be a quiet lie of 5%.
 */
export const REGION_PACK_HEADROOM_BYTES = 20_000_000;

export type RegionPack = {
  /** ASCII, and the file name on disk: see `packFileName`. */
  id: string;
  name: string;
  description: string;
  /** A rectangle, cut from a bbox — the same caveat the bundled overview carries. */
  bounds: MapBounds;
  minZoom: number;
  maxZoom: number;
  bytes: number;
  /** Of the file as published. Checked on the device with `File.md5`, which is native. */
  md5: string;
  /** Also of the published file, for anyone reproducing the download outside the app. */
  sha256: string;
  /** The release asset. Always remote, always `https` — and never part of the map style. */
  url: string;
  builtAt: string;
  source: {
    /** The Protomaps build it was cut from. Must match the bundled overview's. */
    build: string;
    archive: string;
    command: string;
  };
  licence: {
    id: string;
    attribution: string;
    url: string;
  };
};

export type RegionsCatalogue = {
  schemaVersion: number;
  /** The Protomaps build every pack was cut from. */
  build: string;
  packs: RegionPack[];
};

function isBounds(value: unknown): value is MapBounds {
  if (value === null || typeof value !== 'object') return false;

  const bounds = value as Partial<MapBounds>;
  return (
    Number.isFinite(bounds.minLongitude) &&
    Number.isFinite(bounds.minLatitude) &&
    Number.isFinite(bounds.maxLongitude) &&
    Number.isFinite(bounds.maxLatitude) &&
    (bounds.minLongitude as number) <= (bounds.maxLongitude as number) &&
    (bounds.minLatitude as number) <= (bounds.maxLatitude as number)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isRegionPack(value: unknown): value is RegionPack {
  if (value === null || typeof value !== 'object') return false;

  const pack = value as Partial<RegionPack>;
  const source = pack.source as Partial<RegionPack['source']> | undefined;
  const licence = pack.licence as Partial<RegionPack['licence']> | undefined;

  return (
    isNonEmptyString(pack.id) &&
    isNonEmptyString(pack.name) &&
    typeof pack.description === 'string' &&
    isBounds(pack.bounds) &&
    Number.isFinite(pack.minZoom) &&
    Number.isFinite(pack.maxZoom) &&
    (pack.minZoom as number) <= (pack.maxZoom as number) &&
    Number.isFinite(pack.bytes) &&
    (pack.bytes as number) > 0 &&
    isNonEmptyString(pack.md5) &&
    isNonEmptyString(pack.sha256) &&
    // A pack's bytes are fetched, so they are remote by definition. Requiring the scheme here also
    // keeps the "no remote URL in the built style" test meaningful: the two never mix.
    typeof pack.url === 'string' &&
    pack.url.startsWith('https://') &&
    isNonEmptyString(pack.builtAt) &&
    source !== undefined &&
    isNonEmptyString(source.build) &&
    isNonEmptyString(source.archive) &&
    isNonEmptyString(source.command) &&
    licence !== undefined &&
    isNonEmptyString(licence.id) &&
    isNonEmptyString(licence.attribution) &&
    isNonEmptyString(licence.url)
  );
}

/**
 * Unreadable catalogue data becomes an empty catalogue rather than an exception — the same rule the
 * report store, the flag store and the notes queue follow. The screen then says it has no packs,
 * which is true, instead of taking down the map it is reached from.
 */
export function parseRegionsCatalogue(raw: unknown): RegionsCatalogue {
  const empty: RegionsCatalogue = { schemaVersion: REGIONS_SCHEMA_VERSION, build: '', packs: [] };
  if (raw === null || typeof raw !== 'object') return empty;

  const candidate = raw as Partial<RegionsCatalogue>;
  if (candidate.schemaVersion !== REGIONS_SCHEMA_VERSION) return empty;

  return {
    schemaVersion: REGIONS_SCHEMA_VERSION,
    build: isNonEmptyString(candidate.build) ? candidate.build : '',
    packs: Array.isArray(candidate.packs) ? candidate.packs.filter(isRegionPack) : [],
  };
}

export class RegionsCatalogueError extends Error {
  constructor(problems: readonly string[]) {
    super(`region pack catalogue is unusable:\n  - ${problems.join('\n  - ')}`);
    this.name = 'RegionsCatalogueError';
  }
}

/**
 * What is wrong with a catalogue, if anything.
 *
 * Separate from the throw so the build script can report every problem at once rather than one per
 * run. An empty catalogue is a problem rather than a legitimate state: it would ship a screen that
 * offers nothing and cannot be told apart from a corrupt file.
 */
export function regionsCatalogueProblems(catalogue: RegionsCatalogue): string[] {
  const problems: string[] = [];

  if (catalogue.schemaVersion !== REGIONS_SCHEMA_VERSION) {
    problems.push(
      `schemaVersion is ${catalogue.schemaVersion}, expected ${REGIONS_SCHEMA_VERSION}`,
    );
  }

  if (catalogue.build.trim() === '') {
    problems.push('build is missing — every pack must record the Protomaps build it came from');
  }

  if (catalogue.packs.length === 0) {
    problems.push('no packs — refusing a catalogue that offers nothing');
  }

  const seen = new Set<string>();
  for (const pack of catalogue.packs) {
    if (seen.has(pack.id)) problems.push(`duplicate pack id ${pack.id}`);
    seen.add(pack.id);

    if (catalogue.build !== '' && pack.source.build !== catalogue.build) {
      // A pack cut from another build references `source-layer` names the style does not have, so it
      // draws nothing — which on a device is indistinguishable from a download that failed.
      problems.push(
        `${pack.id} was cut from build ${pack.source.build}, but the catalogue says ${catalogue.build}`,
      );
    }

    if (!boundsWithin(pack.bounds, UK_OVERVIEW_BOUNDS)) {
      // With a pack drawn over the overview, an area outside the overview has no base map under it —
      // so a pack there would be an island of map in a blank screen.
      problems.push(`${pack.id} lies outside the bundled overview`);
    }

    if (pack.minZoom > pack.maxZoom) {
      problems.push(`${pack.id} has minZoom above maxZoom`);
    }
  }

  return problems;
}

export function assertRegionsCatalogue(catalogue: RegionsCatalogue): void {
  const problems = regionsCatalogueProblems(catalogue);
  if (problems.length > 0) throw new RegionsCatalogueError(problems);
}

/**
 * Adds a pack, or replaces the one with the same id.
 *
 * Sorted by id, so re-running the cutter for one region gives a one-entry diff rather than a new
 * entry appended at the end every time.
 */
export function upsertPack(catalogue: RegionsCatalogue, pack: RegionPack): RegionsCatalogue {
  return {
    ...catalogue,
    packs: [...catalogue.packs.filter((entry) => entry.id !== pack.id), pack].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  };
}

export function packContains(pack: RegionPack, coordinates: Coordinates): boolean {
  return boundsContain(pack.bounds, coordinates);
}

/**
 * The pack that should supply detail at a position, if any.
 *
 * Smallest box wins, so a small pack for a valley beats a large one for the county that also
 * contains it. Two packs stacked would draw the same features twice, slightly offset.
 */
export function selectPack(
  coordinates: Coordinates,
  packs: readonly RegionPack[],
): RegionPack | undefined {
  return packs
    .filter((pack) => packContains(pack, coordinates))
    .sort((left, right) => boundsArea(left.bounds) - boundsArea(right.bounds))[0];
}

/** Whether a pack of this size may be downloaded with this much space free. */
export function hasSpaceForPack(
  availableBytes: number,
  pack: RegionPack,
  headroomBytes: number = REGION_PACK_HEADROOM_BYTES,
): boolean {
  return availableBytes >= pack.bytes + headroomBytes;
}

/**
 * Bytes as the screen writes them — the same units the plan of record uses for the archive sizes
 * (decimal, not binary): "959 kB", "1.3 MB", "6.4 MB".
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1_000) return `${Math.round(bytes)} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} kB`;
  // Free space on a real device runs to tens of gigabytes, and "19354.1 MB" is not a number anyone
  // reads at a glance.
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;

  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}

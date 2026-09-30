import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import {
  assertRegionsCatalogue,
  formatBytes,
  hasSpaceForPack,
  packContains,
  parseRegionsCatalogue,
  regionsCatalogueProblems,
  REGIONS_SCHEMA_VERSION,
  selectPack,
  upsertPack,
  type RegionPack,
  type RegionsCatalogue,
} from '../regions';
import { UK_OVERVIEW_SOURCE } from '../sources';

function pack(overrides: Partial<RegionPack> = {}): RegionPack {
  return {
    id: 'lake-district',
    name: 'Lake District',
    description: 'Fells and valleys around Windermere, Keswick and Wasdale.',
    bounds: { minLongitude: -3.55, minLatitude: 54.2, maxLongitude: -2.7, maxLatitude: 54.75 },
    minZoom: 0,
    maxZoom: 14,
    bytes: 12_000_000,
    md5: 'a'.repeat(32),
    sha256: 'b'.repeat(64),
    url: 'https://github.com/jonnyhaynes/field-kit/releases/download/maps-2026.10/lake-district.pmtiles',
    builtAt: '2026-10-01',
    source: {
      build: '20260929',
      archive: 'https://build.protomaps.com/20260929.pmtiles',
      command: 'pmtiles extract …',
    },
    licence: {
      id: 'ODbL-1.0',
      attribution: '© OpenStreetMap contributors',
      url: 'https://www.openstreetmap.org/copyright',
    },
    ...overrides,
  };
}

function catalogue(packs: RegionPack[], build = '20260929'): RegionsCatalogue {
  return { schemaVersion: REGIONS_SCHEMA_VERSION, build, packs };
}

const AMBLESIDE = { latitude: 54.4287, longitude: -2.9613 };
const LONDON = { latitude: 51.5074, longitude: -0.1278 };

describe('reading a catalogue', () => {
  it('accepts a well-formed one', () => {
    const parsed = parseRegionsCatalogue(
      JSON.parse(JSON.stringify(catalogue([pack()]))) as unknown,
    );

    expect(parsed.build).toBe('20260929');
    expect(parsed.packs).toHaveLength(1);
    expect(parsed.packs[0]?.id).toBe('lake-district');
  });

  it.each([
    ['null', null],
    ['a string', 'not a catalogue'],
    ['an array', []],
    ['the wrong schema version', { schemaVersion: 99, build: '20260929', packs: [pack()] }],
  ])('returns an empty catalogue for %s', (_label, raw) => {
    expect(parseRegionsCatalogue(raw).packs).toEqual([]);
  });

  it('drops the unusable entries rather than the whole file', () => {
    const parsed = parseRegionsCatalogue({
      schemaVersion: REGIONS_SCHEMA_VERSION,
      build: '20260929',
      packs: [
        pack(),
        pack({ id: 'no-hash', md5: '' }),
        pack({ id: 'plain-http', url: 'http://example.com/pack.pmtiles' }),
        pack({
          id: 'backwards-bounds',
          bounds: { minLongitude: 1, minLatitude: 1, maxLongitude: 0, maxLatitude: 0 },
        }),
        pack({ id: 'no-licence', licence: { id: '', attribution: '', url: '' } }),
      ],
    });

    expect(parsed.packs.map((entry) => entry.id)).toEqual(['lake-district']);
  });
});

describe('what makes a catalogue unusable', () => {
  it('is happy with a real one', () => {
    expect(regionsCatalogueProblems(catalogue([pack()]))).toEqual([]);
  });

  it('refuses one that offers nothing', () => {
    // A screen offering no packs is indistinguishable from a corrupt file, so it is a defect
    // rather than a legitimate state.
    expect(regionsCatalogueProblems(catalogue([]))).toContain(
      'no packs — refusing a catalogue that offers nothing',
    );
  });

  it('refuses one with no build recorded', () => {
    const problems = regionsCatalogueProblems(catalogue([pack()], ''));
    expect(problems.join('\n')).toMatch(/build is missing/);
  });

  it('refuses duplicate ids', () => {
    const problems = regionsCatalogueProblems(catalogue([pack(), pack()]));
    expect(problems.join('\n')).toMatch(/duplicate pack id lake-district/);
  });

  it('refuses a pack outside the bundled overview', () => {
    // An area the overview does not cover would have no base map under the pack — an island of
    // map on a blank screen.
    const paris = pack({
      id: 'paris',
      bounds: { minLongitude: 2.2, minLatitude: 48.8, maxLongitude: 2.5, maxLatitude: 48.95 },
    });

    expect(regionsCatalogueProblems(catalogue([paris])).join('\n')).toMatch(/paris lies outside/);
  });

  it('refuses a pack whose zoom range is backwards', () => {
    const problems = regionsCatalogueProblems(catalogue([pack({ minZoom: 14, maxZoom: 8 })]));
    expect(problems.join('\n')).toMatch(/minZoom above maxZoom/);
  });

  it('refuses a pack cut from a different build', () => {
    // It would reference source-layer names the style does not have and draw nothing at all.
    const foreign = pack({
      id: 'older',
      source: {
        build: '20260101',
        archive: 'https://build.protomaps.com/20260101.pmtiles',
        command: '…',
      },
    });

    expect(regionsCatalogueProblems(catalogue([foreign])).join('\n')).toMatch(
      /older was cut from build 20260101, but the catalogue says 20260929/,
    );
  });

  it('throws with every problem, not just the first', () => {
    expect(() => assertRegionsCatalogue(catalogue([], ''))).toThrow(
      /build is missing[\s\S]*no packs/,
    );
  });
});

describe('which pack applies where', () => {
  it('claims a position inside its box', () => {
    expect(packContains(pack(), AMBLESIDE)).toBe(true);
  });

  it('does not claim one outside it', () => {
    expect(packContains(pack(), LONDON)).toBe(false);
  });

  it('picks the smallest pack when two contain the position', () => {
    const county = pack({
      id: 'cumbria',
      bounds: { minLongitude: -3.6, minLatitude: 54.0, maxLongitude: -2.5, maxLatitude: 55.0 },
    });
    const valley = pack({
      id: 'great-langdale',
      bounds: { minLongitude: -3.2, minLatitude: 54.4, maxLongitude: -2.9, maxLatitude: 54.55 },
    });

    expect(selectPack(AMBLESIDE, [county, valley])?.id).toBe('great-langdale');
    expect(selectPack(AMBLESIDE, [valley, county])?.id).toBe('great-langdale');
  });

  it('returns nothing when no pack covers the position', () => {
    expect(selectPack(LONDON, [pack()])).toBeUndefined();
  });

  it('returns nothing when there are no packs', () => {
    expect(selectPack(AMBLESIDE, [])).toBeUndefined();
  });
});

describe('whether a pack fits', () => {
  it('needs the pack plus headroom, not merely the pack', () => {
    const size = pack().bytes;

    expect(hasSpaceForPack(size + 20_000_000, pack())).toBe(true);
    expect(hasSpaceForPack(size + 20_000_000 - 1, pack())).toBe(false);
    expect(hasSpaceForPack(size, pack())).toBe(false);
  });

  it('takes the headroom as a parameter, so the rule is not buried', () => {
    expect(hasSpaceForPack(pack().bytes, pack(), 0)).toBe(true);
  });
});

describe('writing a size', () => {
  it.each([
    [0, '0 B'],
    [999, '999 B'],
    [1_000, '1 kB'],
    [959_000, '959 kB'],
    [1_300_000, '1.3 MB'],
    [6_400_000, '6.4 MB'],
    [22_400_000, '22.4 MB'],
    [19_354_100_000, '19.4 GB'],
  ])('writes %i as %s', (bytes, written) => {
    // Decimal, matching how the plan of record reports the archive sizes.
    expect(formatBytes(bytes)).toBe(written);
  });

  it.each([[-1], [Number.NaN]])('refuses to invent a size for %s', (bytes) => {
    expect(formatBytes(bytes)).toBe('—');
  });
});

/**
 * The file that actually ships, read from disk.
 *
 * The builder in the tests above proves the rules; this proves the artefact obeys them — the same
 * reason `assets.test.ts` reads the sprites rather than trusting the copy that put them there.
 */
describe('the catalogue that ships', () => {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'assets/maps/regions.json'), 'utf8'),
  ) as unknown;
  const catalogue = parseRegionsCatalogue(raw);

  it('is usable, and offers something', () => {
    expect(regionsCatalogueProblems(catalogue)).toEqual([]);
    expect(catalogue.packs.length).toBeGreaterThan(0);
  });

  it('was cut from the same Protomaps build as the archive it overlays', () => {
    // A pack from another build references `source-layer` names the style does not have, so it draws
    // nothing — which on a device is indistinguishable from a download that failed.
    expect(catalogue.build).toBe(UK_OVERVIEW_SOURCE.build);
    for (const pack of catalogue.packs) {
      expect(pack.source.build).toBe(UK_OVERVIEW_SOURCE.build);
    }
  });

  it('points at a release asset, not at anything in this repository', () => {
    for (const pack of catalogue.packs) {
      expect(pack.url).toMatch(/^https:\/\/github\.com\/.+\/releases\/download\/.+\/.+\.pmtiles$/);
    }
  });

  it('records where each pack came from and what it is licensed under', () => {
    for (const pack of catalogue.packs) {
      expect(pack.source.command).toContain('pmtiles extract');
      expect(pack.licence.id).toBe('ODbL-1.0');
      expect(pack.licence.attribution).toContain('OpenStreetMap');
    }
  });

  it('names its file the way the pack will be stored on disk', () => {
    // The on-device name is derived from the id, so an id with a space or an accent would be
    // escaped into a path that does not exist.
    for (const pack of catalogue.packs) {
      expect(pack.id).toMatch(/^[a-z0-9-]+$/);
      expect(pack.url.endsWith(`${pack.id}.pmtiles`)).toBe(true);
    }
  });
});

describe('recording a cut pack in the catalogue', () => {
  it('adds one', () => {
    expect(upsertPack(catalogue([]), pack()).packs.map((entry) => entry.id)).toEqual([
      'lake-district',
    ]);
  });

  it('replaces the pack with the same id rather than duplicating it', () => {
    const updated = upsertPack(catalogue([pack()]), pack({ name: 'Renamed' }));

    expect(updated.packs).toHaveLength(1);
    expect(updated.packs[0]?.name).toBe('Renamed');
  });

  it('keeps the list sorted, so re-cutting one region diffs as one entry', () => {
    const updated = upsertPack(
      catalogue([pack({ id: 'snowdonia' })]),
      pack({ id: 'lake-district' }),
    );

    expect(updated.packs.map((entry) => entry.id)).toEqual(['lake-district', 'snowdonia']);
  });

  it('leaves the schema version and the build alone', () => {
    const updated = upsertPack(catalogue([], '20260929'), pack());

    expect(updated.schemaVersion).toBe(REGIONS_SCHEMA_VERSION);
    expect(updated.build).toBe('20260929');
  });
});

import { describe, expect, it } from '@jest/globals';

import type { RegionPack } from '@/maps/regions';

import { canMapRegions, regionStorageProblem, type RegionStorageProbe } from '../can-map-regions';

function pack(overrides: Partial<RegionPack> = {}): RegionPack {
  return {
    id: 'lake-district',
    name: 'Lake District',
    description: 'Fells and valleys.',
    bounds: { minLongitude: -3.55, minLatitude: 54.2, maxLongitude: -2.7, maxLatitude: 54.75 },
    minZoom: 0,
    maxZoom: 14,
    bytes: 12_000_000,
    md5: 'a'.repeat(32),
    sha256: 'b'.repeat(64),
    url: 'https://example.com/pack.pmtiles',
    builtAt: '2026-10-01',
    source: {
      build: '20260929',
      archive: 'https://build.protomaps.com/20260929.pmtiles',
      command: '…',
    },
    licence: {
      id: 'ODbL-1.0',
      attribution: '© OpenStreetMap contributors',
      url: 'https://example.com',
    },
    ...overrides,
  };
}

function storage({ writable = true, availableBytes = 1_000_000_000 } = {}): RegionStorageProbe {
  return {
    prepare: async () => writable,
    availableBytes: () => availableBytes,
  };
}

describe('why packs cannot be used here', () => {
  it('says there are none, when the catalogue is empty', () => {
    expect(regionStorageProblem(1_000_000_000, [])).toBe('no-packs');
  });

  it('says there is no room when the smallest pack will not fit with headroom', () => {
    expect(regionStorageProblem(12_000_000, [pack()])).toBe('no-space');
  });

  it('is happy when there is room', () => {
    expect(regionStorageProblem(12_000_000 + 20_000_000, [pack()])).toBeUndefined();
  });

  it('measures against the smallest pack, not the largest', () => {
    // The smallest is the one most likely to fit, so it is the honest test of "can this device
    // store a pack at all" rather than "can it store the biggest one we have".
    const small = pack({ id: 'small', bytes: 5_000_000 });
    const large = pack({ id: 'large', bytes: 90_000_000 });

    expect(regionStorageProblem(25_000_000, [large, small])).toBeUndefined();
    expect(regionStorageProblem(25_000_000, [large])).toBe('no-space');
  });
});

describe('the capability probe', () => {
  it('is false when the directory cannot be written', async () => {
    await expect(canMapRegions([pack()], storage({ writable: false }))).resolves.toBe(false);
  });

  it('is false when the device is full', async () => {
    await expect(canMapRegions([pack()], storage({ availableBytes: 1_000 }))).resolves.toBe(false);
  });

  it('is false when there is nothing to download', async () => {
    await expect(canMapRegions([], storage())).resolves.toBe(false);
  });

  it('is true when there is a pack and room for it', async () => {
    await expect(canMapRegions([pack()], storage())).resolves.toBe(true);
  });
});

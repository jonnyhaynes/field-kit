import { describe, expect, it } from '@jest/globals';

import {
  mapAssetUrls,
  packArchiveUrl,
  packFileName,
  PACKS_DIRECTORY,
  PMTILES_FILE_NAME,
} from '../urls';

const ROOT = 'file:///var/mobile/Containers/Data/Application/ABC-123/Documents/maps';

describe('mapAssetUrls', () => {
  it('wraps the local archive in the pmtiles scheme over file', () => {
    expect(mapAssetUrls(ROOT, 'light').pmtiles).toBe(`pmtiles://${ROOT}/${PMTILES_FILE_NAME}`);
  });

  it('builds the glyph template the style will substitute into', () => {
    expect(mapAssetUrls(ROOT, 'light').glyphs).toBe(`${ROOT}/glyphs/{fontstack}/{range}.pbf`);
  });

  it('points the sprite at the flavour matching the scheme', () => {
    expect(mapAssetUrls(ROOT, 'light').sprite).toBe(`${ROOT}/sprites/light/sprite`);
    expect(mapAssetUrls(ROOT, 'dark').sprite).toBe(`${ROOT}/sprites/dark/sprite`);
  });

  it('tolerates a trailing slash rather than producing a double slash', () => {
    expect(mapAssetUrls(`${ROOT}/`, 'light')).toEqual(mapAssetUrls(ROOT, 'light'));
  });

  it('never produces a remote URL', () => {
    const urls = mapAssetUrls(ROOT, 'light');
    for (const value of Object.values(urls)) {
      expect(value).not.toMatch(/https?:\/\//);
    }
  });
});

describe('packArchiveUrl', () => {
  it('puts a pack in its own subdirectory, under the same scheme', () => {
    expect(packArchiveUrl(ROOT, 'lake-district')).toBe(
      `pmtiles://${ROOT}/${PACKS_DIRECTORY}/lake-district.pmtiles`,
    );
  });

  it('names the file after the pack id', () => {
    expect(packFileName('lake-district')).toBe('lake-district.pmtiles');
  });

  it('tolerates a trailing slash rather than producing a double slash', () => {
    expect(packArchiveUrl(`${ROOT}/`, 'lake-district')).toBe(packArchiveUrl(ROOT, 'lake-district'));
  });

  it('never produces a remote URL', () => {
    // The pack's download URL is remote by definition; where MapLibre *reads* it from is not.
    // Confusing the two would make the map depend on the network, which is the one thing it cannot.
    expect(packArchiveUrl(ROOT, 'lake-district')).not.toMatch(/https?:\/\//);
  });

  it('keeps the file name ASCII, because escaped characters have crashed the map', () => {
    for (const character of packFileName('lake-district')) {
      expect(character.charCodeAt(0)).toBeLessThan(128);
    }
  });
});

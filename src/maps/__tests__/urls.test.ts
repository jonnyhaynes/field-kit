import { describe, expect, it } from '@jest/globals';

import { mapAssetUrls, PMTILES_FILE_NAME } from '../urls';

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

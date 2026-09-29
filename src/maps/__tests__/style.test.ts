import { describe, expect, it } from '@jest/globals';

import { buildMapStyle, MAP_ATTRIBUTION } from '../style';
import { mapAssetUrls } from '../urls';

const urls = mapAssetUrls('file:///data/maps', 'light');
const style = () => buildMapStyle({ urls, scheme: 'light' });
const asJson = (value: unknown) => JSON.stringify(value);

describe('buildMapStyle', () => {
  it('is a version 8 style with the Protomaps layers', () => {
    const built = style();
    expect(built.version).toBe(8);
    expect(built.layers.length).toBeGreaterThan(50);
  });

  it('sources tiles from the local archive, never the network', () => {
    expect(style().sources.protomaps).toMatchObject({
      type: 'vector',
      url: urls.pmtiles,
    });
  });

  it('loads glyphs and sprites from disk', () => {
    const built = style();
    expect(built.glyphs).toBe('file:///data/maps/glyphs/{fontstack}/{range}.pbf');
    expect(built.sprite).toBe('file:///data/maps/sprites/light/sprite');
    expect(asJson(built.glyphs)).not.toMatch(/https?:/);
    expect(asJson(built.sprite)).not.toMatch(/https?:/);
  });

  /**
   * The bug this test exists for: font stacks also appear nested inside `text-field`
   * `format` expressions, where each span names its own font. Renaming only
   * `layout['text-font']` leaves those reaching for protomaps.github.io.
   */
  it('renames font stacks everywhere, including inside text-field format spans', () => {
    expect(asJson(style().layers)).not.toMatch(/"Noto /);
  });

  it('uses only local, space-free stack names, and does use them', () => {
    const used = [...new Set(asJson(style().layers).match(/"noto-sans-[a-z]+"/g) ?? [])];
    expect(used.length).toBeGreaterThan(0);
    expect(used.sort()).toEqual([
      '"noto-sans-italic"',
      '"noto-sans-medium"',
      '"noto-sans-regular"',
    ]);
  });

  it('carries the attribution the licence requires', () => {
    const source = style().sources.protomaps as { attribution?: string };
    expect(source.attribution).toBe(MAP_ATTRIBUTION);
    expect(source.attribution).toContain('OpenStreetMap');
    expect(source.attribution).toContain('Protomaps');
  });

  it('uses the dark flavour when the scheme is dark', () => {
    const dark = buildMapStyle({ urls: mapAssetUrls('file:///data/maps', 'dark'), scheme: 'dark' });
    expect(dark.sprite).toBe('file:///data/maps/sprites/dark/sprite');
    expect(asJson(dark.layers)).not.toBe(asJson(style().layers));
  });
});

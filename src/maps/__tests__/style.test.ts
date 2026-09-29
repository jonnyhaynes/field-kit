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

/**
 * Glyphs for every script a label might use would cost megabytes, so labels are narrowed to
 * Latin instead. Without this the style asks MapLibre for Cyrillic, Georgian, CJK and emoji
 * ranges that are not on disk — an error per range, and a label that cannot draw.
 */
describe('label policy', () => {
  type AnyLayer = { id: string; type?: string; layout?: Record<string, unknown> };

  const symbolLayers = () => style().layers as unknown as AnyLayer[];

  const nameFields = (): unknown[][] =>
    symbolLayers()
      .map((layer) => layer.layout?.['text-field'])
      .filter((field): field is unknown[] => Array.isArray(field));

  it('drops the POI layer, whose names are arbitrary user content', () => {
    expect(symbolLayers().map((layer) => layer.id)).not.toContain('pois');
  });

  it('keeps labels: places, roads and water still carry text', () => {
    const withText = symbolLayers()
      .filter((layer) => layer.layout?.['text-field'] !== undefined)
      .map((layer) => layer.id);
    expect(withText).toEqual(
      expect.arrayContaining(['places_locality', 'roads_labels_major', 'water_label_ocean']),
    );
  });

  it('leaves no Protomaps multiline-name expression anywhere', () => {
    const heads = nameFields().map((field) => field[0]);
    expect(heads).not.toContain('case');
    expect(heads).not.toContain('format');
  });

  it('narrows the name labels to English-then-local', () => {
    const latin = JSON.stringify(['coalesce', ['get', 'name:en'], ['get', 'name']]);
    const narrowed = nameFields().filter((field) => JSON.stringify(field) === latin);
    expect(narrowed.length).toBeGreaterThan(0);

    // Every array-valued text-field is either this, or a ref/house number — never a script chain.
    const untouched = nameFields().filter((field) => field[0] !== 'coalesce');
    for (const field of untouched) {
      expect(['get', 'step']).toContain(field[0]);
    }
  });

  it('leaves fields that are not names alone', () => {
    const byId = Object.fromEntries(symbolLayers().map((layer) => [layer.id, layer]));

    // A house number and a road number are not names and must not be rewritten.
    expect(byId.address_label.layout?.['text-field']).toEqual(['get', 'addr_housenumber']);
    expect(byId.roads_shields.layout?.['text-field']).toEqual(['get', 'shield_text']);
  });
});

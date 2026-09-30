import { describe, expect, it } from '@jest/globals';

import { buildMapStyle, DETAIL_LAYER_PREFIX, DETAIL_SOURCE, MAP_ATTRIBUTION } from '../style';
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

/**
 * A pack is drawn *over* the overview, never instead of it.
 *
 * Replacing the source is the obvious implementation and the wrong one: pan outside the pack's
 * bounding box and there are no tiles at all, which is the blank rectangle Phase 2d already fixed
 * once. So the overview stays, the pack joins it, and the layer order has to be rearranged —
 * pack geometry above the overview's so detail wins, but below the labels so a park polygon does
 * not paint over a town name.
 */
describe('an installed region pack', () => {
  type AnyLayer = { id: string; type?: string; source?: string; layout?: Record<string, unknown> };

  const PACK_URL = 'pmtiles:///data/maps/packs/lake-district.pmtiles';
  const packed = () => buildMapStyle({ urls, scheme: 'light', packUrl: PACK_URL });
  const layers = () => packed().layers as unknown as AnyLayer[];
  const packLayers = () => layers().filter((layer) => layer.source === DETAIL_SOURCE);
  const symbolIds = () =>
    layers()
      .filter((layer) => layer.type === 'symbol')
      .map((l) => l.id);

  it('keeps the overview and adds a second source beside it', () => {
    expect(packed().sources.protomaps).toMatchObject({ type: 'vector', url: urls.pmtiles });

    const detail = (packed().sources as Record<string, { url?: string; attribution?: string }>)[
      DETAIL_SOURCE
    ];
    expect(detail?.url).toBe(PACK_URL);
    expect(detail?.attribution).toBe(MAP_ATTRIBUTION);
  });

  it('adds nothing at all when there is no pack', () => {
    const plain = style();
    expect((plain.sources as Record<string, unknown>)[DETAIL_SOURCE]).toBeUndefined();

    for (const layer of plain.layers as unknown as AnyLayer[]) {
      expect(layer.id.startsWith(DETAIL_LAYER_PREFIX)).toBe(false);
      // A background layer has no source of its own; everything else reads the overview.
      expect(layer.source === undefined || layer.source === 'protomaps').toBe(true);
    }
  });

  it('draws pack layers above the overview geometry and below every label', () => {
    const ids = layers().map((layer) => layer.id);
    const packPositions = packLayers().map((layer) => ids.indexOf(layer.id));

    expect(packPositions.length).toBeGreaterThan(10);
    expect(Math.max(...packPositions)).toBeLessThan(
      Math.min(...symbolIds().map((id) => ids.indexOf(id))),
    );
  });

  it('supplies geometry only, never a symbol', () => {
    // Two sources each drawing names would draw every name twice, a pixel or two apart. The cost of
    // dropping them is that a pack adds detail rather than more names.
    for (const layer of packLayers()) {
      expect(layer.type).not.toBe('symbol');
      expect(layer.layout?.['text-field']).toBeUndefined();
    }
  });

  it('gives every layer a unique id, and prefixes the pack layers', () => {
    const ids = layers().map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const id of ids.filter((id) => id.startsWith(DETAIL_LAYER_PREFIX))) {
      expect(id.slice(DETAIL_LAYER_PREFIX.length)).not.toBe('');
    }
  });

  it('still contains no remote URL anywhere it would fetch from', () => {
    // The attribution is an HTML link and does contain `https://` — that is text in a control, not
    // something MapLibre fetches. What must never be remote is where tiles come from.
    const sources = packed().sources as Record<string, { url?: string }>;
    for (const source of Object.values(sources)) {
      expect(source.url ?? '').not.toMatch(/https?:\/\//);
    }

    expect(JSON.stringify(packed().layers)).not.toMatch(/https?:\/\//);
  });
});

/**
 * The map style, built locally.
 *
 * Two things make this more than a constant. The layers come from Protomaps' own package, so
 * the `source-layer` names match the archive exactly rather than being guessed at; and every
 * remote URL they would otherwise reach for — glyphs, sprites — is rewritten to point at the
 * copy on disk, because a style that fetches anything is not an offline style.
 *
 * Font stacks are renamed to local, space-free directory names. MapLibre substitutes
 * `{fontstack}` into the glyph URL, and a stack called `Noto Sans Regular` would become
 * `Noto%20Sans%20Regular` in a filesystem path, which does not exist on disk.
 */

import { layers, namedFlavor } from '@protomaps/basemaps';
import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-react-native';

import type { MapAssetUrls } from './urls';

/** The archive carries this too, but the style is the one that has to show it. */
export const MAP_ATTRIBUTION =
  '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>';

/** Protomaps' stack names to the directories the glyphs are laid out in. */
const LOCAL_FONT_STACKS: Record<string, string> = {
  'Noto Sans Regular': 'noto-sans-regular',
  'Noto Sans Medium': 'noto-sans-medium',
  'Noto Sans Italic': 'noto-sans-italic',
  // Deliberately not bundled: only Latin ranges ship, and UK names rendered in English do not
  // use it. Pointing it at the Latin stack means a non-Latin span fails soft instead of
  // requesting a glyph file that is not on disk.
  'Noto Sans Devanagari Regular v1': 'noto-sans-regular',
};

export type MapStyleOptions = {
  urls: MapAssetUrls;
  scheme: 'light' | 'dark';
  language?: string;
  /**
   * An installed region pack, as a local `pmtiles://` URL.
   *
   * A pack is drawn **over** the overview rather than replacing it — see `buildMapStyle`. It is
   * always a local file: the style must contain no remote URL, and the pack's download URL is a
   * different thing that never reaches here.
   */
  packUrl?: string;
};

/** The second source, added only when a pack is in play. */
export const DETAIL_SOURCE = 'detail';

/** Pack layer ids are prefixed so they cannot collide with the overview's — MapLibre requires unique ids. */
export const DETAIL_LAYER_PREFIX = 'detail-';

/**
 * Labels are Latin-only, on purpose.
 *
 * Protomaps' name expression falls back to a feature's local `name` and appends secondary
 * script lines, so a UK extract drags in Cyrillic, Georgian, CJK and emoji — mostly from POI
 * names. MapLibre requests the glyph range for every script it meets, and this app ships
 * Latin glyphs only, so each one is both an error in the log and a label that cannot draw.
 * Bundling the rest of Unicode to render a handful of shop names would cost megabytes.
 *
 * So `text-field` is narrowed to English-then-local, and the POI layer is dropped: a cafe's
 * name, emoji and all, is not what an orientation map is for. A `name` that is itself
 * non-Latin can still slip through; that is a missing glyph in one label, not a broken map.
 */
const LATIN_LABEL_FIELD = ['coalesce', ['get', 'name:en'], ['get', 'name']];

/** The layers whose text is a place or feature name, rather than a ref or a house number. */
function isNameField(textField: unknown): boolean {
  return Array.isArray(textField) && (textField[0] === 'case' || textField[0] === 'format');
}

/**
 * `LayerSpecification` is a union whose `layout` only exposes `text-field` on symbol layers,
 * so the layer is viewed loosely here rather than fought with.
 */
type LooseLayer = { id: string; type?: string; layout?: Record<string, unknown> };

function withLatinLabels(layer: LayerSpecification): LayerSpecification | undefined {
  const loose = layer as LooseLayer;
  if (loose.id === 'pois') return undefined;

  const textField = loose.layout?.['text-field'];
  if (!isNameField(textField)) return layer;

  return {
    ...loose,
    layout: { ...loose.layout, 'text-field': LATIN_LABEL_FIELD },
  } as unknown as LayerSpecification;
}

/**
 * Renames font stacks wherever they appear.
 *
 * The whole layer is walked, not just `layout['text-font']`: a `text-field` may be a `format`
 * expression in which each span carries its own `text-font`, and rewriting only the top level
 * leaves those pointing at the remote glyph server.
 */
function localiseFontStacks<T>(node: T): T {
  if (typeof node === 'string') {
    return (LOCAL_FONT_STACKS[node] ?? node) as T;
  }
  if (Array.isArray(node)) {
    return node.map((entry) => localiseFontStacks(entry)) as T;
  }
  if (node !== null && typeof node === 'object') {
    const rewritten: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      rewritten[key] = localiseFontStacks(value);
    }
    return rewritten as T;
  }
  return node;
}

/**
 * A pack is drawn **over** the overview, never instead of it.
 *
 * Replacing the source would be simpler, and wrong: pan outside the pack's bounding box and there
 * are no tiles at all — a blank rectangle, which is the failure Phase 2d already fixed once and
 * §2.3 promises never to show. It also could not be worked around with a loading state, because the
 * blank area is wherever the user panned to.
 *
 * Two things follow, and both are deliberate.
 *
 * **Layer order.** Pack geometry has to sit above the overview's so that detail wins where the pack
 * covers — and *below* the labels, or a park polygon would paint over a town's name. So the layers
 * are regrouped as geometry, pack geometry, symbols.
 *
 * **Packs supply geometry only.** Every symbol layer — text and icons alike — comes from the
 * overview. Two sources each drawing names would draw every name twice, a pixel or two apart. The
 * cost is real and worth stating: a pack adds detail, not more names.
 */
function packDetailLayers(base: readonly LayerSpecification[]): LayerSpecification[] {
  return base
    .filter((layer) => (layer as LooseLayer).type !== 'symbol')
    .map((layer) => ({
      ...layer,
      id: `${DETAIL_LAYER_PREFIX}${layer.id}`,
      source: DETAIL_SOURCE,
    }));
}

function isSymbolLayer(layer: LayerSpecification): boolean {
  return (layer as LooseLayer).type === 'symbol';
}

export function buildMapStyle({
  urls,
  scheme,
  language = 'en',
  packUrl,
}: MapStyleOptions): StyleSpecification {
  const base = layers('protomaps', namedFlavor(scheme), { lang: language });

  const prepared = base
    .map((layer) => localiseFontStacks(layer) as LayerSpecification)
    .map(withLatinLabels)
    .filter((layer): layer is LayerSpecification => layer !== undefined);

  const detail = packUrl ? packDetailLayers(prepared) : [];

  // Without a pack the order is left exactly as Protomaps' own package has it, so nothing about the
  // bundled map changes; the regrouping is only needed to make room for a second source.
  const ordered =
    detail.length === 0
      ? prepared
      : [
          ...prepared.filter((layer) => !isSymbolLayer(layer)),
          ...detail,
          ...prepared.filter(isSymbolLayer),
        ];

  return {
    version: 8,
    glyphs: urls.glyphs,
    sprite: urls.sprite,
    sources: {
      protomaps: {
        type: 'vector',
        url: urls.pmtiles,
        attribution: MAP_ATTRIBUTION,
      },
      ...(packUrl
        ? { [DETAIL_SOURCE]: { type: 'vector', url: packUrl, attribution: MAP_ATTRIBUTION } }
        : {}),
    },
    layers: ordered,
  } as StyleSpecification;
}

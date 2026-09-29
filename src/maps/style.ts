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
};

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

export function buildMapStyle({
  urls,
  scheme,
  language = 'en',
}: MapStyleOptions): StyleSpecification {
  const base = layers('protomaps', namedFlavor(scheme), { lang: language });

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
    },
    layers: base.map((layer) => localiseFontStacks(layer) as LayerSpecification),
  } as StyleSpecification;
}

/**
 * Where the style should look for the map data once it is on disk.
 *
 * Pure, and separated out because the URL conventions are the fiddly part: MapLibre Native
 * wants a `pmtiles://` scheme wrapped around a real `file://` path, and `expo-file-system`
 * URIs already carry that `file://`. Getting the joining wrong is a silent blank map, so the
 * exact strings are pinned by tests rather than assembled inline on the screen.
 */

export type MapAssetUrls = {
  /** The PMTiles archive, as MapLibre's `pmtiles://` scheme over a local file. */
  pmtiles: string;
  /** Glyph template: `<dir>/{fontstack}/{range}.pbf`. */
  glyphs: string;
  /** Sprite base, without extension — MapLibre adds `.json`, `.png` and `@2x.png`. */
  sprite: string;
};

/** The file name inside the map directory. Kept ASCII: escaped characters have crashed the map. */
export const PMTILES_FILE_NAME = 'uk-overview.pmtiles';

/**
 * @param rootUri Absolute `file://` URI of the directory holding the map assets, with no
 * trailing slash.
 * @param scheme Which sprite flavour to use — the style needs the matching one.
 */
export function mapAssetUrls(rootUri: string, scheme: 'light' | 'dark'): MapAssetUrls {
  const base = rootUri.replace(/\/+$/, '');

  return {
    pmtiles: `pmtiles://${base}/${PMTILES_FILE_NAME}`,
    glyphs: `${base}/glyphs/{fontstack}/{range}.pbf`,
    sprite: `${base}/sprites/${scheme}/sprite`,
  };
}

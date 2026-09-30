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

/** Downloaded packs live in a subdirectory of the same map directory, for the same reasons. */
export const PACKS_DIRECTORY = 'packs';

/**
 * The file name a pack takes on disk once it is installed.
 *
 * Kept ASCII for the same reason as the overview's: an id with an accent or a space would be
 * escaped into a path that does not exist, and the map would go blank with nothing in the log.
 */
export function packFileName(packId: string): string {
  return `${packId}.pmtiles`;
}

/**
 * Where MapLibre should look for an installed pack.
 *
 * A `file://` path wrapped in `pmtiles://`, exactly as the overview is. The pack's *download* URL is
 * a different thing entirely and never appears here — the style must contain no remote URL at all,
 * or it is not an offline style.
 */
export function packArchiveUrl(rootUri: string, packId: string): string {
  const base = rootUri.replace(/\/+$/, '');

  return `pmtiles://${base}/${PACKS_DIRECTORY}/${packFileName(packId)}`;
}

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

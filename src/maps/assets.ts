/**
 * Getting the bundled map assets to somewhere MapLibre Native can read them.
 *
 * Metro hands us asset *ids*; the native map needs real `file://` paths, and the style needs
 * a *directory* layout (glyphs are looked up as `<dir>/{fontstack}/{range}.pbf`). So the
 * files are laid down once, in that layout, in the app's document directory.
 *
 * Copy-once, not every launch: the marker file is named after the asset version, so an
 * unchanged version is left alone and a new one replaces it. Laying down ~7 MB on every cold
 * start would be a poor trade for a map.
 *
 * Failure is surfaced, never swallowed — the screen says the map could not be prepared rather
 * than showing a blank one (§4.1 rule 4).
 */

import { Asset } from 'expo-asset';
import { Directory, File } from 'expo-file-system';
import { useEffect, useState } from 'react';

import overviewArchive from '../../assets/maps/uk-overview.pmtiles';
import glyphItalic0 from '../../assets/maps/glyphs/noto-sans-italic/0-255.pbf';
import glyphItalic256 from '../../assets/maps/glyphs/noto-sans-italic/256-511.pbf';
import glyphMedium0 from '../../assets/maps/glyphs/noto-sans-medium/0-255.pbf';
import glyphMedium256 from '../../assets/maps/glyphs/noto-sans-medium/256-511.pbf';
import glyphRegular0 from '../../assets/maps/glyphs/noto-sans-regular/0-255.pbf';
import glyphRegular256 from '../../assets/maps/glyphs/noto-sans-regular/256-511.pbf';
import spriteDark2x from '../../assets/maps/sprites/dark/sprite-2x.png';
import spriteDark2xJson from '../../assets/maps/sprites/dark/sprite-2x.json';
import spriteDarkPng from '../../assets/maps/sprites/dark/sprite.png';
import spriteDark from '../../assets/maps/sprites/dark/sprite.json';
import spriteLight2x from '../../assets/maps/sprites/light/sprite-2x.png';
import spriteLight2xJson from '../../assets/maps/sprites/light/sprite-2x.json';
import spriteLightPng from '../../assets/maps/sprites/light/sprite.png';
import spriteLight from '../../assets/maps/sprites/light/sprite.json';
import { mapsRoot } from './paths';
import { mapAssetUrls, type MapAssetUrls } from './urls';

/**
 * Bump whenever the asset set changes: the marker below is named after this, so a new value
 * re-lays the files and an unchanged one is left alone.
 *
 * `.1` because the first cut shipped only `sprite.json`. On a high-DPI device MapLibre asks
 * for `sprite@2x.json` and `sprite@2x.png` instead, and a missing descriptor fails the sprite
 * load — which fails the style, which is a blank map.
 */
const ASSET_VERSION = '2026-09-29.1';

/**
 * Where each bundled file belongs on disk, relative to the map directory.
 *
 * The 2x sprites are stored in the repo without the `@2x` suffix because Metro reserves that
 * suffix for its own asset-scale resolution and refuses to import a file named that way. The
 * destination keeps the name MapLibre actually asks for.
 */
const BUNDLED_ASSETS: Record<string, number> = {
  'uk-overview.pmtiles': overviewArchive,
  'glyphs/noto-sans-regular/0-255.pbf': glyphRegular0,
  'glyphs/noto-sans-regular/256-511.pbf': glyphRegular256,
  'glyphs/noto-sans-medium/0-255.pbf': glyphMedium0,
  'glyphs/noto-sans-medium/256-511.pbf': glyphMedium256,
  'glyphs/noto-sans-italic/0-255.pbf': glyphItalic0,
  'glyphs/noto-sans-italic/256-511.pbf': glyphItalic256,
  'sprites/light/sprite.png': spriteLightPng,
  'sprites/light/sprite@2x.png': spriteLight2x,
  'sprites/dark/sprite.png': spriteDarkPng,
  'sprites/dark/sprite@2x.png': spriteDark2x,
};

/**
 * The sprite descriptors are the one asset that cannot be bundled as files: Metro treats
 * `.json` as source, so they arrive already parsed and are written back out as text.
 *
 * Both densities are needed. A high-DPI device requests the `@2x` pair and a missing
 * descriptor is a hard failure, not a fallback.
 */
const SPRITE_DESCRIPTORS: Record<'light' | 'dark', { base: unknown; retina: unknown }> = {
  light: { base: spriteLight, retina: spriteLight2xJson },
  dark: { base: spriteDark, retina: spriteDark2xJson },
};

export type MapAssetsState =
  | { status: 'preparing' }
  | { status: 'ready'; urls: MapAssetUrls; rootUri: string }
  | { status: 'failed'; reason: string };

function fileIn(root: Directory, path: string): File {
  return new File(root, ...path.split('/'));
}

function ensureParent(file: File): void {
  const parent = file.parentDirectory;
  if (!parent.exists) parent.create({ intermediates: true });
}

function writeDescriptor(file: File, descriptor: unknown): void {
  ensureParent(file);
  if (!file.exists) file.create({ intermediates: true });
  file.write(JSON.stringify(descriptor));
}

async function layDownAssets(root: Directory): Promise<void> {
  for (const [path, module] of Object.entries(BUNDLED_ASSETS)) {
    const destination = fileIn(root, path);
    if (destination.exists) continue;

    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error(`bundled map asset ${path} has no local file`);

    ensureParent(destination);
    await new File(asset.localUri).copy(destination);
  }

  for (const flavour of ['light', 'dark'] as const) {
    const { base, retina } = SPRITE_DESCRIPTORS[flavour];
    writeDescriptor(fileIn(root, `sprites/${flavour}/sprite.json`), base);
    writeDescriptor(fileIn(root, `sprites/${flavour}/sprite@2x.json`), retina);
  }
}

let prepared: Promise<Directory> | undefined;

function prepare(): Promise<Directory> {
  prepared ??= (async () => {
    const root = mapsRoot();
    if (!root.exists) root.create({ intermediates: true });

    const marker = fileIn(root, `assets-${ASSET_VERSION}.marker`);
    if (!marker.exists) {
      await layDownAssets(root);
      // Written last, so a half-finished copy is never mistaken for a complete one.
      marker.create({ intermediates: true });
    }

    return root;
  })();

  return prepared;
}

/** Resolves the asset URLs, laying the files down on first use. */
export function useMapAssets(scheme: 'light' | 'dark'): MapAssetsState {
  const [state, setState] = useState<MapAssetsState>({ status: 'preparing' });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const root = await prepare();
        if (!cancelled) {
          setState({ status: 'ready', urls: mapAssetUrls(root.uri, scheme), rootUri: root.uri });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'failed',
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scheme]);

  return state;
}

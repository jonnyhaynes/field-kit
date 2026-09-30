/**
 * Where map data lives on disk.
 *
 * One definition, because two things have to agree about it and cannot be allowed to drift: the
 * bundled assets are laid down by `assets.ts`, and downloaded packs are written by
 * `pack-download.ts`. They share a directory deliberately — a pack is map data, and it belongs
 * beside the archive it overlays rather than in a second place with its own rules.
 */

import { Directory, Paths } from 'expo-file-system';

import { PACKS_DIRECTORY } from './urls';

export function mapsRoot(): Directory {
  return new Directory(Paths.document, 'maps');
}

export function packsDirectory(): Directory {
  return new Directory(mapsRoot(), PACKS_DIRECTORY);
}

/** The `file://` URI of the map directory, for building archive URLs. */
export function mapsRootUri(): string {
  return mapsRoot().uri;
}

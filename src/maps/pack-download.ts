/**
 * Putting a pack on disk, and taking it off again.
 *
 * The rules are here and the file operations are injected, so every one of them — verify before
 * accepting, discard a partial file, never leave a broken pack named as a good one — is unit-tested
 * without a device or a network. That is the same seam `notes/submit.ts` and
 * `whatsapp`-style resolvers use: the device proves the honest states, the tests prove the success.
 *
 * The one rule worth stating twice: **a download is not a pack until its md5 matches**. The API
 * documents that a failed download on Android can leave bytes at the destination, and a truncated
 * archive is not a smaller map — it is a map that fails somewhere out on a hill.
 */

import { File } from 'expo-file-system';

import { packsDirectory } from './paths';
import type { InstalledPack, PackStore } from './pack-store';
import type { RegionPack } from './regions';
import { packFileName } from './urls';

export type PackProgress = { bytesWritten: number; totalBytes: number };

/** The file operations an install needs. Injected so the rules above are testable. */
export type PackFileStore = {
  /** Creates the packs directory if it is missing, and returns its URI. */
  ensureDirectory(): Promise<string>;
  download(
    url: string,
    temporaryUri: string,
    onProgress: (progress: PackProgress) => void,
    signal: AbortSignal,
  ): Promise<void>;
  exists(uri: string): boolean;
  /** Length in bytes; 0 when the file is not there. */
  bytes(uri: string): number;
  md5(uri: string): string | null;
  move(fromUri: string, toUri: string): Promise<void>;
  remove(uri: string): void;
};

export type InstallFailure = 'cancelled' | 'no-connection' | 'unavailable' | 'damaged' | 'failed';

/**
 * Does a rejected download look like "that file is not there" rather than "the network failed"?
 *
 * `File.downloadFileAsync` reports a non-2xx response only as an error whose *message* carries the
 * status code, so this is a reading of a string rather than of a response. It is worth doing anyway:
 * a pack that was never published would otherwise be reported to the user as their own connection
 * being at fault, and they would go on checking it.
 */
function looksLikeMissingAsset(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const status = /\b([45]\d\d)\b/.exec(message)?.[1];

  return status !== undefined && status.startsWith('4');
}

export type InstallOutcome =
  { ok: true; installed: InstalledPack } | { ok: false; reason: InstallFailure };

export type PackInstaller = {
  install(
    pack: RegionPack,
    options?: { onProgress?: (progress: PackProgress) => void; signal?: AbortSignal },
  ): Promise<InstallOutcome>;
  /**
   * Cheap enough to call while drawing the map: existence and length, no hashing. Hashing a 25 MB
   * file on every load to decide which archive to point at would be a bad trade.
   */
  isPresent(pack: RegionPack): Promise<boolean>;
  /** The deliberate version: reads the whole file and compares its md5. */
  check(pack: RegionPack): Promise<boolean>;
  remove(packId: string): Promise<void>;
  archiveUri(packId: string): Promise<string>;
};

export function createPackInstaller({
  files,
  store,
  now = () => new Date().toISOString(),
}: {
  files: PackFileStore;
  store: PackStore;
  /** Injected so an install's timestamp is a fact in tests rather than a moving target. */
  now?: () => string;
}): PackInstaller {
  let directory: Promise<string> | undefined;

  function packsDirectoryUri(): Promise<string> {
    directory ??= files.ensureDirectory().catch((error: unknown) => {
      // Do not cache a rejection: the next attempt should be allowed to try again.
      directory = undefined;
      throw error;
    });

    return directory;
  }

  async function archiveUri(packId: string): Promise<string> {
    return `${await packsDirectoryUri()}/${packFileName(packId)}`;
  }

  async function install(
    pack: RegionPack,
    options: { onProgress?: (progress: PackProgress) => void; signal?: AbortSignal } = {},
  ): Promise<InstallOutcome> {
    const signal = options.signal ?? new AbortController().signal;

    let base: string;
    try {
      base = await packsDirectoryUri();
    } catch {
      return { ok: false, reason: 'failed' };
    }

    const temporary = `${base}/${pack.id}.part`;
    const destination = `${base}/${packFileName(pack.id)}`;

    // A leftover from an interrupted attempt would otherwise be mistaken for a finished download.
    files.remove(temporary);

    try {
      await files.download(pack.url, temporary, options.onProgress ?? (() => {}), signal);
    } catch (error) {
      files.remove(temporary);

      if (signal.aborted) return { ok: false, reason: 'cancelled' };
      // Anything else without a 4xx in it is indistinguishable from being offline from here — the
      // same reading the OSM note sender and the what3words resolver take.
      return { ok: false, reason: looksLikeMissingAsset(error) ? 'unavailable' : 'no-connection' };
    }

    if (files.md5(temporary) !== pack.md5) {
      files.remove(temporary);
      return { ok: false, reason: 'damaged' };
    }

    try {
      files.remove(destination);
      await files.move(temporary, destination);
    } catch {
      files.remove(temporary);
      return { ok: false, reason: 'failed' };
    }

    const installed: InstalledPack = {
      id: pack.id,
      md5: pack.md5,
      bytes: pack.bytes,
      installedAt: now(),
    };
    await store.record(installed);

    return { ok: true, installed };
  }

  return {
    install,
    archiveUri,

    async isPresent(pack) {
      const uri = await archiveUri(pack.id);
      return files.exists(uri) && files.bytes(uri) === pack.bytes;
    },

    async check(pack) {
      const uri = await archiveUri(pack.id);
      return files.exists(uri) && files.md5(uri) === pack.md5;
    },

    async remove(packId) {
      files.remove(await archiveUri(packId));
      await store.forget(packId);
    },
  };
}

/**
 * The real file operations.
 *
 * Downloads to the packs directory under a `.part` name rather than into the cache: the rename that
 * follows is then a rename inside one directory instead of a move between volumes, and the cache is
 * somewhere the system may empty under us mid-download.
 */
export function createDevicePackFiles(): PackFileStore {
  return {
    async ensureDirectory() {
      const directory = packsDirectory();
      if (!directory.exists) directory.create({ intermediates: true });
      return directory.uri;
    },

    async download(url, temporaryUri, onProgress, signal) {
      await File.downloadFileAsync(url, new File(temporaryUri), {
        // Overwrite rather than reject: a previous attempt may have left the name behind.
        idempotent: true,
        onProgress,
        signal,
      });
    },

    exists: (uri) => new File(uri).exists,
    bytes: (uri) => new File(uri).size,
    md5: (uri) => new File(uri).md5,

    async move(fromUri, toUri) {
      await new File(fromUri).move(new File(toUri));
    },

    remove(uri) {
      const file = new File(uri);
      if (file.exists) file.delete();
    },
  };
}

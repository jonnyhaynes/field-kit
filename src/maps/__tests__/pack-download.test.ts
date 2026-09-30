import { describe, expect, it } from '@jest/globals';

import type { KeyValueStore } from '@/aed';

import { createPackInstaller, type PackFileStore } from '../pack-download';
import { createPackStore, INSTALLED_PACKS_KEY } from '../pack-store';
import type { RegionPack } from '../regions';

const DIRECTORY = 'file:///maps/packs';
const PART = `${DIRECTORY}/lake-district.part`;
const FINAL = `${DIRECTORY}/lake-district.pmtiles`;
const NOW = '2026-10-01T09:00:00.000Z';

const PACK: RegionPack = {
  id: 'lake-district',
  name: 'Lake District',
  description: 'Fells and valleys.',
  bounds: { minLongitude: -3.55, minLatitude: 54.2, maxLongitude: -2.7, maxLatitude: 54.75 },
  minZoom: 0,
  maxZoom: 14,
  bytes: 12_000_000,
  md5: 'a'.repeat(32),
  sha256: 'b'.repeat(64),
  url: 'https://example.com/lake-district.pmtiles',
  builtAt: '2026-10-01',
  source: {
    build: '20260929',
    archive: 'https://build.protomaps.com/20260929.pmtiles',
    command: '…',
  },
  licence: {
    id: 'ODbL-1.0',
    attribution: '© OpenStreetMap contributors',
    url: 'https://example.com',
  },
};

function fakeFiles({
  digest = PACK.md5,
  bytes,
  downloadFails = false,
  downloadMessage = 'the request never completed',
  ensureFails = false,
  startingPart = false,
}: {
  digest?: string;
  bytes?: number;
  downloadFails?: boolean;
  /** What the download rejects with: the real one carries an HTTP status in its message. */
  downloadMessage?: string;
  ensureFails?: boolean;
  startingPart?: boolean;
} = {}) {
  const files = new Map<string, { bytes: number; md5: string | null }>();
  const calls: string[] = [];
  let digestReads = 0;

  if (startingPart) files.set(PART, { bytes: 4_000_000, md5: 'stale' });

  const store: PackFileStore = {
    async ensureDirectory() {
      calls.push('ensureDirectory');
      if (ensureFails) throw new Error('cannot write the packs directory');
      return DIRECTORY;
    },

    async download(url, temporaryUri, onProgress, signal) {
      calls.push(`download ${url}`);
      if (downloadFails) throw new Error(downloadMessage);
      if (signal.aborted) throw new Error('aborted');
      onProgress({ bytesWritten: 1, totalBytes: 2 });
      files.set(temporaryUri, { bytes: bytes ?? PACK.bytes, md5: digest });
    },

    exists: (uri) => files.has(uri),
    bytes: (uri) => files.get(uri)?.bytes ?? 0,

    md5: (uri) => {
      digestReads += 1;
      return files.get(uri)?.md5 ?? null;
    },

    async move(from, to) {
      const entry = files.get(from);
      if (!entry) throw new Error('nothing to move');
      files.delete(from);
      files.set(to, entry);
    },

    remove(uri) {
      files.delete(uri);
    },
  };

  return { store, files, calls, digestReads: () => digestReads };
}

function fakeKv(): KeyValueStore & { contents: Record<string, string> } {
  const contents: Record<string, string> = {};
  return {
    contents,
    getItem: async (key: string) => contents[key] ?? null,
    setItem: async (key: string, value: string) => {
      contents[key] = value;
    },
  };
}

function setUp(options: Parameters<typeof fakeFiles>[0] = {}) {
  const files = fakeFiles(options);
  const kv = fakeKv();
  const store = createPackStore(kv);
  const installer = createPackInstaller({ files: files.store, store, now: () => NOW });

  return { ...files, kv, store, installer };
}

describe('installing a pack', () => {
  it('accepts a download whose hash matches, and only then records it', async () => {
    const { installer, files, kv } = setUp();

    await expect(installer.install(PACK)).resolves.toEqual({
      ok: true,
      installed: { id: PACK.id, md5: PACK.md5, bytes: PACK.bytes, installedAt: NOW },
    });

    expect(files.has(FINAL)).toBe(true);
    expect(files.has(PART)).toBe(false);
    expect(JSON.parse(kv.contents[INSTALLED_PACKS_KEY] ?? '[]')).toHaveLength(1);
  });

  it('reports progress while it downloads', async () => {
    const { installer } = setUp();
    const seen: number[] = [];

    await installer.install(PACK, { onProgress: (progress) => seen.push(progress.bytesWritten) });

    expect(seen).toEqual([1]);
  });

  it('discards a file whose hash does not match, and records nothing', async () => {
    const { installer, files, kv } = setUp({ digest: 'c'.repeat(32) });

    await expect(installer.install(PACK)).resolves.toEqual({ ok: false, reason: 'damaged' });

    expect(files.has(PART)).toBe(false);
    expect(files.has(FINAL)).toBe(false);
    expect(kv.contents[INSTALLED_PACKS_KEY]).toBeUndefined();
  });

  it('trusts the hash rather than the length, so a corrupted file of the right size is still refused', async () => {
    const { installer, files } = setUp({ digest: 'c'.repeat(32), bytes: PACK.bytes });

    await expect(installer.install(PACK)).resolves.toEqual({ ok: false, reason: 'damaged' });
    expect(files.size).toBe(0);
  });

  it('refuses a truncated file — the case the API documents on Android', async () => {
    const { installer, files } = setUp({ digest: 'd'.repeat(32), bytes: 4_000_000 });

    await expect(installer.install(PACK)).resolves.toEqual({ ok: false, reason: 'damaged' });
    expect(files.size).toBe(0);
  });

  it('clears a leftover partial file before starting', async () => {
    // Otherwise the `idempotent` overwrite would be the only thing standing between an interrupted
    // attempt and a pack that looks installed.
    const { installer, files, calls } = setUp({ startingPart: true });

    await installer.install(PACK);

    expect(calls).toContain(`download ${PACK.url}`);
    expect(files.has(PART)).toBe(false);
  });

  it('calls a failed download offline, and leaves nothing behind', async () => {
    const { installer, files, kv } = setUp({ downloadFails: true });

    await expect(installer.install(PACK)).resolves.toEqual({ ok: false, reason: 'no-connection' });

    expect(files.size).toBe(0);
    expect(kv.contents[INSTALLED_PACKS_KEY]).toBeUndefined();
  });

  it('tells a missing pack apart from a bad connection', async () => {
    // The download API reports a non-2xx response only in the error's message. Saying "check your
    // connection" for a pack that was never published sends someone to check the wrong thing.
    const { installer, files } = setUp({
      downloadFails: true,
      downloadMessage: 'UnableToDownload: unable to download file with status 404',
    });

    await expect(installer.install(PACK)).resolves.toEqual({ ok: false, reason: 'unavailable' });
    expect(files.size).toBe(0);
  });

  it('treats a server-side error as a failure to try again, not as a missing pack', async () => {
    const { installer } = setUp({
      downloadFails: true,
      downloadMessage: 'UnableToDownload: unable to download file with status 503',
    });

    await expect(installer.install(PACK)).resolves.toEqual({ ok: false, reason: 'no-connection' });
  });

  it('reports a cancelled download as cancelled, not as a failure', async () => {
    const { installer, files } = setUp();
    const controller = new AbortController();
    controller.abort();

    await expect(installer.install(PACK, { signal: controller.signal })).resolves.toEqual({
      ok: false,
      reason: 'cancelled',
    });
    expect(files.size).toBe(0);
  });

  it('fails cleanly when the packs directory cannot be written', async () => {
    const { installer, calls } = setUp({ ensureFails: true });

    await expect(installer.install(PACK)).resolves.toEqual({ ok: false, reason: 'failed' });

    // And does not remember the failure: a device that is briefly full should be able to try again.
    await installer.install(PACK);
    expect(calls.filter((call) => call === 'ensureDirectory')).toHaveLength(2);
  });
});

describe('what is already installed', () => {
  it('is present when the file exists at the expected length', async () => {
    const { installer } = setUp();
    await installer.install(PACK);

    await expect(installer.isPresent(PACK)).resolves.toBe(true);
  });

  it('is not present when the file is the wrong length', async () => {
    const { installer, files } = setUp();
    await installer.install(PACK);
    files.set(FINAL, { bytes: PACK.bytes - 1, md5: PACK.md5 });

    await expect(installer.isPresent(PACK)).resolves.toBe(false);
  });

  it('does not hash the archive to answer that', async () => {
    // This runs while drawing the map; reading 25 MB to choose a source would be the wrong trade.
    const { installer, digestReads } = setUp();
    await installer.install(PACK);
    const before = digestReads();

    await installer.isPresent(PACK);

    expect(digestReads()).toBe(before);
  });

  it('passes the check when the hash matches, and fails it when it does not', async () => {
    const good = setUp();
    await good.installer.install(PACK);
    await expect(good.installer.check(PACK)).resolves.toBe(true);

    const damaged = setUp();
    await damaged.installer.install(PACK);
    damaged.files.set(FINAL, { bytes: PACK.bytes, md5: 'e'.repeat(32) });
    await expect(damaged.installer.check(PACK)).resolves.toBe(false);
  });

  it('is not present at all before anything is installed', async () => {
    const { installer } = setUp();
    await expect(installer.isPresent(PACK)).resolves.toBe(false);
  });
});

describe('removing a pack', () => {
  it('deletes the file and the record', async () => {
    const { installer, files, kv } = setUp();
    await installer.install(PACK);

    await installer.remove(PACK.id);

    expect(files.has(FINAL)).toBe(false);
    expect(JSON.parse(kv.contents[INSTALLED_PACKS_KEY] ?? '[]')).toEqual([]);
  });

  it('can be run twice without complaint', async () => {
    const { installer } = setUp();
    await installer.install(PACK);

    await installer.remove(PACK.id);
    await expect(installer.remove(PACK.id)).resolves.toBeUndefined();
  });
});

describe('where a pack lives', () => {
  it('is the packs directory, named after the pack', async () => {
    const { installer } = setUp();
    await expect(installer.archiveUri('lake-district')).resolves.toBe(FINAL);
  });
});

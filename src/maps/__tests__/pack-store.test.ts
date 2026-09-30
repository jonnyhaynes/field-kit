import { describe, expect, it } from '@jest/globals';

import type { KeyValueStore } from '@/aed';

import {
  createPackStore,
  INSTALLED_PACKS_KEY,
  parseInstalledPacks,
  type InstalledPack,
} from '../pack-store';

function fakeStore(initial: Record<string, string> = {}): KeyValueStore & {
  contents: Record<string, string>;
} {
  const contents = { ...initial };
  return {
    contents,
    getItem: async (key: string) => contents[key] ?? null,
    setItem: async (key: string, value: string) => {
      contents[key] = value;
    },
  };
}

const RECORD: InstalledPack = {
  id: 'lake-district',
  md5: 'a'.repeat(32),
  bytes: 12_000_000,
  installedAt: '2026-10-01T09:00:00.000Z',
};

describe('the installed-pack record', () => {
  it('is empty in a fresh install', async () => {
    await expect(createPackStore(fakeStore()).load()).resolves.toEqual([]);
  });

  it('records a pack and reads it back', async () => {
    const store = createPackStore(fakeStore());

    await expect(store.record(RECORD)).resolves.toEqual([RECORD]);
    await expect(store.load()).resolves.toEqual([RECORD]);
  });

  it('replaces a record for the same pack rather than duplicating it', async () => {
    const store = createPackStore(fakeStore());
    await store.record(RECORD);
    const after = await store.record({ ...RECORD, md5: 'c'.repeat(32) });

    expect(after).toHaveLength(1);
    expect(after[0]?.md5).toBe('c'.repeat(32));
  });

  it('forgets one, and keeps the others', async () => {
    const store = createPackStore(fakeStore());
    await store.record(RECORD);
    await store.record({ ...RECORD, id: 'snowdonia' });

    await expect(store.forget('lake-district')).resolves.toEqual([{ ...RECORD, id: 'snowdonia' }]);
  });

  it('forgetting a pack that is not there changes nothing', async () => {
    const store = createPackStore(fakeStore());
    await store.record(RECORD);

    await expect(store.forget('nope')).resolves.toEqual([RECORD]);
  });

  it.each([
    ['null', null],
    ['an empty string', ''],
    ['nothing parseable', 'not json'],
    ['valid JSON that is not an array', '{"a":1}'],
  ])('reads %s as no packs at all', (_label, raw) => {
    // Corrupt local state must not take down the map screen it is reached from.
    expect(parseInstalledPacks(raw)).toEqual([]);
  });

  it('drops an unusable record and keeps a good one', () => {
    const raw = JSON.stringify([
      RECORD,
      { id: 'no-hash', bytes: 10, installedAt: '2026-10-01' },
      { id: 'zero-bytes', md5: 'd'.repeat(32), bytes: 0, installedAt: '2026-10-01' },
      { md5: 'e'.repeat(32), bytes: 10, installedAt: '2026-10-01' },
    ]);

    expect(parseInstalledPacks(raw).map((entry) => entry.id)).toEqual(['lake-district']);
  });

  it('writes under its own key, so it cannot collide with the flags or the reports', async () => {
    const store = fakeStore();
    await createPackStore(store).record(RECORD);

    expect(Object.keys(store.contents)).toEqual([INSTALLED_PACKS_KEY]);
    expect(INSTALLED_PACKS_KEY).toBe('field-kit/maps/packs');
  });
});

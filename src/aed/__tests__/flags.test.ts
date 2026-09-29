import { describe, expect, it } from '@jest/globals';

import {
  AED_FLAGS_KEY,
  createAedFlagStore,
  parseFlaggedIds,
  serialiseFlaggedIds,
  type KeyValueStore,
} from '../flags';

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

describe('parseFlaggedIds', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['nothing parseable', 'not json'],
    ['valid JSON that is not an array', '{"a":1}'],
    ['a bare number', '42'],
  ])('returns an empty set for %s', (_label, raw) => {
    expect(parseFlaggedIds(raw)).toEqual(new Set());
  });

  it('reads back the ids it wrote', () => {
    expect(parseFlaggedIds('[3,1,2]')).toEqual(new Set([1, 2, 3]));
  });

  it('keeps only integers, so a corrupt file cannot smuggle in nonsense ids', () => {
    expect(parseFlaggedIds('[1,"2",null,2.5,3,true]')).toEqual(new Set([1, 3]));
  });
});

describe('serialiseFlaggedIds', () => {
  it('writes a stable, sorted array', () => {
    expect(serialiseFlaggedIds(new Set([3, 1, 2]))).toBe('[1,2,3]');
  });

  it('round-trips', () => {
    const ids = new Set([5, 7, 11]);
    expect(parseFlaggedIds(serialiseFlaggedIds(ids))).toEqual(ids);
  });
});

describe('createAedFlagStore', () => {
  it('starts with nothing flagged', async () => {
    await expect(createAedFlagStore(fakeStore()).load()).resolves.toEqual(new Set());
  });

  it('persists a flag and returns the whole set', async () => {
    const store = fakeStore();
    const flags = createAedFlagStore(store);

    await expect(flags.flag(42)).resolves.toEqual(new Set([42]));
    await expect(flags.load()).resolves.toEqual(new Set([42]));
    expect(JSON.parse(store.contents[AED_FLAGS_KEY])).toEqual([42]);
  });

  it('keeps earlier flags when another is added', async () => {
    const flags = createAedFlagStore(fakeStore());

    await flags.flag(1);
    await expect(flags.flag(2)).resolves.toEqual(new Set([1, 2]));
  });

  it('does not duplicate a repeated flag', async () => {
    const flags = createAedFlagStore(fakeStore());

    await flags.flag(9);
    await expect(flags.flag(9)).resolves.toEqual(new Set([9]));
  });

  it('survives a corrupt stored value rather than taking the screen down', async () => {
    const flags = createAedFlagStore(fakeStore({ [AED_FLAGS_KEY]: 'not json at all' }));

    await expect(flags.load()).resolves.toEqual(new Set());
    await expect(flags.flag(4)).resolves.toEqual(new Set([4]));
  });
});

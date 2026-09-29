/**
 * Locally-recorded "this one is wrong" marks.
 *
 * Local-first on purpose (plan §4.3): a flag suppresses the entry on this device the moment
 * it is made, and nothing leaves the device. Turning a flag into an OpenStreetMap note is a
 * separate, explicit, online step — the queue it would be sent from does not exist yet.
 *
 * The store takes its key-value backend as an argument so the rules can be tested without a
 * device, and so the screen is not tied to one storage implementation.
 */

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type AedFlagStore = {
  load(): Promise<ReadonlySet<number>>;
  /** Records the flag and returns the whole set, so callers re-render from one source. */
  flag(id: number): Promise<ReadonlySet<number>>;
};

export const AED_FLAGS_KEY = 'field-kit/aed/flagged';

/**
 * Anything unreadable becomes an empty set rather than an exception. This runs on a screen
 * someone may be reading while kneeling next to a casualty; corrupt local state must not
 * take the screen down with it.
 */
export function parseFlaggedIds(raw: string | null | undefined): Set<number> {
  if (!raw) return new Set();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed.filter(
        (value): value is number => typeof value === 'number' && Number.isInteger(value),
      ),
    );
  } catch {
    return new Set();
  }
}

export function serialiseFlaggedIds(ids: ReadonlySet<number>): string {
  return JSON.stringify([...ids].sort((a, b) => a - b));
}

export function createAedFlagStore(store: KeyValueStore): AedFlagStore {
  return {
    async load() {
      return parseFlaggedIds(await store.getItem(AED_FLAGS_KEY));
    },

    async flag(id: number) {
      const ids = parseFlaggedIds(await store.getItem(AED_FLAGS_KEY));
      ids.add(id);
      await store.setItem(AED_FLAGS_KEY, serialiseFlaggedIds(ids));
      return ids;
    },
  };
}

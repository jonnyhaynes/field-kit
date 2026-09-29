/**
 * The "this one is wrong" flags, as the screen sees them.
 *
 * Storage is expo-sqlite's key-value store, which is a local SQLite file in the app's own
 * directory. Flags therefore survive a restart and are wiped with the app, like everything
 * else Field Kit keeps.
 */

import Storage from 'expo-sqlite/kv-store';
import { useCallback, useEffect, useState } from 'react';

import { createAedFlagStore } from './flags';

const flagStore = createAedFlagStore(Storage);

export function useAedFlags() {
  const [flagged, setFlagged] = useState<ReadonlySet<number>>(() => new Set<number>());

  useEffect(() => {
    let cancelled = false;

    void flagStore.load().then((ids) => {
      if (!cancelled) setFlagged(ids);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const flag = useCallback((id: number) => {
    void flagStore.flag(id).then(setFlagged);
  }, []);

  return { flagged, flag };
}

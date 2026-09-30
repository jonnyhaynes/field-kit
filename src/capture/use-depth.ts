/**
 * The depth, as the screens see it.
 *
 * Guided is the default and the fallback: only an explicit switch to responder turns capture on, so
 * corrupt storage cannot put a mnemonic form in front of someone who did not ask for it.
 */

import Storage from 'expo-sqlite/kv-store';
import { useCallback, useEffect, useState } from 'react';

import { createDepthPreference, type Depth } from './depth';

const preference = createDepthPreference(Storage);

export function useDepth() {
  const [depth, setDepth] = useState<Depth>('guided');

  useEffect(() => {
    let cancelled = false;

    void preference.load().then((stored) => {
      if (!cancelled) setDepth(stored);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((value: Depth) => {
    void preference.set(value).then(setDepth);
  }, []);

  return { depth, setDepth: update };
}

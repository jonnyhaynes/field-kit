/**
 * The depth, as the screens see it.
 *
 * Guided is the default and the fallback: only an explicit switch to responder turns capture on, so
 * corrupt storage cannot put a mnemonic form in front of someone who did not ask for it.
 *
 * **One value for the whole app, not one per caller.** This used to be plain `useState` inside the
 * hook, so every screen that asked for the depth got its own copy, and turning the switch on in
 * Settings changed nothing anywhere else until the app was relaunched. That was survivable while the
 * depth only gated a button on Act — the existing capture flow relaunches, which hid it. It stopped
 * being survivable when the depth started deciding whether a whole *tab* exists: the user turned the
 * switch on, the tab bar did not change, and Field was simply never there.
 *
 * The store below is the smallest thing that makes the answer the same everywhere.
 */

import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';

import { createDepthPreference, type Depth } from './depth';

const preference = createDepthPreference(Storage);

let current: Depth = 'guided';
const listeners = new Set<(depth: Depth) => void>();

function publish(depth: Depth) {
  current = depth;
  for (const listener of listeners) listener(depth);
}

let loaded: Promise<void> | null = null;

/** Read the stored depth once per session, however many screens ask first. */
function ensureLoaded(): Promise<void> {
  loaded ??= preference.load().then(publish);
  return loaded;
}

function setDepth(value: Depth): void {
  void preference.set(value).then(publish);
}

export function useDepth() {
  const [depth, setLocal] = useState<Depth>(current);

  useEffect(() => {
    const listener = (next: Depth) => setLocal(next);
    listeners.add(listener);

    // Covers both races: the stored value arriving between the first render and this effect, and
    // another screen having loaded it before this one mounted. Resolved outside the effect body so
    // this is not a set-state-in-effect.
    void ensureLoaded().then(() => listener(current));

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { depth, setDepth };
}

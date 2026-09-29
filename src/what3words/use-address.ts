/**
 * Resolving, as the screen sees it.
 *
 * Two deliberate properties. Nothing is requested until the user asks, because a call fired by
 * merely opening a screen is a dependency nobody chose. And a result is tied to the point it was
 * taken at: if the position moves, the words on screen would describe somewhere else, so they are
 * dropped rather than shown beside new coordinates. That is the same rule as §4.1 rule 1, in
 * miniature.
 */

import { useCallback, useState } from 'react';

import type { Coordinates } from '@/aed';

import { createDefaultResolver, type AddressResolution, type ResolutionFailure } from './resolver';

// Expo inlines only a static `process.env.EXPO_PUBLIC_*` read at build time, so this cannot be
// written as a lookup on a variable, however much tidier that would be.
const API_KEY = process.env.EXPO_PUBLIC_WHAT3WORDS_KEY;

const resolver = createDefaultResolver(API_KEY);

export type AddressState =
  | { status: 'idle' }
  | { status: 'resolving' }
  | { status: 'resolved'; words: string }
  | { status: 'unavailable'; reason: ResolutionFailure };

export function useAddress(coordinates: Coordinates | undefined) {
  const [pending, setPending] = useState(false);
  const [settled, setSettled] = useState<{ key: string; outcome: AddressResolution } | null>(null);

  const key = coordinates ? `${coordinates.latitude},${coordinates.longitude}` : undefined;

  const resolve = useCallback(() => {
    if (!coordinates || !key) return;

    setPending(true);
    void resolver.resolve(coordinates).then((outcome) => {
      setPending(false);
      setSettled({ key, outcome });
    });
  }, [coordinates, key]);

  // Anything settled for a different point is ignored, so the words can never describe one place
  // while sitting beside the coordinates of another.
  const outcome = settled && settled.key === key ? settled.outcome : undefined;

  const state: AddressState = pending
    ? { status: 'resolving' }
    : outcome
      ? outcome.ok
        ? { status: 'resolved', words: outcome.words }
        : { status: 'unavailable', reason: outcome.reason }
      : resolver.unavailableReason
        ? { status: 'unavailable', reason: resolver.unavailableReason }
        : { status: 'idle' };

  return { state, resolve };
}

/**
 * Reading and writing tags, as a screen sees it.
 *
 * The capability is checked once and the controls are simply not offered when it is false — which is
 * every iOS build today, because the entitlement needs an Apple Developer account (§2.5). The screen
 * asks; this answers.
 */

import { useCallback, useEffect, useState } from 'react';

import { canNfc } from '@/capabilities/can-nfc';
import type { HandoverPayload } from '@/transfer/handover';

import { createDeviceTagIo, type WriteOutcome } from './tag-io';
import type { TagOutcome } from './tag';

const tagIo = createDeviceTagIo();

export type TagState =
  | { status: 'idle' }
  | { status: 'writing' }
  | { status: 'reading' }
  | { status: 'wrote' }
  | { status: 'failed'; reason: Extract<TagOutcome, { ok: false }>['reason'] }
  | { status: 'received'; payload: HandoverPayload };

export function useTag() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [state, setState] = useState<TagState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

    void canNfc().then((answer) => {
      if (!cancelled) setAvailable(answer);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const write = useCallback(async (payload: HandoverPayload) => {
    setState({ status: 'writing' });

    const outcome: WriteOutcome = await tagIo.write(payload);
    setState(outcome.ok ? { status: 'wrote' } : { status: 'failed', reason: outcome.reason });
  }, []);

  const read = useCallback(async () => {
    setState({ status: 'reading' });

    const outcome = await tagIo.read();
    setState(
      outcome.ok
        ? { status: 'received', payload: outcome.payload }
        : { status: 'failed', reason: outcome.reason },
    );
  }, []);

  return { available, state, write, read, reset: () => setState({ status: 'idle' }) };
}

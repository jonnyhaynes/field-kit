/**
 * The depth gate.
 *
 * §1: depth is not a mode. The emergency path is identical for everyone, and the Responder depth
 * *adds* capture on top. The failure to prevent is an untrained user meeting a mnemonic form, so the
 * gate is mechanical rather than a conditional render somebody can delete: a capture surface is typed
 * to accept only a responder depth, and a test proves a guided depth cannot reach one.
 */

import type { KeyValueStore } from '@/aed';

import { CAPTURE_FORMS, type CaptureForm } from './forms';

export type Depth = 'guided' | 'responder';

/** The refined depth a capture surface requires. */
export type ResponderDepth = Extract<Depth, 'responder'>;

export const DEPTH_KEY = 'field-kit/depth';

export class CaptureNotAllowedError extends Error {
  constructor() {
    super('Responder capture is not available at this depth');
    this.name = 'CaptureNotAllowedError';
  }
}

/**
 * Throws unless the depth is responder.
 *
 * Call this wherever a value came from storage and lost its type on the way — the same reason
 * `assertCurrent` exists for positions.
 */
export function assertResponderDepth(depth: Depth): asserts depth is ResponderDepth {
  if (depth !== 'responder') throw new CaptureNotAllowedError();
}

export function asResponderDepth(depth: Depth): ResponderDepth {
  assertResponderDepth(depth);
  return depth;
}

/**
 * The forms a responder may see.
 *
 * Taking `ResponderDepth` rather than `Depth` **is** the gate: a guided depth does not typecheck, so
 * the rule cannot be lost by removing a conditional. The runtime branch is unreachable by type and is
 * here so the parameter means something.
 */
export function responderForms(depth: ResponderDepth): readonly CaptureForm[] {
  return depth === 'responder' ? CAPTURE_FORMS : [];
}

export type DepthPreference = {
  load(): Promise<Depth>;
  set(depth: Depth): Promise<Depth>;
};

export function createDepthPreference(store: KeyValueStore): DepthPreference {
  return {
    async load() {
      // Only an explicit 'responder' opts in; anything else, including corrupt state, is guided.
      return (await store.getItem(DEPTH_KEY)) === 'responder' ? 'responder' : 'guided';
    },

    async set(depth) {
      await store.setItem(DEPTH_KEY, depth);
      return depth;
    },
  };
}

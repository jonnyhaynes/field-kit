import { describe, expect, it } from '@jest/globals';

import type { KeyValueStore } from '@/aed';

import {
  asResponderDepth,
  assertResponderDepth,
  CaptureNotAllowedError,
  createDepthPreference,
  DEPTH_KEY,
  responderForms,
  type Depth,
} from '../depth';

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

describe('the depth gate', () => {
  it('lets a responder depth through', () => {
    expect(() => assertResponderDepth('responder')).not.toThrow();
  });

  it('refuses a guided depth', () => {
    expect(() => assertResponderDepth('guided')).toThrow(CaptureNotAllowedError);
  });

  it('refuses anything that is not a responder depth', () => {
    // Corrupt stored state arrives as a string, not as a Depth.
    expect(() => assertResponderDepth('nonsense' as Depth)).toThrow(CaptureNotAllowedError);
  });

  it('narrows a depth once it has been checked', () => {
    expect(asResponderDepth('responder')).toBe('responder');
    expect(() => asResponderDepth('guided')).toThrow(CaptureNotAllowedError);
  });

  /**
   * The gate is a type, not a conditional. `responderForms` takes `ResponderDepth`, so an unrefined
   * depth does not compile: delete the `@ts-expect-error` and widen the parameter, and the annotation
   * becomes unused, so `tsc --noEmit` fails in CI rather than a reviewer having to notice.
   */
  it('cannot be asked for responder forms by a guided depth', () => {
    const depth: Depth = 'guided';

    // @ts-expect-error a guided depth must never reach a capture surface
    expect(responderForms(depth)).toEqual([]);
  });

  it('hands the forms to a responder', () => {
    expect(responderForms('responder')).toHaveLength(4);
  });
});

describe('the depth preference', () => {
  it('is guided in a fresh install', async () => {
    await expect(createDepthPreference(fakeStore()).load()).resolves.toBe('guided');
  });

  it('persists a switch to responder', async () => {
    const store = fakeStore();
    const preference = createDepthPreference(store);

    await expect(preference.set('responder')).resolves.toBe('responder');
    await expect(preference.load()).resolves.toBe('responder');
    expect(JSON.parse(JSON.stringify(store.contents[DEPTH_KEY]))).toBe('responder');
  });

  it('treats a corrupt value as guided rather than as consent', async () => {
    const preference = createDepthPreference(fakeStore({ [DEPTH_KEY]: 'yes please' }));
    await expect(preference.load()).resolves.toBe('guided');
  });

  it('goes back to guided', async () => {
    const preference = createDepthPreference(fakeStore());
    await preference.set('responder');
    await expect(preference.set('guided')).resolves.toBe('guided');
  });
});

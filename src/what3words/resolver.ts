/**
 * Resolving a what3words location for a position.
 *
 * The licence was read before this was written (plan §2.2), and two things in it are worth recording
 * here rather than being discovered later: clause 6.3(b) says a 3 Word Address must not be displayed
 * "alongside its corresponding coordinates", and the Free tier lost coordinate-to-location
 * conversion in November 2024, so resolving needs an account with `convert-to-3wa` enabled. The
 * project's decision is to proceed as designed; this comment is the record, not an argument.
 *
 * No network happens at import, and nothing is sent until `resolve` is called.
 */

import type { Coordinates } from '@/aed';

const ENDPOINT = 'https://api.what3words.com/v3/convert-to-3wa';

/** The environment variable the key comes from. Never committed; see the README. */
export const API_KEY_VARIABLE = 'EXPO_PUBLIC_WHAT3WORDS_KEY';

export type ResolutionFailure =
  /** No API key, so there is nothing to ask. */
  | 'not-configured'
  /** The request never completed: offline, or the service is unreachable. */
  | 'no-connection'
  /** The key or the plan is not accepted (401, 402). */
  | 'rejected'
  /** Anything else: an unusable body, or a server error. */
  | 'failed';

export type AddressResolution =
  { ok: true; words: string } | { ok: false; reason: ResolutionFailure };

export type AddressResolver = {
  /** Never throws, so the caller always has something to render. */
  resolve(coordinates: Coordinates): Promise<AddressResolution>;
  /** Set when this resolver cannot do its job at all — no key, for instance. */
  readonly unavailableReason?: ResolutionFailure;
};

type ResponseLike = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export type FetchLike = (url: string) => Promise<ResponseLike>;

export function createUnavailableResolver(reason: ResolutionFailure): AddressResolver {
  return {
    unavailableReason: reason,
    resolve: async () => ({ ok: false, reason }),
  };
}

export function createHttpResolver({
  apiKey,
  fetchImpl = fetch,
}: {
  apiKey: string;
  /** Injected so the request and every failure mode can be tested without a network. */
  fetchImpl?: FetchLike;
}): AddressResolver {
  return {
    async resolve(coordinates) {
      const query = [
        `key=${encodeURIComponent(apiKey)}`,
        `coordinates=${coordinates.latitude},${coordinates.longitude}`,
        'language=en',
      ].join('&');

      let response: ResponseLike;
      try {
        response = await fetchImpl(`${ENDPOINT}?${query}`);
      } catch {
        // A rejected fetch is indistinguishable from being offline from here, and saying so is
        // more useful than the exception.
        return { ok: false, reason: 'no-connection' };
      }

      if (!response.ok) {
        // 401 missing/invalid key, 402 no plan or quota exceeded. Both mean "this account may not
        // do this", which is a different message from a transient failure.
        return {
          ok: false,
          reason: response.status === 401 || response.status === 402 ? 'rejected' : 'failed',
        };
      }

      try {
        const body: unknown = await response.json();
        const words = (body as { words?: unknown } | null)?.words;
        if (typeof words !== 'string' || words.trim() === '') {
          return { ok: false, reason: 'failed' };
        }
        return { ok: true, words };
      } catch {
        return { ok: false, reason: 'failed' };
      }
    },
  };
}

/** The resolver the app uses: the real thing when a key is present, and an honest no-op without. */
export function createDefaultResolver(apiKey: string | undefined): AddressResolver {
  return apiKey && apiKey.trim() !== ''
    ? createHttpResolver({ apiKey: apiKey.trim() })
    : createUnavailableResolver('not-configured');
}

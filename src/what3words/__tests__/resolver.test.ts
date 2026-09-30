import { describe, expect, it } from '@jest/globals';

import { createDefaultResolver, createHttpResolver, createUnavailableResolver } from '../resolver';

const LONDON = { latitude: 51.5074, longitude: -0.1278 };

/** A stand-in for `fetch` that records what it was asked for. */
function fakeFetch(response: { status?: number; body?: unknown; throws?: boolean }) {
  const calls: string[] = [];
  return {
    calls,
    fetchImpl: async (url: string) => {
      calls.push(url);
      if (response.throws) throw new Error('network down');
      return {
        ok: (response.status ?? 200) < 400,
        status: response.status ?? 200,
        json: async () => response.body,
      };
    },
  };
}

const GOOD_BODY = {
  words: 'filled.count.soap',
  country: 'GB',
  coordinates: { lat: 51.520847, lng: -0.195521 },
};

describe('createHttpResolver', () => {
  it('returns the three words on success', async () => {
    const { fetchImpl } = fakeFetch({ body: GOOD_BODY });
    await expect(createHttpResolver({ apiKey: 'key', fetchImpl }).resolve(LONDON)).resolves.toEqual(
      {
        ok: true,
        words: 'filled.count.soap',
      },
    );
  });

  it('asks the documented v3 endpoint with the key and the coordinate', async () => {
    const { calls, fetchImpl } = fakeFetch({ body: GOOD_BODY });
    await createHttpResolver({ apiKey: 'secret', fetchImpl }).resolve(LONDON);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('https://api.what3words.com/v3/convert-to-3wa');
    expect(calls[0]).toContain('key=secret');
    expect(calls[0]).toContain('coordinates=51.5074,-0.1278');
  });

  it('escapes a key rather than pasting it into the query', async () => {
    const { calls, fetchImpl } = fakeFetch({ body: GOOD_BODY });
    await createHttpResolver({ apiKey: 'a key&with=chars', fetchImpl }).resolve(LONDON);

    expect(calls[0]).toContain('key=a%20key%26with%3Dchars');
  });

  it.each([
    ['an invalid or missing key', 401],
    ['a plan that cannot resolve, or an exhausted quota', 402],
  ])('reports %s as rejected, not as a failure', async (_label, status) => {
    const { fetchImpl } = fakeFetch({ status, body: {} });
    await expect(createHttpResolver({ apiKey: 'key', fetchImpl }).resolve(LONDON)).resolves.toEqual(
      {
        ok: false,
        reason: 'rejected',
      },
    );
  });

  it('reports a request that never completed as no-connection', async () => {
    const { fetchImpl } = fakeFetch({ throws: true });
    await expect(createHttpResolver({ apiKey: 'key', fetchImpl }).resolve(LONDON)).resolves.toEqual(
      {
        ok: false,
        reason: 'no-connection',
      },
    );
  });

  it.each([
    ['a server error', { status: 503, body: {} }],
    ['a body with no words', { body: { error: { code: 'BadCoordinates' } } }],
    ['words that are not a string', { body: { words: 42 } }],
    ['empty words', { body: { words: '   ' } }],
    ['a null body', { body: null }],
  ])('reports %s as failed', async (_label, response) => {
    const { fetchImpl } = fakeFetch(response);
    await expect(createHttpResolver({ apiKey: 'key', fetchImpl }).resolve(LONDON)).resolves.toEqual(
      {
        ok: false,
        reason: 'failed',
      },
    );
  });

  it('never throws, whatever the transport does', async () => {
    const { fetchImpl } = fakeFetch({ throws: true });
    await expect(
      createHttpResolver({ apiKey: 'key', fetchImpl }).resolve(LONDON),
    ).resolves.toBeDefined();
  });
});

describe('createUnavailableResolver', () => {
  it('reports the reason it was given, without a request', async () => {
    await expect(createUnavailableResolver('not-configured').resolve(LONDON)).resolves.toEqual({
      ok: false,
      reason: 'not-configured',
    });
  });

  it('declares that it cannot work, so a screen can say so before anything is tapped', () => {
    expect(createUnavailableResolver('not-configured').unavailableReason).toBe('not-configured');
  });
});

describe('createDefaultResolver', () => {
  it('is the real resolver when a key is configured', () => {
    expect(createDefaultResolver('a-key').unavailableReason).toBeUndefined();
  });

  it.each([
    ['undefined', undefined],
    ['an empty string', ''],
    ['only whitespace', '   '],
  ])('is an honest no-op when the key is %s', (_label, apiKey) => {
    expect(createDefaultResolver(apiKey).unavailableReason).toBe('not-configured');
  });
});

import { describe, expect, it } from '@jest/globals';

import { createOsmNoteSubmitter, type FetchLike } from '../submit';
import type { QueuedNote } from '../queue';

const NOTE: QueuedNote = {
  osmNodeId: 42,
  latitude: 51.5074,
  longitude: -0.1278,
  text: 'The box has been taken away.',
  queuedAt: '2026-09-30T09:00:00.000Z',
};

const USER_AGENT = 'FieldKit/1.0.0 (+https://example.test)';

type Call = { url: string; init: Parameters<FetchLike>[1] };

/** A stand-in for `fetch` that records the request and answers with whatever the test wants. */
function fakeFetch(response: { status?: number; body?: unknown; throws?: boolean }) {
  const calls: Call[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    if (response.throws) throw new Error('network down');
    return {
      ok: (response.status ?? 200) < 400,
      status: response.status ?? 200,
      json: async () => response.body,
    };
  };

  return { calls, fetchImpl };
}

const submitter = (response: Parameters<typeof fakeFetch>[0]) => {
  const fake = fakeFetch(response);
  return {
    ...fake,
    client: createOsmNoteSubmitter({ userAgent: USER_AGENT, fetchImpl: fake.fetchImpl }),
  };
};

describe('creating a note', () => {
  it('returns the id of the note it created', async () => {
    const { client } = submitter({ body: { type: 'Feature', properties: { id: 1234 } } });
    await expect(client.submit(NOTE)).resolves.toEqual({ ok: true, noteId: 1234 });
  });

  it('still counts as sent when the response body cannot be read', async () => {
    // The note exists by then, whatever shape the body turned out to be.
    const { client } = submitter({ body: null });
    await expect(client.submit(NOTE)).resolves.toEqual({ ok: true });
  });

  it('posts the coordinates and the text to the notes endpoint', async () => {
    const { calls, client } = submitter({ body: {} });
    await client.submit(NOTE);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.openstreetmap.org/api/0.6/notes.json');
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body)).toEqual({
      lat: 51.5074,
      lon: -0.1278,
      text: NOTE.text,
    });
  });

  it('identifies the app, which the policy requires', async () => {
    const { calls, client } = submitter({ body: {} });
    await client.submit(NOTE);

    expect(calls[0].init.headers['User-Agent']).toBe(USER_AGENT);
    expect(calls[0].init.headers['Content-Type']).toBe('application/json');
  });
});

describe('when it cannot send', () => {
  it('reports a request that never completed as no-connection', async () => {
    const { client } = submitter({ throws: true });
    await expect(client.submit(NOTE)).resolves.toEqual({ ok: false, reason: 'no-connection' });
  });

  it('reports a 403 as a moderation zone, not as a generic failure', async () => {
    // OSM refuses an anonymous note inside a Moderation Zone. That is a different message to the
    // user from "something went wrong", and a different thing for them to do about it.
    const { client } = submitter({ status: 403, body: {} });
    await expect(client.submit(NOTE)).resolves.toEqual({ ok: false, reason: 'moderation-zone' });
  });

  it('reports being rate limited as rejected', async () => {
    const { client } = submitter({ status: 429, body: {} });
    await expect(client.submit(NOTE)).resolves.toEqual({ ok: false, reason: 'rejected' });
  });

  it.each([400, 500, 503])('reports %p as failed', async (status) => {
    const { client } = submitter({ status, body: {} });
    await expect(client.submit(NOTE)).resolves.toEqual({ ok: false, reason: 'failed' });
  });

  it('never throws, whatever the transport does', async () => {
    const { client } = submitter({ throws: true });
    await expect(client.submit(NOTE)).resolves.toBeDefined();
  });
});

describe('the safety property', () => {
  it('sends nothing until someone asks it to', async () => {
    const { calls, client } = submitter({ body: {} });

    expect(calls).toHaveLength(0);
    await client.submit(NOTE);
    expect(calls).toHaveLength(1);
  });
});

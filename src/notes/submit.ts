/**
 * The OpenStreetMap note client.
 *
 * Two things the policy requires of this call, both of them the difference between a client OSM
 * tolerates and one it blocks: an identifiable **User-Agent**, and the request being made because a
 * person asked for it. The second is not something this module can enforce — that is the screen's job,
 * and the queue is deliberately a list rather than an outbox so the screen has something to submit
 * *from* rather than something to drain.
 *
 * No account is used, so the note is anonymous. OSM accepts that; the cost is a 403 inside a
 * "Moderation Zone", which is handled as its own outcome rather than as a generic failure.
 */

import type { QueuedNote } from './queue';

const ENDPOINT = 'https://api.openstreetmap.org/api/0.6/notes.json';

export type SubmitFailure =
  /** The request never completed: offline, or the service is unreachable. */
  | 'no-connection'
  /** 403: an anonymous note is not accepted at these coordinates. */
  | 'moderation-zone'
  /** 429: rate limited, or something else OSM is refusing for now. */
  | 'rejected'
  /** Anything else: a malformed request, or a server error. */
  | 'failed';

export type SubmitResult = { ok: true; noteId?: number } | { ok: false; reason: SubmitFailure };

type ResponseLike = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<ResponseLike>;

export type NoteSubmitter = {
  /** Never throws, so the screen always has something to say. */
  submit(note: QueuedNote): Promise<SubmitResult>;
};

export function createOsmNoteSubmitter({
  userAgent,
  fetchImpl = fetch,
}: {
  userAgent: string;
  /** Injected so the request and every failure mode can be tested without touching OSM. */
  fetchImpl?: FetchLike;
}): NoteSubmitter {
  return {
    async submit(note) {
      let response: ResponseLike;
      try {
        response = await fetchImpl(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // OSM requires this to identify the app and its version, and blocks clients that fake
            // another app's.
            'User-Agent': userAgent,
          },
          body: JSON.stringify({
            lat: note.latitude,
            lon: note.longitude,
            text: note.text,
          }),
        });
      } catch {
        return { ok: false, reason: 'no-connection' };
      }

      if (!response.ok) {
        if (response.status === 403) return { ok: false, reason: 'moderation-zone' };
        if (response.status === 429) return { ok: false, reason: 'rejected' };
        return { ok: false, reason: 'failed' };
      }

      // The note exists at this point whatever the body turns out to be, so a body we cannot read is
      // still a success — we just cannot say which note it became.
      try {
        const body: unknown = await response.json();
        const id = (body as { properties?: { id?: unknown } } | null)?.properties?.id;
        return typeof id === 'number' ? { ok: true, noteId: id } : { ok: true };
      } catch {
        return { ok: true };
      }
    },
  };
}

/**
 * Reports waiting for the user to send them.
 *
 * **A pending list, not an outbox.** Nothing here is ever sent by the app on its own. OpenStreetMap's
 * API Usage Policy says a client must not *"submit website forms in an automated manner or on behalf
 * of users"*, and the Notes API page says notes are *"intended for humans to communicate with other
 * humans"* and are *"not a place to dump automated error checking"*. A queue that fired whenever a
 * connection appeared would be precisely the thing those words prohibit.
 *
 * So the queue exists to be read, edited and sent by a person, one note at a time.
 */

import type { AedRecord, KeyValueStore } from '@/aed';

export type QueuedNote = {
  /** The OpenStreetMap node that was flagged, and the thing a note is about. */
  osmNodeId: number;
  latitude: number;
  longitude: number;
  /** What would be posted. Editable: a mapper needs to know what was actually found. */
  text: string;
  /** ISO-8601, when the flag was made. */
  queuedAt: string;
};

export const OSM_NOTES_KEY = 'field-kit/osm/notes';

/**
 * A starting point, not a finished note.
 *
 * It says only what the app knows — that someone flagged this — and admits that the record needs
 * verifying rather than asserting the defibrillator is gone. The user is expected to replace it with
 * what they actually found, which is both more useful to a mapper and what makes this a person
 * communicating rather than a template being filed.
 */
export function suggestNoteText(record: AedRecord): string {
  return `Flagged as inaccurate from the Field Kit first aid app: this defibrillator may have moved, been removed, or not be publicly accessible. Please verify before changing the map.`;
}

function isQueuedNote(value: unknown): value is QueuedNote {
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as Partial<QueuedNote>;
  return (
    typeof candidate.osmNodeId === 'number' &&
    Number.isInteger(candidate.osmNodeId) &&
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude) &&
    typeof candidate.text === 'string' &&
    typeof candidate.queuedAt === 'string'
  );
}

/** Unreadable state becomes an empty list rather than an exception, as the flag store does. */
export function parseQueuedNotes(raw: string | null | undefined): QueuedNote[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isQueuedNote) : [];
  } catch {
    return [];
  }
}

export function serialiseQueuedNotes(notes: readonly QueuedNote[]): string {
  return JSON.stringify(notes);
}

export type NoteQueue = {
  load(): Promise<QueuedNote[]>;
  /** Queues a flagged record. Re-flagging the same node updates rather than stacks. */
  enqueue(record: AedRecord, queuedAt: string): Promise<QueuedNote[]>;
  updateText(osmNodeId: number, text: string): Promise<QueuedNote[]>;
  /** Drops a note: because the user discarded it, or because it was sent. */
  remove(osmNodeId: number): Promise<QueuedNote[]>;
};

export function createNoteQueue(store: KeyValueStore): NoteQueue {
  async function load(): Promise<QueuedNote[]> {
    return parseQueuedNotes(await store.getItem(OSM_NOTES_KEY));
  }

  async function save(notes: readonly QueuedNote[]): Promise<QueuedNote[]> {
    const next = [...notes];
    await store.setItem(OSM_NOTES_KEY, serialiseQueuedNotes(next));
    return next;
  }

  return {
    load,

    async enqueue(record, queuedAt) {
      const notes = await load();
      const without = notes.filter((note) => note.osmNodeId !== record.id);

      return save([
        ...without,
        {
          osmNodeId: record.id,
          latitude: record.coordinates.latitude,
          longitude: record.coordinates.longitude,
          text: suggestNoteText(record),
          queuedAt,
        },
      ]);
    },

    async updateText(osmNodeId, text) {
      const notes = await load();
      return save(notes.map((note) => (note.osmNodeId === osmNodeId ? { ...note, text } : note)));
    },

    async remove(osmNodeId) {
      const notes = await load();
      return save(notes.filter((note) => note.osmNodeId !== osmNodeId));
    },
  };
}

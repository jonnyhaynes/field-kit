import { describe, expect, it } from '@jest/globals';

import type { AedRecord, KeyValueStore } from '@/aed';

import {
  createNoteQueue,
  OSM_NOTES_KEY,
  parseQueuedNotes,
  serialiseQueuedNotes,
  suggestNoteText,
  type QueuedNote,
} from '../queue';

const record = (id: number, latitude = 51.5074, longitude = -0.1278): AedRecord => ({
  id,
  coordinates: { latitude, longitude },
  source: { dataset: 'osm-fixture', osmNodeId: id },
  verification: { status: 'never-verified' },
});

const note = (osmNodeId: number, text = 'A note'): QueuedNote => ({
  osmNodeId,
  latitude: 51.5074,
  longitude: -0.1278,
  text,
  queuedAt: '2026-09-30T09:00:00.000Z',
});

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

describe('suggestNoteText', () => {
  const text = suggestNoteText(record(1));

  it('says where the report came from', () => {
    expect(text).toContain('Field Kit');
  });

  it('does not claim to know what happened to the defibrillator', () => {
    // The app knows only that someone flagged it. Asserting it is gone would be a mapper acting on
    // our guess rather than on the user's observation.
    expect(text).toContain('may');
    expect(text).toContain('verify');
    for (const claim of ['has been removed', 'does not exist', 'is gone']) {
      expect(text).not.toContain(claim);
    }
  });
});

describe('parseQueuedNotes', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['nothing parseable', 'not json'],
    ['valid JSON that is not an array', '{"a":1}'],
  ])('returns an empty list for %s', (_label, raw) => {
    expect(parseQueuedNotes(raw)).toEqual([]);
  });

  it('drops entries that are not usable rather than the whole queue', () => {
    const raw = JSON.stringify([
      note(1),
      { osmNodeId: 'two' },
      { ...note(3), latitude: Number.NaN },
      { ...note(4), text: 42 },
    ]);
    expect(parseQueuedNotes(raw).map((entry) => entry.osmNodeId)).toEqual([1]);
  });

  it('round-trips', () => {
    const notes = [note(7), note(9, 'Something else')];
    expect(parseQueuedNotes(serialiseQueuedNotes(notes))).toEqual(notes);
  });
});

describe('createNoteQueue', () => {
  it('starts empty', async () => {
    await expect(createNoteQueue(fakeStore()).load()).resolves.toEqual([]);
  });

  it('queues a flagged record with its coordinates and a starting text', async () => {
    const store = fakeStore();
    const queued = await createNoteQueue(store).enqueue(
      record(42, 51.5, -0.12),
      '2026-09-30T09:00:00.000Z',
    );

    expect(queued).toEqual([
      {
        osmNodeId: 42,
        latitude: 51.5,
        longitude: -0.12,
        text: suggestNoteText(record(42)),
        queuedAt: '2026-09-30T09:00:00.000Z',
      },
    ]);
    expect(JSON.parse(store.contents[OSM_NOTES_KEY])).toHaveLength(1);
  });

  it('does not stack up when the same entry is flagged twice', async () => {
    const notes = createNoteQueue(fakeStore());

    await notes.enqueue(record(1), '2026-09-30T09:00:00.000Z');
    await expect(notes.enqueue(record(1), '2026-09-30T10:00:00.000Z')).resolves.toHaveLength(1);
  });

  it('keeps notes for different entries', async () => {
    const notes = createNoteQueue(fakeStore());

    await notes.enqueue(record(1), '2026-09-30T09:00:00.000Z');
    await expect(notes.enqueue(record(2), '2026-09-30T09:00:00.000Z')).resolves.toHaveLength(2);
  });

  it('edits one note without touching the others', async () => {
    const notes = createNoteQueue(fakeStore());
    await notes.enqueue(record(1), '2026-09-30T09:00:00.000Z');
    await notes.enqueue(record(2), '2026-09-30T09:00:00.000Z');

    const updated = await notes.updateText(1, 'No longer there — the box has gone.');

    expect(updated.find((entry) => entry.osmNodeId === 1)?.text).toBe(
      'No longer there — the box has gone.',
    );
    expect(updated.find((entry) => entry.osmNodeId === 2)?.text).toBe(suggestNoteText(record(2)));
  });

  it('removes a note, for either reason', async () => {
    const notes = createNoteQueue(fakeStore());
    await notes.enqueue(record(1), '2026-09-30T09:00:00.000Z');
    await notes.enqueue(record(2), '2026-09-30T09:00:00.000Z');

    await expect(notes.remove(1)).resolves.toEqual([expect.objectContaining({ osmNodeId: 2 })]);
  });

  it('survives corrupt stored state rather than taking the screen down', async () => {
    const notes = createNoteQueue(fakeStore({ [OSM_NOTES_KEY]: 'not json at all' }));

    await expect(notes.load()).resolves.toEqual([]);
    await expect(notes.enqueue(record(4), '2026-09-30T09:00:00.000Z')).resolves.toHaveLength(1);
  });
});

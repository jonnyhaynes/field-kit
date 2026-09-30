/**
 * The queue, the opt-in and the submitter, as the screens see them.
 *
 * Storage is expo-sqlite's key-value store, shared with the flags: a second store would be a second
 * thing to get wrong, and both are small local state that should die with the app.
 */

import Constants from 'expo-constants';
import Storage from 'expo-sqlite/kv-store';
import { useCallback, useEffect, useState } from 'react';

import type { AedRecord } from '@/aed';

import { createOsmPreferences } from './preferences';
import { createNoteQueue, type QueuedNote } from './queue';
import { createOsmNoteSubmitter, type SubmitResult } from './submit';

const queue = createNoteQueue(Storage);
const preferences = createOsmPreferences(Storage);

/** OSM requires a User-Agent naming the app and its version; faking another app's gets you blocked. */
export const USER_AGENT = `FieldKit/${Constants.expoConfig?.version ?? 'unknown'} (+https://github.com/jonnyhaynes/field-kit)`;

const submitter = createOsmNoteSubmitter({ userAgent: USER_AGENT });

export function useNoteQueue() {
  const [notes, setNotes] = useState<QueuedNote[]>([]);

  useEffect(() => {
    let cancelled = false;

    void queue.load().then((loaded) => {
      if (!cancelled) setNotes(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const enqueue = useCallback((record: AedRecord) => {
    void queue.enqueue(record, new Date().toISOString()).then(setNotes);
  }, []);

  const updateText = useCallback((osmNodeId: number, text: string) => {
    void queue.updateText(osmNodeId, text).then(setNotes);
  }, []);

  const remove = useCallback((osmNodeId: number) => {
    void queue.remove(osmNodeId).then(setNotes);
  }, []);

  return { notes, enqueue, updateText, remove };
}

export function useOsmOptIn() {
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void preferences.isOptedIn().then((value) => {
      if (!cancelled) setOptedIn(value);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((value: boolean) => {
    void preferences.setOptedIn(value).then(setOptedIn);
  }, []);

  return { optedIn, setOptedIn: update };
}

/**
 * Sending, which only ever happens because a person tapped Send.
 *
 * `sending` is the node id currently in flight, so the screen can disable that one row rather than
 * the whole list.
 */
export function useOsmSubmitter() {
  const [sending, setSending] = useState<number | undefined>(undefined);

  const send = useCallback(async (note: QueuedNote): Promise<SubmitResult> => {
    setSending(note.osmNodeId);
    const result = await submitter.submit(note);
    setSending(undefined);
    return result;
  }, []);

  return { send, sending };
}

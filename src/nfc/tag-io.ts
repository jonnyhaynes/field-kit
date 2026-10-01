/**
 * The radio, behind a seam.
 *
 * Every rule that decides *what* happens lives in `tag.ts`, where it is unit-tested, because none of
 * this can be tested anywhere else: no simulator has an NFC reader, and there is no device. What is
 * left here is the part that can only be wrong on hardware, and it is kept as thin as it can be.
 *
 * The module is required lazily, after the platform gate. On iOS there is no NFC native module linked,
 * and a top-level import of a library that reaches for it would take the app down on a screen that
 * never touches NFC — the lesson Phase 2d learned with MapLibre.
 */

import { fitsOnTag, fromTagRecord, toTagRecord, type TagFailure, type TagOutcome } from './tag';
import type { HandoverPayload } from '@/transfer/handover';

export type WriteOutcome = { ok: true } | { ok: false; reason: TagFailure };

export type TagIo = {
  /** Waits for a tag, checks it can take the report, then writes it. */
  write(payload: HandoverPayload): Promise<WriteOutcome>;
  /** Waits for a tag, then reads whatever is on it. */
  read(): Promise<TagOutcome>;
};

/** How long to hold the reader open before deciding nothing is coming. */
export const TAG_TIMEOUT_MS = 20_000;

/* eslint-disable @typescript-eslint/no-require-imports */
function nfc() {
  const module = require('react-native-nfc-manager') as {
    default: {
      start: () => Promise<void>;
      isSupported: () => Promise<boolean>;
      requestTechnology: (tech: unknown) => Promise<void>;
      getTag: () => Promise<{ ndefMessage?: unknown[]; maxSize?: number } | null>;
      cancelTechnologyRequest: () => Promise<void>;
      ndefHandler: { writeNdefMessage: (bytes: number[]) => Promise<void> };
    };
    Ndef: {
      encodeMessage: (records: unknown[]) => number[];
      decodeMessage: (bytes: number[]) => unknown[];
      TNF_MIME_MEDIA: number;
    };
    NfcTech: { Ndef: unknown };
  };

  return module;
}
/* eslint-enable @typescript-eslint/no-require-imports */

function bytesOf(value: unknown): number[] {
  return Array.isArray(value) ? (value as number[]) : [];
}

/** The record shape the library expects, built from ours. */
function recordFor(mimeType: string, bytes: number[]) {
  const { Ndef } = nfc();

  return { tnf: Ndef.TNF_MIME_MEDIA, type: mimeType, payload: bytes };
}

export function createDeviceTagIo(): TagIo {
  /**
   * One session per operation: ask for the NDEF technology, do the work, release it whatever happens.
   * A reader left open holds the radio and drains the battery.
   */
  async function withTag<T>(work: () => Promise<T>): Promise<T> {
    const { default: NfcManager, NfcTech } = nfc();

    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.Ndef);
      return await work();
    } finally {
      await NfcManager.cancelTechnologyRequest().catch(() => undefined);
    }
  }

  return {
    async write(payload) {
      const record = toTagRecord(payload);

      return withTag<WriteOutcome>(async () => {
        const { default: NfcManager } = nfc();
        const tag = await NfcManager.getTag();

        if (!tag) return { ok: false, reason: 'no-tag' };
        // Checked before writing, so a tag that cannot hold the report is left untouched rather than
        // half-written.
        if (!fitsOnTag(record.bytes.length, tag.maxSize)) return { ok: false, reason: 'too-small' };

        const message = nfc().Ndef.encodeMessage([recordFor(record.mimeType, record.bytes)]);
        await NfcManager.ndefHandler.writeNdefMessage(message);

        return { ok: true };
      }).catch((error: unknown) => {
        // The library reports a locked tag and an absent one as failures of different shapes, and this
        // is the best reading of them available without hardware to confirm it.
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('read-only') || message.includes('readonly')) {
          return { ok: false, reason: 'read-only' as const };
        }

        return { ok: false, reason: 'no-tag' as const };
      });
    },

    async read() {
      return withTag<TagOutcome>(async () => {
        const { default: NfcManager, Ndef } = nfc();
        const tag = await NfcManager.getTag();

        if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
          return { ok: false, reason: 'unreadable' } as const;
        }

        const first = tag.ndefMessage[0] as { tnf?: number; type?: unknown; payload?: unknown };
        // The library hands back the raw record; `type` is the MIME type as bytes on some platforms and
        // as a string on others, which is why ours is compared after normalising.
        const mimeType =
          typeof first.type === 'string' ? first.type : fromBytes(bytesOf(first.type));

        void Ndef;

        return fromTagRecord({ mimeType, bytes: bytesOf(first.payload) });
      }).catch(() => ({ ok: false, reason: 'unreadable' as const }));
    },
  };
}

function fromBytes(bytes: number[]): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);

  return text;
}

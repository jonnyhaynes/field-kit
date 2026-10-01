/**
 * A report on an NFC tag.
 *
 * **The format is not new.** A tag carries exactly what a QR code carries — `serialiseHandover`'s
 * payload — so both paths write the same bytes and `parseHandover` reads both, with the same refusals.
 * A second format would be a second set of bugs.
 *
 * Pure, and the whole of the tag logic: the byte encoding, the size rule and the failure words. The
 * radio lives in `tag-io.ts`, behind a seam, because none of this can be tested on a simulator.
 */

import {
  parseHandover,
  serialiseHandover,
  utf8Length,
  type HandoverPayload,
  type ParsedHandover,
} from '@/transfer/handover';

/**
 * A MIME record, not a text record.
 *
 * NDEF exists to say what the data *is*, and a MIME type is how it says it — so a tag holding someone
 * else's data is recognised as foreign rather than guessed at. `parseHandover` refuses a foreign
 * payload as well, so the two defences agree.
 */
export const TAG_MIME_TYPE = 'application/vnd.field-kit.handover+json';

/** The payload as the bytes a tag stores. */
export type TagRecord = {
  mimeType: string;
  bytes: number[];
};

/** UTF-8, by hand, so the encoding is testable and does not depend on the engine having `TextEncoder`. */
export function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];

  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;

    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  return bytes;
}

/** The inverse, for what comes back off a tag. Unpaired bytes become the replacement character. */
export function utf8Text(bytes: readonly number[]): string {
  let text = '';

  for (let index = 0; index < bytes.length;) {
    const first = bytes[index] ?? 0;
    const width = first < 0x80 ? 1 : first < 0xe0 ? 2 : first < 0xf0 ? 3 : 4;

    if (index + width > bytes.length) {
      text += '\uFFFD';
      break;
    }

    let code = first & (width === 1 ? 0x7f : width === 2 ? 0x1f : width === 3 ? 0x0f : 0x07);
    for (let offset = 1; offset < width; offset += 1) {
      code = (code << 6) | ((bytes[index + offset] ?? 0) & 0x3f);
    }

    text += String.fromCodePoint(code);
    index += width;
  }

  return text;
}

export function toTagRecord(payload: HandoverPayload): TagRecord {
  return { mimeType: TAG_MIME_TYPE, bytes: utf8Bytes(serialiseHandover(payload)) };
}

export type TagOutcome = { ok: true; payload: HandoverPayload } | { ok: false; reason: TagFailure };

/** Every way a tag can fail, none of them the same thing to the person holding the phone. */
export type TagFailure =
  /** This device has no NFC reader, or the platform cannot use one (iOS, without the entitlement). */
  | 'nfc-unavailable'
  /** Nothing was presented. The reader waits, and then gives up. */
  | 'no-tag'
  /** A tag, but not one that can be read. */
  | 'unreadable'
  /** A tag that cannot be written: a locked or read-only one. */
  | 'read-only'
  /** The report is larger than the tag, so it was never started. */
  | 'too-small'
  /** A tag carrying someone else's data, or a Field Kit payload this version cannot read. */
  | 'not-a-field-kit-report';

export const TAG_FAILURE_TEXT: Record<TagFailure, string> = {
  'nfc-unavailable': 'This device cannot read or write tags.',
  'no-tag':
    'No tag was found. Hold the phone against the tag until it beeps, and try again — nothing was changed.',
  unreadable: 'That tag could not be read. Nothing was changed.',
  'read-only': 'That tag is locked, so nothing can be written to it. The report is still here.',
  'too-small': 'That tag is too small for this report. Nothing was changed.',
  'not-a-field-kit-report': 'That tag does not hold a Field Kit report. It has been left alone.',
};

/**
 * Whether the report fits the tag in front of us, checked **before** writing.
 *
 * A 48-byte tag cannot hold a report, and finding that out half-way through a write is worse than not
 * starting one.
 */
export function fitsOnTag(bytes: number, capacityBytes: number | undefined): boolean {
  // A tag that does not report its capacity is written to anyway: the write either works or fails, and
  // refusing on a missing number would refuse tags that are perfectly capable.
  if (capacityBytes === undefined) return true;

  return bytes <= capacityBytes;
}

/** Read what came off a tag. A foreign record is refused by name rather than parsed hopefully. */
export function fromTagRecord(record: TagRecord): TagOutcome {
  if (record.mimeType.trim().toLowerCase() !== TAG_MIME_TYPE) {
    return { ok: false, reason: 'not-a-field-kit-report' };
  }

  const parsed: ParsedHandover = parseHandover(utf8Text(record.bytes));

  return parsed.ok
    ? { ok: true, payload: parsed.payload }
    : { ok: false, reason: 'not-a-field-kit-report' };
}

/** The JSON length as bytes, which is what a tag's capacity is measured in. */
export function tagSizeOf(payload: HandoverPayload): number {
  return utf8Length(serialiseHandover(payload));
}

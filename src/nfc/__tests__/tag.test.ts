import { describe, expect, it } from '@jest/globals';

import {
  HANDOVER_FORMAT,
  HANDOVER_VERSION,
  serialiseHandover,
  type HandoverPayload,
} from '@/transfer/handover';

import {
  fitsOnTag,
  fromTagRecord,
  TAG_FAILURE_TEXT,
  TAG_MIME_TYPE,
  tagSizeOf,
  toTagRecord,
  utf8Bytes,
  utf8Text,
  type TagFailure,
} from '../tag';

const PAYLOAD: HandoverPayload = {
  format: HANDOVER_FORMAT,
  version: HANDOVER_VERSION,
  depth: 'responder',
  openedAt: '2026-09-30T14:55:00.000Z',
  sentAt: '2026-09-30T15:02:00.000Z',
  location: { latitude: 54.4287, longitude: -2.9613, sampledAt: '2026-09-30T14:59:00.000Z' },
  answers: [
    { fieldId: 'ethane.incidentType', value: 'Fell walker' },
    { fieldId: 'ethane.casualties', value: 1 },
  ],
};

describe('the bytes on a tag', () => {
  it('round-trips a report unchanged', () => {
    expect(fromTagRecord(toTagRecord(PAYLOAD))).toEqual({ ok: true, payload: PAYLOAD });
  });

  it('carries exactly what a QR code carries — one serialisation, not two', () => {
    const record = toTagRecord(PAYLOAD);

    expect(record.mimeType).toBe(TAG_MIME_TYPE);
    expect(utf8Text(record.bytes)).toBe(serialiseHandover(PAYLOAD));
  });

  it('encodes text as UTF-8, including what a Welsh place name costs', () => {
    expect(utf8Bytes('Llanfairpwll')).toHaveLength(12);
    expect(utf8Bytes('â')).toEqual([0xc3, 0xa2]);
    expect(utf8Bytes('☂')).toEqual([0xe2, 0x98, 0x82]);
    expect(utf8Bytes('🌧')).toEqual([0xf0, 0x9f, 0x8c, 0xa7]);
    expect(utf8Bytes('')).toEqual([]);
  });

  it('reads those bytes back exactly', () => {
    for (const text of ['Llanfairpwll', 'â', '☂', '🌧', 'a & b? #c\nnew line', '']) {
      expect(utf8Text(utf8Bytes(text))).toBe(text);
    }
  });

  it('replaces a byte sequence it cannot finish rather than throwing', () => {
    // A truncated tag is a real possibility, and a screen is better than an exception.
    expect(utf8Text([0xe2, 0x98])).toContain('\uFFFD');
  });
});

describe('refusing a tag that is not ours', () => {
  it('refuses another app\u2019s record by its type, without reading it', () => {
    const outcome = fromTagRecord({ mimeType: 'text/plain', bytes: utf8Bytes('hello') });

    expect(outcome).toEqual({ ok: false, reason: 'not-a-field-kit-report' });
  });

  it('refuses our own record when the JSON inside is not a handover', () => {
    const outcome = fromTagRecord({
      mimeType: TAG_MIME_TYPE,
      bytes: utf8Bytes('{"hello":"world"}'),
    });

    expect(outcome).toEqual({ ok: false, reason: 'not-a-field-kit-report' });
  });

  it('refuses an empty tag', () => {
    expect(fromTagRecord({ mimeType: TAG_MIME_TYPE, bytes: [] })).toEqual({
      ok: false,
      reason: 'not-a-field-kit-report',
    });
  });

  it('accepts a MIME type that differs only in case', () => {
    const record = toTagRecord(PAYLOAD);

    expect(fromTagRecord({ ...record, mimeType: record.mimeType.toUpperCase() }).ok).toBe(true);
  });
});

describe('whether it fits', () => {
  it('compares the report against the tag', () => {
    const size = tagSizeOf(PAYLOAD);

    expect(fitsOnTag(size, size)).toBe(true);
    expect(fitsOnTag(size, size - 1)).toBe(false);
    expect(fitsOnTag(size, 48)).toBe(false);
  });

  it('writes to a tag that does not report its capacity, rather than refusing it', () => {
    // Refusing on a missing number would refuse tags that are perfectly capable.
    expect(fitsOnTag(10_000, undefined)).toBe(true);
  });

  it('measures the same bytes the tag would hold', () => {
    expect(tagSizeOf(PAYLOAD)).toBe(toTagRecord(PAYLOAD).bytes.length);
  });
});

describe('what every failure says', () => {
  it('has words for each way a tag can fail, because they are not the same thing', () => {
    const failures: TagFailure[] = [
      'nfc-unavailable',
      'no-tag',
      'unreadable',
      'read-only',
      'too-small',
      'not-a-field-kit-report',
    ];

    for (const failure of failures) {
      expect(TAG_FAILURE_TEXT[failure]).toBeTruthy();
    }
  });

  it('promises nothing was changed when a write failed', () => {
    // The one thing somebody needs to know after a failed write is whether their tag is intact.
    for (const failure of [
      'no-tag',
      'unreadable',
      'too-small',
      'not-a-field-kit-report',
    ] as const) {
      expect(TAG_FAILURE_TEXT[failure]).toMatch(/nothing was changed|left alone/i);
    }
  });
});

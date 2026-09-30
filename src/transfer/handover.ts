/**
 * The handover payload: what leaves the phone, and what a scanned code is allowed to mean.
 *
 * Pure, and deliberately the whole of the transfer logic — the screens only render what this decides.
 * Two constraints shape it.
 *
 * **A code has a size.** A version-40 QR holds about 2.9 KB and is 177 modules across, which is hard
 * to scan off a phone screen held at arm's length. So the payload carries the **ETHANE** answers,
 * the position and the times — what a control room or a second crew needs first — and a responder's
 * fuller capture travels as text through the share sheet instead. Past the budget below there is no
 * code at all rather than an unreadable one.
 *
 * **A scanned code is untrusted input from another device.** The stores in this app degrade to empty
 * when their own data is unreadable, because losing a screen is worse; a *foreign* payload is the
 * other case, like `aed/geojson.ts` and `aed/overpass.ts`, which refuse rather than fail soft. So a
 * scan is answered with a reason, never with a half-read report.
 */

import type { Coordinates } from '@/aed';
import type { Depth } from '@/capture/depth';
import { findCaptureField } from '@/capture/forms';
import { recordedFrom, type RecordedLocation } from '@/incident/recorded-location';
import type { Observation, ObservationValue, Report } from '@/report/report';

/** Marks a payload as ours, so another app's code is refused by name. */
export const HANDOVER_FORMAT = 'field-kit/handover';
export const HANDOVER_VERSION = 1;

/**
 * The most a code may carry.
 *
 * A round number rather than a discovered one: it keeps the code near version 22 instead of 40, so it
 * stays comfortably scannable, and it makes "does this fit" a testable function rather than a hope.
 * How small it *needs* to be for a reliable scan at arm's length has not been measured — see the plan.
 */
export const HANDOVER_MAX_BYTES = 1_024;

/**
 * The form whose answers go in a code.
 *
 * ETHANE is the **scene** report — location, hazards, access, casualty numbers — which is what a code
 * passed between devices is for. SAMPLER, ABCDE and ASHICE are the fuller patient capture and travel
 * as text instead.
 */
export const COMPACT_FORM_ID = 'ethane';

export type HandoverLocation = {
  latitude: number;
  longitude: number;
  /** ISO-8601: when the position was taken, never when it was sent. */
  sampledAt: string;
  /** The what3words location resolved at the time, when there was one. */
  words?: string;
};

export type HandoverAnswer = { fieldId: string; value: ObservationValue };

export type HandoverPayload = {
  format: typeof HANDOVER_FORMAT;
  version: number;
  depth: Depth;
  /** When the report was started. Equal to `sentAt` for a Guided report, which is not stored. */
  openedAt: string;
  /** When this code was produced. */
  sentAt: string;
  location?: HandoverLocation;
  /** The ETHANE answers that were actually answered, and nothing else. */
  answers: HandoverAnswer[];
  /** A Guided report's single free-text answer, where there are no mnemonics. */
  note?: string;
};

/** What a screen has to offer before the payload is decided. */
export type HandoverDraft = {
  depth: Depth;
  openedAt?: string;
  sentAt: string;
  location?: RecordedLocation;
  observations: readonly Observation[];
  note?: string;
};

export function responderDraft(report: Report, sentAt: string): HandoverDraft {
  return {
    depth: 'responder',
    openedAt: report.openedAt,
    sentAt,
    location: report.location,
    observations: report.observations,
  };
}

export function guidedDraft({
  note,
  location,
  sentAt,
}: {
  note: string;
  location?: RecordedLocation;
  sentAt: string;
}): HandoverDraft {
  return { depth: 'guided', sentAt, location, observations: [], note };
}

function locationFrom(location: RecordedLocation | undefined): HandoverLocation | undefined {
  if (!location) return undefined;

  return {
    latitude: location.coordinates.latitude,
    longitude: location.coordinates.longitude,
    sampledAt: location.sampledAt,
    ...(location.words === undefined ? {} : { words: location.words }),
  };
}

/**
 * The payload that goes in a code.
 *
 * Only answered fields, so an untouched form contributes nothing, and only the compact form's fields,
 * so a full capture cannot push the code past what a phone can show.
 */
export function compactHandover(draft: HandoverDraft): HandoverPayload {
  const answers = draft.observations
    .filter((observation) => observation.formId === COMPACT_FORM_ID)
    // A cleared field is not an answer, and an empty string in a payload is a field a reader has to
    // work out the meaning of.
    .filter(
      (observation) => !(typeof observation.value === 'string' && observation.value.trim() === ''),
    )
    .map((observation) => ({ fieldId: observation.fieldId, value: observation.value }));

  const note = draft.note?.trim();
  const location = locationFrom(draft.location);

  return {
    format: HANDOVER_FORMAT,
    version: HANDOVER_VERSION,
    depth: draft.depth,
    openedAt: draft.openedAt ?? draft.sentAt,
    sentAt: draft.sentAt,
    ...(location === undefined ? {} : { location }),
    answers,
    ...(note === undefined || note === '' ? {} : { note }),
  };
}

export function serialiseHandover(payload: HandoverPayload): string {
  // No whitespace: every byte is a module in the code.
  return JSON.stringify(payload);
}

export type HandoverRefusal =
  /** Not a Field Kit report at all — another app's code, or a QR pointing at a website. */
  | 'not-a-field-kit-report'
  /** Made by a newer Field Kit, which may mean things this one does not understand. */
  | 'newer-version'
  /** Not readable as a handover in this version's shape. */
  | 'unreadable'
  /** The shape was right, but the position in it is not a real place. */
  | 'implausible-location';

export type ParsedHandover =
  { ok: true; payload: HandoverPayload } | { ok: false; reason: HandoverRefusal };

/**
 * One sentence per refusal, because a screen showing a code that will not work has to say *why*.
 *
 * The four are genuinely different situations for the person holding the phone: somebody else's
 * poster, an app that needs updating, a report that arrived damaged, and one carrying a position
 * that is not a place.
 */
export const REFUSAL_TEXT: Record<HandoverRefusal, string> = {
  'not-a-field-kit-report':
    'That code is not a Field Kit report. It may belong to another app, or point at a website.',
  'newer-version':
    'That report was made by a newer Field Kit. This version may not understand it, so it has not been shown — updating the app should fix it.',
  unreadable:
    'That is a Field Kit code, but this version cannot read it. It may have been damaged on the way.',
  'implausible-location':
    'That report carries a position which is not a real place, so it was not shown.',
};

function isPlausibleCoordinates(value: unknown): value is Coordinates {
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as Partial<Coordinates>;
  return (
    typeof candidate.latitude === 'number' &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    Number.isFinite(candidate.longitude) &&
    Math.abs(candidate.latitude) <= 90 &&
    Math.abs(candidate.longitude) <= 180
  );
}

function isAnswer(value: unknown): value is HandoverAnswer {
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as Partial<HandoverAnswer>;
  const kind = typeof candidate.value;
  return (
    typeof candidate.fieldId === 'string' &&
    candidate.fieldId !== '' &&
    (kind === 'string' || kind === 'number' || kind === 'boolean')
  );
}

function readLocation(value: unknown): HandoverLocation | undefined | false {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as Partial<HandoverLocation>;
  if (!isPlausibleCoordinates({ latitude: candidate.latitude, longitude: candidate.longitude })) {
    return false;
  }
  if (typeof candidate.sampledAt !== 'string' || candidate.sampledAt === '') return false;
  if (candidate.words !== undefined && typeof candidate.words !== 'string') return false;

  return {
    latitude: candidate.latitude as number,
    longitude: candidate.longitude as number,
    sampledAt: candidate.sampledAt,
    ...(candidate.words === undefined ? {} : { words: candidate.words }),
  };
}

/**
 * Read a scanned code.
 *
 * Returns a reason rather than throwing, unlike the extract parsers, because a scan screen has to say
 * *what* was wrong — "that is not a Field Kit report" and "that was made by a newer version" are
 * different sentences to a user standing in front of a code that will not work.
 */
export function parseHandover(raw: string): ParsedHandover {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'not-a-field-kit-report' };
  }

  if (parsed === null || typeof parsed !== 'object') {
    return { ok: false, reason: 'not-a-field-kit-report' };
  }

  const candidate = parsed as Partial<HandoverPayload>;
  if (candidate.format !== HANDOVER_FORMAT) return { ok: false, reason: 'not-a-field-kit-report' };

  if (typeof candidate.version !== 'number' || !Number.isInteger(candidate.version)) {
    return { ok: false, reason: 'unreadable' };
  }
  if (candidate.version > HANDOVER_VERSION) return { ok: false, reason: 'newer-version' };
  if (candidate.version !== HANDOVER_VERSION) return { ok: false, reason: 'unreadable' };

  if (candidate.depth !== 'guided' && candidate.depth !== 'responder') {
    return { ok: false, reason: 'unreadable' };
  }
  if (typeof candidate.openedAt !== 'string' || typeof candidate.sentAt !== 'string') {
    return { ok: false, reason: 'unreadable' };
  }
  if (!Array.isArray(candidate.answers) || !candidate.answers.every(isAnswer)) {
    return { ok: false, reason: 'unreadable' };
  }
  if (candidate.note !== undefined && typeof candidate.note !== 'string') {
    return { ok: false, reason: 'unreadable' };
  }

  const location = readLocation(candidate.location);
  if (location === false) return { ok: false, reason: 'implausible-location' };

  return {
    ok: true,
    payload: {
      format: HANDOVER_FORMAT,
      version: HANDOVER_VERSION,
      depth: candidate.depth,
      openedAt: candidate.openedAt,
      sentAt: candidate.sentAt,
      ...(location === undefined ? {} : { location }),
      answers: candidate.answers,
      ...(candidate.note === undefined ? {} : { note: candidate.note }),
    },
  };
}

/**
 * A received position, as a **recorded** one.
 *
 * The type is the point. §4.1 rule 1 says a position taken earlier must never be shown as where
 * somebody is now, and a code from another phone is by definition an earlier position. Building it
 * with `recordedFrom` means it cannot be handed to a current-position slot — the compiler refuses.
 */
export function receivedLocation(payload: HandoverPayload): RecordedLocation | undefined {
  if (!payload.location) return undefined;

  return recordedFrom(
    { latitude: payload.location.latitude, longitude: payload.location.longitude },
    payload.location.sampledAt,
    payload.location.words,
  );
}

function renderedAnswer(answer: HandoverAnswer): { label: string; value: string } {
  const field = findCaptureField(answer.fieldId);
  const label = field?.label ?? answer.fieldId;

  if (typeof answer.value === 'boolean') return { label, value: answer.value ? 'Yes' : 'No' };
  if (typeof answer.value === 'number') {
    return { label, value: field?.unit ? `${answer.value} ${field.unit}` : String(answer.value) };
  }

  return { label, value: answer.value };
}

/**
 * The report as lines a person reads.
 *
 * Shared between the text rendering below and the screen, so a label is written in one place. Every
 * position is written with the time it was taken and never as "current" or "now": the reader is a
 * person about to act on it.
 */
export function handoverLines(payload: HandoverPayload): string[] {
  const lines: string[] = [];

  if (payload.location) {
    const { latitude, longitude, sampledAt, words } = payload.location;
    lines.push(`Where: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    lines.push(`Position recorded: ${sampledAt}`);
    if (words) lines.push(`what3words: ${words}`);
  } else {
    lines.push('Where: no position was recorded');
  }
  lines.push(`Sent: ${payload.sentAt}`);

  if (payload.answers.length > 0) {
    lines.push('');
    for (const answer of payload.answers) {
      const { label, value } = renderedAnswer(answer);
      lines.push(`${label}: ${value}`);
    }
  }

  if (payload.note) {
    lines.push('');
    lines.push(payload.note);
  }

  return lines;
}

/** A scene report or a short one, named as what it is. */
export function handoverTitle(payload: HandoverPayload): string {
  return payload.depth === 'guided'
    ? 'Field Kit report — where I am and what has happened'
    : 'Field Kit report — the scene';
}

/**
 * The payload as text — what the share sheet sends, and what a code too large to draw falls back to.
 */
export function describeHandover(payload: HandoverPayload): string {
  return [
    handoverTitle(payload),
    '',
    ...handoverLines(payload),
    '',
    'Field Kit records what someone observed. It does not diagnose or advise.',
  ].join('\n');
}

/**
 * UTF-8 length without `TextEncoder`, which is not guaranteed on every engine this runs on.
 *
 * It matters because the payload is bytes in a code, and a Welsh place name or an accent costs two.
 */
export function utf8Length(text: string): number {
  let bytes = 0;

  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }

  return bytes;
}

/** Whether this payload can be drawn as one code, or has to travel as text. */
export function fitsInCode(serialised: string): boolean {
  return utf8Length(serialised) <= HANDOVER_MAX_BYTES;
}

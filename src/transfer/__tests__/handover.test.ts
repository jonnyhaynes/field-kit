import { describe, expect, it } from '@jest/globals';

import { describeCurrentPosition, recordedFrom } from '@/incident/recorded-location';
import { openReport, recordObservation, type Observation, type Report } from '@/report/report';

import {
  compactHandover,
  describeHandover,
  fitsInCode,
  guidedDraft,
  HANDOVER_FORMAT,
  HANDOVER_MAX_BYTES,
  HANDOVER_VERSION,
  parseHandover,
  REFUSAL_TEXT,
  receivedLocation,
  responderDraft,
  serialiseHandover,
  utf8Length,
  type HandoverPayload,
  type HandoverRefusal,
} from '../handover';

const OPENED_AT = '2026-09-30T14:55:00.000Z';
const SAMPLED_AT = '2026-09-30T14:59:00.000Z';
const SENT_AT = '2026-09-30T15:02:00.000Z';

const LOCATION = recordedFrom({ latitude: 54.4287, longitude: -2.9613 }, SAMPLED_AT);

function observation(formId: string, fieldId: string, value: Observation['value']): Observation {
  return { formId, fieldId, value, recordedAt: SAMPLED_AT };
}

/** A report with answers across all four forms, so the subset has something to exclude. */
function report(): Report {
  let current = openReport('report-1', OPENED_AT, LOCATION);

  for (const entry of [
    observation('ethane', 'ethane.incidentType', 'Fell walker, suspected ankle injury'),
    observation('ethane', 'ethane.hazards', 'Steep ground, fading light'),
    observation('ethane', 'ethane.casualties', 1),
    observation('abcde', 'abcde.pulseRate', 84),
    observation('abcde', 'abcde.consciousness', 'Alert'),
    observation('sampler', 'sampler.allergies', 'Penicillin'),
    observation('ashice', 'ashice.age', 41),
  ]) {
    current = recordObservation(current, entry);
  }

  return current;
}

function payload(overrides: Partial<HandoverPayload> = {}): HandoverPayload {
  return {
    format: HANDOVER_FORMAT,
    version: HANDOVER_VERSION,
    depth: 'responder',
    openedAt: OPENED_AT,
    sentAt: SENT_AT,
    location: { latitude: 54.4287, longitude: -2.9613, sampledAt: SAMPLED_AT },
    answers: [{ fieldId: 'ethane.incidentType', value: 'Fell walker' }],
    ...overrides,
  };
}

describe('the compact payload', () => {
  it('carries the ETHANE answers and nothing from the other forms', () => {
    const compact = compactHandover(responderDraft(report(), SENT_AT));

    expect(compact.answers.map((answer) => answer.fieldId)).toEqual([
      'ethane.incidentType',
      'ethane.hazards',
      'ethane.casualties',
    ]);
    // A full capture would not fit a code, and is what the share sheet is for.
    expect(JSON.stringify(compact)).not.toContain('abcde');
    expect(JSON.stringify(compact)).not.toContain('sampler');
    expect(JSON.stringify(compact)).not.toContain('ashice');
  });

  it('keeps the position with the time it was taken', () => {
    const compact = compactHandover(responderDraft(report(), SENT_AT));

    expect(compact.location).toEqual({
      latitude: 54.4287,
      longitude: -2.9613,
      sampledAt: SAMPLED_AT,
    });
    expect(compact.openedAt).toBe(OPENED_AT);
    expect(compact.sentAt).toBe(SENT_AT);
  });

  it('carries a what3words location when the report has one', () => {
    // The decision the issue required before building: a report may carry both.
    const withWords = openReport(
      'report-2',
      OPENED_AT,
      recordedFrom(LOCATION.coordinates, SAMPLED_AT, 'filled.count.soap'),
    );
    const compact = compactHandover(responderDraft(withWords, SENT_AT));

    expect(compact.location?.words).toBe('filled.count.soap');
    expect(compact.location?.latitude).toBe(54.4287);
  });

  it('omits answers that are empty, and a note that is only whitespace', () => {
    let current = openReport('report-3', OPENED_AT);
    current = recordObservation(current, observation('ethane', 'ethane.hazards', '   '));
    current = recordObservation(current, observation('ethane', 'ethane.incidentType', 'Fall'));

    const compact = compactHandover(responderDraft(current, SENT_AT));

    expect(compact.answers).toEqual([{ fieldId: 'ethane.incidentType', value: 'Fall' }]);
    expect(
      compactHandover({ ...responderDraft(current, SENT_AT), note: '  ' }).note,
    ).toBeUndefined();
  });

  it('reports no position rather than an absent one, when there is none', () => {
    const compact = compactHandover(responderDraft(openReport('report-4', OPENED_AT), SENT_AT));

    expect(compact.location).toBeUndefined();
    expect('location' in compact).toBe(false);
    expect(compact.openedAt).toBe(OPENED_AT);
  });

  it('starts a Guided report at the moment it is sent', () => {
    const compact = compactHandover(
      guidedDraft({ note: 'Walked into a gate, cut leg', sentAt: SENT_AT }),
    );

    expect(compact.depth).toBe('guided');
    expect(compact.answers).toEqual([]);
    expect(compact.note).toBe('Walked into a gate, cut leg');
    expect(compact.openedAt).toBe(SENT_AT);
  });
});

describe('a payload through a code', () => {
  it('round-trips unchanged, including the note and the three words', () => {
    const original = payload({
      answers: [
        { fieldId: 'ethane.incidentType', value: 'Fall' },
        { fieldId: 'ethane.casualties', value: 2 },
        { fieldId: 'ethane.hazards', value: 'Ice & loose rock' },
      ],
      location: {
        latitude: 54.4287,
        longitude: -2.9613,
        sampledAt: SAMPLED_AT,
        words: 'filled.count.soap',
      },
      note: 'Second casualty is walking',
    });

    expect(parseHandover(serialiseHandover(original))).toEqual({ ok: true, payload: original });
  });

  it('still round-trips when it is too big to draw', () => {
    // The issue's overflow case: the code is dropped, but nothing about the payload is.
    const overflowing = payload({ note: 'x'.repeat(HANDOVER_MAX_BYTES) });
    const serialised = serialiseHandover(overflowing);

    expect(fitsInCode(serialised)).toBe(false);
    expect(parseHandover(serialised)).toEqual({ ok: true, payload: overflowing });
    expect(describeHandover(overflowing)).toContain('x'.repeat(HANDOVER_MAX_BYTES));
  });

  it('writes no whitespace, so no byte is wasted', () => {
    expect(serialiseHandover(payload())).not.toMatch(/\n|\s"/);
  });
});

describe('refusing a code that is not ours', () => {
  it.each([
    ['not JSON at all', 'https://example.com'],
    ['JSON that is not an object', '[1,2,3]'],
    ['JSON with no marker', '{"hello":"world"}'],
    ['a different app’s marker', '{"format":"other/thing","version":1}'],
  ])('refuses %s as not a Field Kit report', (_label, raw) => {
    expect(parseHandover(raw)).toEqual({ ok: false, reason: 'not-a-field-kit-report' });
  });

  it('refuses a newer version by name, rather than guessing', () => {
    const raw = JSON.stringify({ ...payload(), version: HANDOVER_VERSION + 1 });
    expect(parseHandover(raw)).toEqual({ ok: false, reason: 'newer-version' });
  });

  it.each([
    ['a version that is not a whole number', { version: 'one' }],
    ['a version below this one', { version: 0 }],
    ['an unknown depth', { depth: 'clinical' }],
    ['a missing openedAt', { openedAt: undefined }],
    ['answers that are not a list', { answers: 'none' }],
    ['an answer with no field id', { answers: [{ value: 3 }] }],
    [
      'an answer with an object value',
      { answers: [{ fieldId: 'ethane.hazards', value: { a: 1 } }] },
    ],
    ['a note that is not text', { note: 12 }],
  ])('refuses %s as unreadable', (_label, override) => {
    const raw = JSON.stringify({ ...payload(), ...override });
    expect(parseHandover(raw)).toEqual({ ok: false, reason: 'unreadable' });
  });

  it.each([
    ['a latitude that is not on Earth', { latitude: 91, longitude: 0, sampledAt: SAMPLED_AT }],
    ['a longitude that is not on Earth', { latitude: 0, longitude: 181, sampledAt: SAMPLED_AT }],
    ['a position with no sample time', { latitude: 54.4, longitude: -2.9 }],
    [
      'a position that is not a pair of numbers',
      { latitude: 'up', longitude: -2.9, sampledAt: SAMPLED_AT },
    ],
    ['a location that is not an object', 'somewhere'],
  ])('refuses %s as an implausible location', (_label, location) => {
    const raw = JSON.stringify({ ...payload(), location });
    expect(parseHandover(raw)).toEqual({ ok: false, reason: 'implausible-location' });
  });

  it('never half-reads: a refusal carries no payload', () => {
    const refused = parseHandover('{"format":"field-kit/handover","version":1}');

    expect(refused.ok).toBe(false);
    expect(refused).not.toHaveProperty('payload');
  });
});

describe('a received position', () => {
  it('comes back as a recorded location, with the time it was taken', () => {
    const received = receivedLocation(payload());

    expect(received).toEqual({
      kind: 'recorded',
      coordinates: { latitude: 54.4287, longitude: -2.9613 },
      sampledAt: SAMPLED_AT,
      words: undefined,
    });
  });

  it('keeps the three words alongside the coordinates, as the payload does', () => {
    const received = receivedLocation(
      payload({
        location: { latitude: 54.4287, longitude: -2.9613, sampledAt: SAMPLED_AT, words: 'a.b.c' },
      }),
    );

    expect(received?.words).toBe('a.b.c');
  });

  it('is nothing when the payload carried no position', () => {
    expect(receivedLocation(payload({ location: undefined }))).toBeUndefined();
  });

  /**
   * The rule this whole app is built around: a position taken earlier is not where somebody is now.
   * The compiler enforces it — delete this annotation and widening the types breaks CI.
   */
  it('cannot be rendered as a current position, because the type says so', () => {
    const received = receivedLocation(payload());
    expect(received).toBeDefined();

    // @ts-expect-error a received position is recorded, never current
    expect(describeCurrentPosition(received)).toEqual(['54.42870', '-2.96130']);
  });
});

describe('the payload as text', () => {
  it('reads out the answers with their labels, and the position with its time', () => {
    const text = describeHandover(
      payload({
        answers: [
          { fieldId: 'ethane.incidentType', value: 'Fall' },
          { fieldId: 'ethane.casualties', value: 2 },
          { fieldId: 'ethane.servicesNeeded', value: 'Ambulance' },
        ],
        location: {
          latitude: 54.4287,
          longitude: -2.9613,
          sampledAt: SAMPLED_AT,
          words: 'filled.count.soap',
        },
      }),
    );

    expect(text).toContain('Type of incident: Fall');
    expect(text).toContain('Number of casualties: 2 casualties');
    expect(text).toContain('Which emergency services are needed: Ambulance');
    expect(text).toContain('54.42870, -2.96130');
    expect(text).toContain(`Position recorded: ${SAMPLED_AT}`);
    expect(text).toContain('what3words: filled.count.soap');
  });

  it('says a position was recorded, and never that it is current', () => {
    const text = describeHandover(payload());

    // §4.1 rule 1, in the words a reader actually sees.
    expect(text).not.toMatch(/\bcurrent\b/i);
    expect(text).not.toMatch(/\byou are\b/i);
  });

  it('writes booleans as words rather than true and false', () => {
    const text = describeHandover(
      payload({ answers: [{ fieldId: 'abcde.bleeding', value: false }] }),
    );

    expect(text).toContain('Bleeding you can see: No');
    expect(text).not.toContain('false');
  });

  it('says so when there is no position, rather than leaving a blank', () => {
    expect(describeHandover(payload({ location: undefined }))).toContain(
      'no position was recorded',
    );
  });

  it('carries a Guided note, and names itself the short report', () => {
    const text = describeHandover(
      compactHandover(guidedDraft({ note: 'Cut my hand on a gate', sentAt: SENT_AT })),
    );

    expect(text).toContain('where I am and what has happened');
    expect(text).toContain('Cut my hand on a gate');
  });

  it('says it is a record of observations, not advice', () => {
    expect(describeHandover(payload())).toContain('does not diagnose or advise');
  });
});

describe('whether it fits in a code', () => {
  it('fits a realistic scene report comfortably', () => {
    expect(fitsInCode(serialiseHandover(compactHandover(responderDraft(report(), SENT_AT))))).toBe(
      true,
    );
  });

  it('draws the line at the budget, not near it', () => {
    expect(fitsInCode('x'.repeat(HANDOVER_MAX_BYTES))).toBe(true);
    expect(fitsInCode('x'.repeat(HANDOVER_MAX_BYTES + 1))).toBe(false);
  });

  it('counts bytes rather than characters, because a code holds bytes', () => {
    // A Welsh place name or an accent costs two bytes; an emoji costs four.
    expect(utf8Length('Llanfairpwll')).toBe(12);
    expect(utf8Length('â')).toBe(2);
    expect(utf8Length('☂')).toBe(3);
    expect(utf8Length('🌧')).toBe(4);
    expect(utf8Length('')).toBe(0);
  });

  it('refuses a code for a report whose prose is too long, however much it holds', () => {
    const essay = payload({ note: 'â'.repeat(HANDOVER_MAX_BYTES) });

    expect(fitsInCode(serialiseHandover(essay))).toBe(false);
  });
});

describe('what a refusal says', () => {
  it('has something to say for every way a code can be refused', () => {
    const refusals = [
      parseHandover('nonsense'),
      parseHandover(JSON.stringify({ ...payload(), version: 99 })),
      parseHandover(JSON.stringify({ ...payload(), depth: 'other' })),
      parseHandover(
        JSON.stringify({
          ...payload(),
          location: { latitude: 91, longitude: 0, sampledAt: SAMPLED_AT },
        }),
      ),
    ].filter((result): result is { ok: false; reason: HandoverRefusal } => !result.ok);

    // All four reasons, each with words a person can act on rather than a code.
    expect(new Set(refusals.map((result) => result.reason))).toEqual(
      new Set<HandoverRefusal>([
        'not-a-field-kit-report',
        'newer-version',
        'unreadable',
        'implausible-location',
      ]),
    );
    for (const refusal of refusals) {
      expect(REFUSAL_TEXT[refusal.reason]).toBeTruthy();
    }
  });
});

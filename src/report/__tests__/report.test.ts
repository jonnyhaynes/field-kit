import { describe, expect, it } from '@jest/globals';

import { recordedFrom } from '@/incident/recorded-location';

import {
  answeredCount,
  isAnswered,
  observationFor,
  openReport,
  parseReports,
  recordObservation,
  serialiseReports,
  type Observation,
} from '../report';

const SAMPLED_AT = '2026-09-30T12:00:00.000Z';

const observation = (fieldId: string, value: Observation['value']): Observation => ({
  formId: 'abcde',
  fieldId,
  value,
  recordedAt: SAMPLED_AT,
});

describe('a new report', () => {
  it('starts empty, with a place for a location', () => {
    const location = recordedFrom({ latitude: 51.5074, longitude: -0.1278 }, SAMPLED_AT);
    expect(openReport('r1', SAMPLED_AT, location)).toEqual({
      id: 'r1',
      openedAt: SAMPLED_AT,
      location,
      observations: [],
    });
  });

  it('is valid without a location, because a position may not have been taken yet', () => {
    expect(openReport('r1', SAMPLED_AT).location).toBeUndefined();
  });
});

describe('recording observations', () => {
  it('records one with the time it was taken', () => {
    const report = recordObservation(
      openReport('r1', SAMPLED_AT),
      observation('abcde.pulseRate', 72),
    );

    expect(observationFor(report, 'abcde.pulseRate')).toEqual(observation('abcde.pulseRate', 72));
  });

  it('replaces an earlier answer rather than contradicting it', () => {
    const first = recordObservation(
      openReport('r1', SAMPLED_AT),
      observation('abcde.pulseRate', 72),
    );
    const corrected = recordObservation(first, observation('abcde.pulseRate', 88));

    expect(corrected.observations).toHaveLength(1);
    expect(observationFor(corrected, 'abcde.pulseRate')?.value).toBe(88);
  });

  it('keeps answers to different fields apart', () => {
    const report = recordObservation(
      recordObservation(openReport('r1', SAMPLED_AT), observation('abcde.pulseRate', 72)),
      observation('abcde.breathingRate', 16),
    );

    expect(report.observations).toHaveLength(2);
  });

  it('does not mutate the report it was given', () => {
    const before = openReport('r1', SAMPLED_AT);
    recordObservation(before, observation('abcde.pulseRate', 72));
    expect(before.observations).toEqual([]);
  });
});

describe('isAnswered', () => {
  it('is false for a field nobody has touched', () => {
    expect(isAnswered(openReport('r1', SAMPLED_AT), 'abcde.pulseRate')).toBe(false);
  });

  it.each([
    ['an empty string', ''],
    ['only whitespace', '   '],
  ])('treats %s as not answered', (_label, value) => {
    const report = recordObservation(
      openReport('r1', SAMPLED_AT),
      observation('abcde.injuries', value),
    );
    expect(isAnswered(report, 'abcde.injuries')).toBe(false);
  });

  it.each([
    ['a number', 72],
    ['zero', 0],
    ['false', false],
    ['text', 'Cool and clammy'],
  ])('treats %s as an answer', (_label, value) => {
    // Zero and false are answers: a breathing rate of 0 and "no bleeding" are observations.
    const report = recordObservation(
      openReport('r1', SAMPLED_AT),
      observation('abcde.pulseRate', value),
    );
    expect(isAnswered(report, 'abcde.pulseRate')).toBe(true);
  });

  it('counts how much of a form is filled in', () => {
    const report = recordObservation(
      openReport('r1', SAMPLED_AT),
      observation('abcde.pulseRate', 72),
    );
    expect(answeredCount(report, ['abcde.pulseRate', 'abcde.breathingRate', 'abcde.pupils'])).toBe(
      1,
    );
  });
});

describe('serialisation', () => {
  it('round-trips a report, including its location', () => {
    const location = recordedFrom({ latitude: 51.5074, longitude: -0.1278 }, SAMPLED_AT);
    const report = recordObservation(
      openReport('r1', SAMPLED_AT, location),
      observation('abcde.pulseRate', 72),
    );

    expect(parseReports(serialiseReports([report]))).toEqual([report]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['nothing parseable', 'not json'],
    ['valid JSON that is not an array', '{"a":1}'],
  ])('returns an empty list for %s', (_label, raw) => {
    expect(parseReports(raw)).toEqual([]);
  });

  it('drops unusable reports rather than the whole file', () => {
    const raw = JSON.stringify([
      openReport('good', SAMPLED_AT),
      { id: 'no-observations-array', openedAt: SAMPLED_AT },
      { id: 'bad-observation', openedAt: SAMPLED_AT, observations: [{ fieldId: 42 }] },
    ]);

    expect(parseReports(raw).map((report) => report.id)).toEqual(['good']);
  });
});

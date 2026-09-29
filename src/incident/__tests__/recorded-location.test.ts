import { describe, expect, it } from '@jest/globals';

import {
  assertCurrent,
  currentFrom,
  describeCurrentPosition,
  isCurrent,
  recordedFrom,
  StalePositionError,
} from '../recorded-location';

const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const SAMPLED_AT = '2026-09-29T18:00:00.000Z';

describe('the two kinds of position', () => {
  it('are distinguishable', () => {
    expect(isCurrent(currentFrom(LONDON))).toBe(true);
    expect(isCurrent(recordedFrom(LONDON, SAMPLED_AT))).toBe(false);
  });

  it('gives a recorded location a sample time and an optional location', () => {
    expect(recordedFrom(LONDON, SAMPLED_AT, 'filled.count.soap')).toEqual({
      kind: 'recorded',
      coordinates: LONDON,
      sampledAt: SAMPLED_AT,
      words: 'filled.count.soap',
    });
  });
});

describe('the stale-position guard', () => {
  it('refuses to let a recorded location into a current-position slot', () => {
    const recorded = recordedFrom(LONDON, SAMPLED_AT);

    // The rule lives in the type, not in a runtime check: a RecordedLocation is not assignable to
    // the parameter. Delete the `@ts-expect-error` and widen the type, and this annotation becomes
    // unused, so `tsc --noEmit` fails in CI rather than a reviewer having to notice.
    // @ts-expect-error a recorded location must never be rendered as the current position
    const lines = describeCurrentPosition(recorded);

    // Runtime is lenient here on purpose — the compiler is what enforces the rule. This assertion
    // documents that, so nobody mistakes the type check for a runtime one.
    expect(lines).toHaveLength(2);
  });

  it('rejects a recorded location passed to assertCurrent', () => {
    expect(() => assertCurrent(recordedFrom(LONDON, SAMPLED_AT))).toThrow(StalePositionError);
  });

  it('names when the stale position was taken', () => {
    expect(() => assertCurrent(recordedFrom(LONDON, SAMPLED_AT))).toThrow(/2026-09-29/);
  });

  it('accepts a current position', () => {
    expect(assertCurrent(currentFrom(LONDON))).toEqual({ kind: 'current', coordinates: LONDON });
  });
});

describe('assertCurrent on values that came from storage', () => {
  it.each([
    ['coordinates that are missing', { kind: 'current' }],
    [
      'coordinates that are not numbers',
      { kind: 'current', coordinates: { latitude: '51.5', longitude: 0 } },
    ],
    [
      'a latitude that is not real',
      { kind: 'current', coordinates: { latitude: Number.NaN, longitude: 0 } },
    ],
    ['a latitude off the planet', { kind: 'current', coordinates: { latitude: 91, longitude: 0 } }],
    [
      'a longitude off the planet',
      { kind: 'current', coordinates: { latitude: 0, longitude: 181 } },
    ],
  ])('throws on %s', (_label, value) => {
    // This is the shape JSON.parse hands back for corrupt local state.
    const fromStorage = JSON.parse(JSON.stringify(value));
    expect(() => assertCurrent(fromStorage)).toThrow(StalePositionError);
  });

  it('survives a JSON round trip when the data is good', () => {
    const fromStorage = JSON.parse(JSON.stringify(currentFrom(LONDON)));
    expect(assertCurrent(fromStorage)).toEqual({ kind: 'current', coordinates: LONDON });
  });
});

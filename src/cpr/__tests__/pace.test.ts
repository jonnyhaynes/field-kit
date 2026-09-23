import { describe, expect, it } from '@jest/globals';

import { beatIntervalMs, beatsPerMinute } from '../pace';

describe('beatIntervalMs', () => {
  it('converts a pace into a beat interval', () => {
    expect(beatIntervalMs(60)).toBe(1000);
    expect(beatIntervalMs(120)).toBe(500);
    expect(beatIntervalMs(110)).toBeCloseTo(545.45, 1);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a pace of %p rather than beating at a nonsense rate',
    (bpm) => {
      expect(() => beatIntervalMs(bpm)).toThrow(RangeError);
    },
  );
});

describe('beatsPerMinute', () => {
  it('round-trips a pace', () => {
    expect(beatsPerMinute(110)).toBe(110);
    expect(beatsPerMinute(120)).toBe(120);
  });
});

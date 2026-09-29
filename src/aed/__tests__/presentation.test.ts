import { describe, expect, it } from '@jest/globals';

import { describeVerification, formatDistance } from '../presentation';

describe('formatDistance', () => {
  it('rounds under a kilometre to the nearest ten metres', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(223)).toBe('220 m');
    expect(formatDistance(205)).toBe('210 m');
    expect(formatDistance(999)).toBe('1000 m');
  });

  it('switches to kilometres at a kilometre', () => {
    expect(formatDistance(1_000)).toBe('1.0 km');
    expect(formatDistance(1_449)).toBe('1.4 km');
    expect(formatDistance(22_357)).toBe('22.4 km');
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a distance of %p rather than showing nonsense',
    (meters) => {
      expect(() => formatDistance(meters)).toThrow(RangeError);
    },
  );
});

describe('describeVerification', () => {
  it('reports a checked position with its date', () => {
    expect(describeVerification({ status: 'verified', on: '2025-06-01' })).toBe(
      'Position checked 2025-06-01',
    );
  });

  it('says so plainly when a position has never been checked', () => {
    expect(describeVerification({ status: 'never-verified' })).toBe('Position never checked');
  });

  it('describes the mapping, never the defibrillator', () => {
    // A check_date says someone looked at the location once. It is not a claim that the box
    // is still there, so nothing here should read like one.
    const wording = describeVerification({ status: 'verified', on: '2025-06-01' }).toLowerCase();
    for (const forbidden of ['working', 'available', 'ready', 'present', 'accessible']) {
      expect(wording).not.toContain(forbidden);
    }
  });
});

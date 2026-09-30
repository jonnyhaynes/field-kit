import { describe, expect, it } from '@jest/globals';

import {
  cardinal,
  chooseCompassDisplay,
  initialBearing,
  MINIMUM_COURSE_SPEED_METRES_PER_SECOND,
  normaliseDegrees,
  relativeBearing,
  turnInstruction,
  type CourseReading,
  type HeadingReading,
} from '../heading';

const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const PARIS = { latitude: 48.8566, longitude: 2.3522 };

const heading = (over: Partial<HeadingReading> = {}): HeadingReading => ({
  magneticHeading: 100,
  accuracy: 3,
  ...over,
});

const moving: CourseReading = {
  degrees: 42,
  speedMetresPerSecond: MINIMUM_COURSE_SPEED_METRES_PER_SECOND,
};

describe('normaliseDegrees', () => {
  it.each([
    [0, 0],
    [359, 359],
    [360, 0],
    [450, 90],
    [-10, 350],
    [-370, 350],
  ])('takes %p to %p', (input, expected) => {
    expect(normaliseDegrees(input)).toBe(expected);
  });
});

describe('cardinal', () => {
  it.each([
    [0, 'N'],
    [45, 'NE'],
    [90, 'E'],
    [135, 'SE'],
    [180, 'S'],
    [225, 'SW'],
    [270, 'W'],
    [315, 'NW'],
    [359, 'N'],
  ])('calls %p %s', (degrees, expected) => {
    expect(cardinal(degrees)).toBe(expected);
  });
});

describe('initialBearing', () => {
  it.each([
    ['due north', { latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 }, 0],
    ['due east', { latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }, 90],
    ['due south', { latitude: 1, longitude: 0 }, { latitude: 0, longitude: 0 }, 180],
    ['due west', { latitude: 0, longitude: 1 }, { latitude: 0, longitude: 0 }, 270],
  ])('points %s', (_label, from, to, expected) => {
    expect(initialBearing(from, to)).toBeCloseTo(expected, 4);
  });

  it('sends you south-east from London to Paris', () => {
    const bearing = initialBearing(LONDON, PARIS);
    expect(bearing).toBeGreaterThan(145);
    expect(bearing).toBeLessThan(152);
  });

  it('reverses to roughly the opposite bearing, but not exactly', () => {
    // On a great circle the initial and final bearings differ, because the meridians converge, so
    // walking back is near — not equal to — the forward bearing plus a half turn.
    const out = initialBearing(LONDON, PARIS);
    const back = initialBearing(PARIS, LONDON);
    expect(normaliseDegrees(back - out)).toBeCloseTo(180, -1);
  });

  it('is exactly opposite along the equator, where the meridians are parallel', () => {
    const out = initialBearing({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    const back = initialBearing({ latitude: 0, longitude: 1 }, { latitude: 0, longitude: 0 });
    expect(normaliseDegrees(back - out)).toBe(180);
  });
});

describe('relativeBearing', () => {
  it('is zero when you face the target', () => {
    expect(relativeBearing(90, 90)).toBe(0);
  });

  it('measures to the right of where you face', () => {
    expect(relativeBearing(90, 0)).toBe(90);
  });

  it('wraps rather than going negative', () => {
    expect(relativeBearing(10, 350)).toBe(20);
    expect(relativeBearing(350, 10)).toBe(340);
  });
});

describe('turnInstruction', () => {
  it.each<[number, 'left' | 'right' | 'straight', number]>([
    [0, 'straight', 0],
    [4, 'straight', 0],
    [355, 'straight', 0],
    [90, 'right', 90],
    [180, 'right', 180],
    [270, 'left', 90],
  ])('for %p degrees says turn %s %p', (relative, direction, degrees) => {
    expect(turnInstruction(relative)).toEqual({ direction, degrees });
  });
});

describe('chooseCompassDisplay', () => {
  it('shows a true heading when the platform gives one', () => {
    expect(chooseCompassDisplay({ heading: heading({ trueHeading: 42 }) })).toEqual({
      kind: 'heading',
      degrees: 42,
      reference: 'true',
    });
  });

  it('falls back to magnetic and says so when the true heading is unavailable', () => {
    // Both platforms signal "cannot say" with a negative value.
    expect(
      chooseCompassDisplay({ heading: heading({ trueHeading: -1, magneticHeading: 137 }) }),
    ).toEqual({
      kind: 'heading',
      degrees: 137,
      reference: 'magnetic',
    });
  });

  it.each([0, 1])('refuses to show a bearing at accuracy %p', (accuracy) => {
    expect(
      chooseCompassDisplay({ heading: heading({ trueHeading: 42, accuracy: accuracy as 0 | 1 }) }),
    ).toEqual({
      kind: 'needs-calibration',
    });
  });

  it('still refuses a coarse heading even though true north is known', () => {
    // Accuracy is the total error, not the datum: knowing true north does not make a 40° error usable.
    expect(chooseCompassDisplay({ heading: heading({ accuracy: 1, trueHeading: 90 }) })).toEqual({
      kind: 'needs-calibration',
    });
  });

  it('accepts the coarsest reading it trusts', () => {
    expect(chooseCompassDisplay({ heading: heading({ accuracy: 2, trueHeading: 90 }) })).toEqual({
      kind: 'heading',
      degrees: 90,
      reference: 'true',
    });
  });

  it('uses a course when there is no magnetometer at all, as long as you are moving', () => {
    expect(chooseCompassDisplay({ course: moving })).toEqual({ kind: 'course', degrees: 42 });
  });

  it('refuses a course when you are standing still', () => {
    // Android reports 0 degrees - due north - for a stationary device, with no way to tell it apart
    // from genuinely facing north. This is the assertion that keeps that out of the app.
    const stopped = { degrees: 0, speedMetresPerSecond: 0.4 };
    expect(chooseCompassDisplay({ course: stopped })).toEqual({ kind: 'unsupported' });
  });

  it('prefers a moving course over an untrustworthy magnetometer', () => {
    expect(chooseCompassDisplay({ heading: heading({ accuracy: 0 }), course: moving })).toEqual({
      kind: 'course',
      degrees: 42,
    });
  });

  it('reports unsupported when there is neither a heading nor a usable course', () => {
    expect(chooseCompassDisplay({})).toEqual({ kind: 'unsupported' });
  });

  it.each([
    ['a negative course', { degrees: -1, speedMetresPerSecond: 5 }],
    ['a course that is not a number', { degrees: Number.NaN, speedMetresPerSecond: 5 }],
  ])('treats %s as no course', (_label, course) => {
    expect(chooseCompassDisplay({ course: course as CourseReading })).toEqual({
      kind: 'unsupported',
    });
  });

  it('never shows a heading when the magnetic reading is nonsense too', () => {
    expect(
      chooseCompassDisplay({ heading: heading({ magneticHeading: -1, trueHeading: -1 }) }),
    ).toEqual({
      kind: 'unsupported',
    });
  });
});

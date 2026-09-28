import { describe, expect, it } from '@jest/globals';

import {
  boundingBoxAround,
  EARTH_RADIUS_M,
  haversineMeters,
  isWithinBox,
  toRadians,
} from '../distance';

const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const PARIS = { latitude: 48.8566, longitude: 2.3522 };

/** Metres per degree, the same figure the box maths is built on. */
const METERS_PER_DEGREE = (Math.PI * EARTH_RADIUS_M) / 180;

describe('toRadians', () => {
  it('converts degrees', () => {
    expect(toRadians(0)).toBe(0);
    expect(toRadians(180)).toBeCloseTo(Math.PI, 12);
  });
});

describe('haversineMeters', () => {
  it('is zero for a point measured against itself', () => {
    expect(haversineMeters(LONDON, LONDON)).toBe(0);
  });

  it('is symmetric', () => {
    expect(haversineMeters(LONDON, PARIS)).toBeCloseTo(haversineMeters(PARIS, LONDON), 6);
  });

  it('matches a known one-degree span along a meridian', () => {
    const span = haversineMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(span).toBeCloseTo(METERS_PER_DEGREE, 2);
  });

  it('lands within a hundred metres of the known London-Paris distance', () => {
    expect(haversineMeters(LONDON, PARIS)).toBeCloseTo(343_556, -2);
  });
});

describe('boundingBoxAround', () => {
  it('contains the four cardinal points of its own radius', () => {
    const radius = 5_000;
    const box = boundingBoxAround(LONDON, radius);
    const latitudeDelta = radius / METERS_PER_DEGREE;
    const longitudeDelta = latitudeDelta / Math.cos(toRadians(LONDON.latitude));

    expect(
      isWithinBox({ latitude: LONDON.latitude + latitudeDelta, longitude: LONDON.longitude }, box),
    ).toBe(true);
    expect(
      isWithinBox({ latitude: LONDON.latitude - latitudeDelta, longitude: LONDON.longitude }, box),
    ).toBe(true);
    expect(
      isWithinBox({ latitude: LONDON.latitude, longitude: LONDON.longitude + longitudeDelta }, box),
    ).toBe(true);
    expect(
      isWithinBox({ latitude: LONDON.latitude, longitude: LONDON.longitude - longitudeDelta }, box),
    ).toBe(true);
  });

  it('excludes a point beyond the radius', () => {
    const box = boundingBoxAround(LONDON, 1_000);
    // A tenth of a degree of latitude is roughly 11 km, well outside a 1 km box.
    expect(isWithinBox({ latitude: LONDON.latitude + 0.1, longitude: LONDON.longitude }, box)).toBe(
      false,
    );
    expect(isWithinBox({ latitude: LONDON.latitude, longitude: LONDON.longitude + 0.1 }, box)).toBe(
      false,
    );
  });

  it('covers a superset of the circle, never a subset', () => {
    const radius = 5_000;
    const box = boundingBoxAround(LONDON, radius);
    // Walk the circle and confirm every point is inside the box. If the box were ever a
    // subset of the circle it derives from, the proximity prefilter would hide neighbours.
    for (let degrees = 0; degrees < 360; degrees += 5) {
      const radians = toRadians(degrees);
      const point = {
        latitude: LONDON.latitude + (radius / METERS_PER_DEGREE) * Math.cos(radians),
        longitude:
          LONDON.longitude +
          (radius / (METERS_PER_DEGREE * Math.cos(toRadians(LONDON.latitude)))) * Math.sin(radians),
      };
      expect(isWithinBox(point, box)).toBe(true);
    }
  });
});

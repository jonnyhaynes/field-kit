import { describe, expect, it } from '@jest/globals';

import { toOsGridReference } from '../osgb';

type Vector = {
  place: string;
  latitude: number;
  longitude: number;
  eastings: number;
  northings: number;
  square: string;
  /**
   * How far the published easting/northing may differ. OS's own examples agree with this
   * implementation to under a metre; the others come from tools using slightly different
   * transformations or rounding, so they are given room.
   */
  toleranceMetres: number;
};

/**
 * Sources: Ordnance Survey's worked example and OS's own `os-transform` README for the two
 * sub-metre vectors, and published figures for the rest.
 *
 * Deliberately absent: a widely-quoted "Buckingham Palace" pair (TQ 29978 79490 against
 * 51.50136, -0.14181). Inverting that reference lands on Whitehall, about 900 m from the Palace,
 * so the published pair does not agree with itself. The implementation matches OS to under a
 * metre on both of OS's own examples, so the vector was dropped rather than the tolerance
 * widened to accommodate it.
 */
const VECTORS: Vector[] = [
  {
    place: 'the OS guide worked example (Caister water tower)',
    latitude: 52.65798,
    longitude: 1.71605,
    eastings: 651409,
    northings: 313177,
    square: 'TG',
    toleranceMetres: 2,
  },
  {
    place: "OS's own os-transform example (Cumbria)",
    latitude: 54.42480998276385,
    longitude: -2.96793742245737,
    eastings: 337297,
    northings: 503695,
    square: 'NY',
    toleranceMetres: 2,
  },
  {
    place: "Land's End",
    latitude: 50.0682,
    longitude: -5.7152,
    eastings: 134240,
    northings: 25290,
    square: 'SW',
    toleranceMetres: 5,
  },
  {
    place: 'Lowestoft Ness',
    latitude: 51.3749,
    longitude: 1.4451,
    eastings: 639859,
    northings: 169616,
    square: 'TR',
    toleranceMetres: 5,
  },
  {
    place: 'Shetland',
    latitude: 60.5339,
    longitude: -1.4461,
    eastings: 430497,
    northings: 1183497,
    square: 'HU',
    toleranceMetres: 5,
  },
  {
    place: 'Ben Nevis',
    latitude: 56.796029,
    longitude: -5.004711,
    eastings: 216600,
    northings: 771200,
    square: 'NN',
    toleranceMetres: 15,
  },
  {
    place: 'Orkney',
    latitude: 58.9687,
    longitude: -2.9557,
    eastings: 345153,
    northings: 1009450,
    square: 'HY',
    toleranceMetres: 20,
  },
];

describe('toOsGridReference', () => {
  it.each(VECTORS)('places $place in the right grid square', ({ latitude, longitude, square }) => {
    expect(toOsGridReference({ latitude, longitude })?.square).toBe(square);
  });

  it.each(VECTORS)(
    'agrees with the published eastings and northings for $place',
    ({ latitude, longitude, eastings, northings, toleranceMetres }) => {
      const reference = toOsGridReference({ latitude, longitude });
      if (!reference) throw new Error('expected a grid reference');

      // Both figures are checked against the same tolerance: the published pair is a single
      // observation from one tool, so splitting the budget between them would be false precision.
      expect(Math.abs(reference.eastings - eastings)).toBeLessThanOrEqual(toleranceMetres);
      expect(Math.abs(reference.northings - northings)).toBeLessThanOrEqual(toleranceMetres);
    },
  );

  it('writes the reference the way it is read aloud', () => {
    const reference = toOsGridReference({ latitude: 52.65798, longitude: 1.71605 });
    expect(reference?.formatted).toBe('TG 5140 1317');
  });

  /**
   * Eight figures, ten metres. Ten figures would claim metre precision, and neither the Helmert
   * datum shift (3 m, per OS) nor a phone's GPS (3–10 m) supports that.
   */
  it('shows eight figures, not ten', () => {
    const reference = toOsGridReference({ latitude: 52.65798, longitude: 1.71605 });
    const [, eastingDigits, northingDigits] = reference!.formatted.split(' ');

    expect(eastingDigits).toHaveLength(4);
    expect(northingDigits).toHaveLength(4);
  });
});

describe('outside the OS grid', () => {
  it.each([
    // The case that matters: the OS area of use is a rectangle that contains the whole island of
    // Ireland, and Dublin projects inside it to a plausible reference in the wrong country.
    ['Dublin', 53.35, -6.26],
    ['Cork', 51.9, -8.47],
    ['Paris', 48.8566, 2.3522],
    ['Cupertino', 37.33, -122.03],
    ['Reykjavik', 64.15, -21.94],
  ])('refuses to give %s a grid reference', (_place, latitude, longitude) => {
    expect(toOsGridReference({ latitude, longitude })).toBeUndefined();
  });

  it.each([
    ['London', 51.5074, -0.1278],
    ['Belfast', 54.5973, -5.9301],
    ['Douglas, Isle of Man', 54.15, -4.48],
    ["Land's End, on the coast", 50.0682, -5.7152],
    ['Lerwick, Shetland', 60.155, -1.145],
  ])('gives %s a grid reference', (_place, latitude, longitude) => {
    expect(toOsGridReference({ latitude, longitude })).toBeDefined();
  });
});

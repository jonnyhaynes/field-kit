/**
 * OS grid references, computed on device.
 *
 * A grid reference is what a British 999 operator and mountain rescue work in, and it is the
 * thing to read out. It needs no network, so it is always available.
 *
 * **The number of digits is a claim about accuracy**, and this module is deliberately frugal
 * about it. The datum shift below is a 7-parameter Helmert, which Ordnance Survey puts at 3 m
 * (95%) in plan, and a phone's GPS is itself 3–10 m. So eight figures (10 m) is the most that
 * can honestly be shown; ten figures (1 m) would be a claim the app cannot support. Their own
 * OSTN15 model reaches ~0.1 m, and would be the thing to add if metre precision were ever
 * wanted — but it would not change what the GPS can deliver.
 */

import proj4 from 'proj4';

import type { Coordinates } from '@/aed';

import { isWithinOsGridCoverage } from './coverage';

/**
 * EPSG:27700, British National Grid — with the datum shift spelled out.
 *
 * proj4 does *not* ship this definition, and a definition written without `+towgs84` performs no
 * datum shift at all: the result is silently 60–100 m out (proj4js issue #90). The parameters
 * are OS's approximate WGS84 → OSGB36 Helmert, in proj4's opposite-direction convention.
 */
const OSGB36_DEFINITION =
  '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 ' +
  '+ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs';

proj4.defs('EPSG:27700', OSGB36_DEFINITION);

/** Digits per half of the reference. 4 gives eight figures — 10 m. See the note above. */
export const OS_GRID_DIGITS = 4;

/** The grid's lettering omits I. */
const GRID_LETTERS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

export type OsGridReference = {
  /** The 100 km square, two letters, e.g. `TG`. */
  square: string;
  /** Metres east of the National Grid origin, before the square is applied. */
  eastings: number;
  northings: number;
  /** The reference as it is written and read aloud: `TG 5140 1317`. */
  formatted: string;
};

function gridLetter(index: number): string {
  return GRID_LETTERS[index];
}

/** The two-letter 100 km square containing an easting/northing, per OS's own lettering scheme. */
function gridSquare(eastings: number, northings: number): string {
  const easting100km = Math.floor(eastings / 100_000);
  const northing100km = Math.floor(northings / 100_000);

  const first = 5 * Math.floor((19 - northing100km) / 5) + Math.floor((easting100km + 10) / 5);
  const second = (((19 - northing100km) * 5) % 25) + (easting100km % 5);

  return `${gridLetter(first)}${gridLetter(second)}`;
}

function digitsWithinSquare(value: number, digits: number): string {
  const metres = ((value % 100_000) + 100_000) % 100_000;
  const scale = 10 ** (5 - digits);
  return String(Math.floor(metres / scale)).padStart(digits, '0');
}

/**
 * The grid reference for a position, or `undefined` when the point is not somewhere the grid is
 * meaningful — an honest refusal rather than a plausible-looking reference in the wrong country.
 */
export function toOsGridReference(coordinates: Coordinates): OsGridReference | undefined {
  if (!isWithinOsGridCoverage(coordinates)) return undefined;

  const [eastings, northings] = proj4('EPSG:4326', 'EPSG:27700', [
    coordinates.longitude,
    coordinates.latitude,
  ]) as [number, number];

  const square = gridSquare(eastings, northings);
  const eastingDigits = digitsWithinSquare(eastings, OS_GRID_DIGITS);
  const northingDigits = digitsWithinSquare(northings, OS_GRID_DIGITS);

  return {
    square,
    eastings,
    northings,
    formatted: `${square} ${eastingDigits} ${northingDigits}`,
  };
}

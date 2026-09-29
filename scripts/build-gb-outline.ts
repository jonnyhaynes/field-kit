/**
 * Generate the simplified Great Britain + Isle of Man outline used to answer "is this position
 * somewhere an OS grid reference means anything?".
 *
 * Why it exists: the OS grid's area of use is a *rectangle* that includes the whole island of
 * Ireland, and Dublin projects inside it to a plausible but meaningless reference. A first aid
 * app must not read that out to an ambulance service, so coverage is a real outline rather than
 * a bounding box.
 *
 * The output is committed. Re-run only when the source or the tolerance changes:
 *
 *   npm run build:outline
 *   npm run build:outline -- --from-file /path/to/ne_50m_admin_0_countries.geojson
 *
 * Source: Natural Earth, 1:50m admin-0 countries — public domain.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';

/** Countries whose land the OS grid reference is meaningful for. */
const INCLUDED = ['United Kingdom', 'Isle of Man'];

/**
 * Douglas-Peucker tolerance in degrees. 0.005° is roughly 550 m, which keeps coastal
 * extremities — Land's End, the Lizard, Dover — inside the outline while leaving the Republic
 * of Ireland comfortably outside it. A coarser 1:50m outline put Land's End 4.4 km outside.
 */
const TOLERANCE_DEGREES = 0.005;

const OUTPUT = 'src/location/gb-outline.ts';

type Point = [number, number];

type Feature = {
  properties: { ADMIN?: string };
  geometry:
    | { type: 'Polygon'; coordinates: Point[][] }
    | { type: 'MultiPolygon'; coordinates: Point[][][] };
};

/** Perpendicular distance from a point to the line through `start` and `end`, in degrees. */
function perpendicularDistance(point: Point, start: Point, end: Point): number {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return Math.hypot(x - x1, y - y1);

  // Projection of the point onto the segment, clamped to the segment's ends.
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Ramer-Douglas-Peucker, iterative so a long coastline cannot blow the stack. */
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let furthest = -1;
    let maxDistance = tolerance;

    for (let index = first + 1; index < last; index += 1) {
      const distance = perpendicularDistance(points[index], points[first], points[last]);
      if (distance > maxDistance) {
        maxDistance = distance;
        furthest = index;
      }
    }

    if (furthest !== -1) {
      keep[furthest] = true;
      stack.push([first, furthest], [furthest, last]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

function ringsOf(feature: Feature): Point[][] {
  return feature.geometry.type === 'Polygon'
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();
}

async function load(sourceFile: string | undefined): Promise<Feature[]> {
  if (sourceFile) {
    return JSON.parse(readFileSync(resolve(sourceFile), 'utf8')).features as Feature[];
  }

  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`${SOURCE_URL} returned ${response.status}`);
  return ((await response.json()) as { features: Feature[] }).features;
}

function formatRing(ring: Point[]): string {
  const points = ring
    .map(([longitude, latitude]) => `    [${latitude.toFixed(3)}, ${longitude.toFixed(3)}],`)
    .join('\n');
  return `  [\n${points}\n  ],`;
}

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { 'from-file': { type: 'string' } } });

  const features = await load(values['from-file']);
  const selected = features.filter((feature) => INCLUDED.includes(feature.properties.ADMIN ?? ''));

  if (selected.length !== INCLUDED.length) {
    throw new Error(`expected ${INCLUDED.join(' and ')} in the source, found ${selected.length}`);
  }

  const rings = selected
    .flatMap(ringsOf)
    .map((ring) => simplify(ring, TOLERANCE_DEGREES))
    .filter((ring) => ring.length >= 4)
    .sort((a, b) => b.length - a.length);

  const total = rings.reduce((sum, ring) => sum + ring.length, 0);

  const file = `/**
 * A simplified outline of Great Britain, Northern Ireland and the Isle of Man.
 *
 * GENERATED FILE — do not edit by hand. Rebuild with \`npm run build:outline\`.
 *
 * Why this exists rather than a bounding box: the OS grid's area of use is a rectangle that
 * covers the whole island of Ireland, so a Dublin position projects to a plausible but
 * meaningless reference. This outline is what lets the app say "no grid reference available"
 * instead of reading out a grid square in a different country.
 *
 * Source: Natural Earth 1:10m admin-0 countries (public domain),
 * simplified with Ramer-Douglas-Peucker at ${TOLERANCE_DEGREES}° (~${Math.round(
   TOLERANCE_DEGREES * 111_000,
 )} m).
 * ${rings.length} rings, ${total} points.
 */

export type OutlinePoint = readonly [latitude: number, longitude: number];
export type OutlineRing = readonly OutlinePoint[];

/** Rings are closed loops, ordered largest first. */
export const GB_OUTLINE: readonly OutlineRing[] = [
${rings.map(formatRing).join('\n')}
];
`;

  writeFileSync(OUTPUT, file);
  console.log(`Wrote ${OUTPUT} — ${rings.length} rings, ${total} points`);
  return 0;
}

// `main` is async, and tsx compiles this to CommonJS, so no top-level await here.
main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });

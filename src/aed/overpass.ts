/**
 * Parsing the pipeline's only untrusted input: an Overpass API export.
 *
 * Overpass JSON is the accepted shape because it is small, portable and check-in-able — a
 * fixture is a few kilobytes rather than a two-gigabyte PBF. A Geofabrik `.osm.pbf` route
 * can be added later by converting to this same shape, leaving the gate and the schema
 * untouched.
 */

import type { AedNode, ParsedExtract } from './types';

export class OverpassShapeError extends Error {
  constructor(problems: readonly string[]) {
    super(`Not an Overpass extract:\n${problems.join('\n')}`);
    this.name = 'OverpassShapeError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function numberAt(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

/** OSM tags are always strings; anything else is not something we can act on. */
function asTags(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const tags: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string') tags[key] = raw;
  }
  return tags;
}

function coordinatesOf(element: Record<string, unknown>): AedNode['coordinates'] | undefined {
  const latitude = numberAt(element, 'lat');
  const longitude = numberAt(element, 'lon');
  if (latitude !== undefined && longitude !== undefined) return { latitude, longitude };

  // Ways carry `center` when the query asked for it; a relation the same.
  const center = element.center;
  if (isRecord(center)) {
    const centerLatitude = numberAt(center, 'lat');
    const centerLongitude = numberAt(center, 'lon');
    if (centerLatitude !== undefined && centerLongitude !== undefined) {
      return { latitude: centerLatitude, longitude: centerLongitude };
    }
  }

  return undefined;
}

/** The OSM data timestamp, when the response carries one. */
export function overpassTimestamp(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  const osm3s = payload.osm3s;
  if (!isRecord(osm3s)) return undefined;
  const timestamp = osm3s.timestamp_osm_base;
  return typeof timestamp === 'string' ? timestamp : undefined;
}

/**
 * Turn an Overpass response into nodes the quality gate can judge.
 *
 * A payload that is not an Overpass response throws rather than parsing to nothing: a
 * truncated download must fail loudly, because silently producing zero records would ship
 * an empty dataset as though it were a real one.
 */
export function parseOverpassExtract(payload: unknown, dataset: string): ParsedExtract {
  if (!isRecord(payload)) {
    throw new OverpassShapeError(['the payload is not an object']);
  }

  const elements = payload.elements;
  if (!Array.isArray(elements)) {
    throw new OverpassShapeError(['`elements` is missing, or is not an array']);
  }

  const nodes: AedNode[] = [];
  let ignored = 0;

  for (const element of elements) {
    if (!isRecord(element)) {
      ignored += 1;
      continue;
    }

    const id = numberAt(element, 'id');
    const coordinates = coordinatesOf(element);
    if (id === undefined || coordinates === undefined) {
      ignored += 1;
      continue;
    }

    nodes.push({ source: { dataset, osmNodeId: id }, coordinates, tags: asTags(element.tags) });
  }

  return { nodes, sourceTimestamp: overpassTimestamp(payload), ignored };
}

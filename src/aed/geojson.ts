/**
 * Reading a GeoJSON extract — the shape `osmium export` writes from a Geofabrik PBF.
 *
 * Overpass JSON stays the primary input, because a fixture is a few kilobytes; this exists
 * so a pinned, checksummed Geofabrik extract can feed the same gate and schema when Overpass
 * is unreachable. Only point geometries become candidates: an AED mapped as a way or an area
 * cannot be reduced to one honest position, so it is counted as ignored rather than being
 * replaced by a centroid we invented.
 */

import type { AedNode, ParsedExtract } from './types';

export class GeoJsonShapeError extends Error {
  constructor(problems: readonly string[]) {
    super(`Not a GeoJSON extract:\n${problems.join('\n')}`);
    this.name = 'GeoJsonShapeError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * The feature's unique id.
 *
 * `osmium export -u type_id` writes it as a top-level `id` such as `"n13992619"` — the
 * prefix marks the OSM type. Some producers put it in `properties["@id"]` instead, so both
 * are accepted.
 */
function idFrom(
  feature: Record<string, unknown>,
  properties: Record<string, unknown>,
): number | undefined {
  return parseId(feature.id) ?? parseId(properties['@id']);
}

function parseId(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
  if (typeof raw === 'string') {
    const match = /(\d+)\s*$/.exec(raw.trim());
    if (match) return Number(match[1]);
  }
  return undefined;
}

/** osmium keeps OSM metadata in `@`-prefixed keys; everything else is a real tag. */
function tagsFrom(properties: Record<string, unknown>): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (key.startsWith('@')) continue;
    if (typeof value === 'string') tags[key] = value;
  }
  return tags;
}

/** GeoJSON positions are `[longitude, latitude]`, in that order. */
function coordinatesFrom(geometry: unknown): AedNode['coordinates'] | undefined {
  if (!isRecord(geometry) || geometry.type !== 'Point') return undefined;

  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return undefined;

  const [longitude, latitude] = coordinates;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return undefined;

  return { latitude, longitude };
}

/**
 * Turn a GeoJSON FeatureCollection into nodes the quality gate can judge.
 *
 * As with the Overpass parser, a payload that is not the expected shape throws rather than
 * parsing to nothing — a truncated or wrong file must not ship as an empty dataset.
 */
export function parseGeoJsonExtract(payload: unknown, dataset: string): ParsedExtract {
  if (!isRecord(payload)) {
    throw new GeoJsonShapeError(['the payload is not an object']);
  }
  if (payload.type !== 'FeatureCollection') {
    throw new GeoJsonShapeError([
      `\`type\` is ${JSON.stringify(payload.type)}, expected "FeatureCollection"`,
    ]);
  }

  const features = payload.features;
  if (!Array.isArray(features)) {
    throw new GeoJsonShapeError(['`features` is missing, or is not an array']);
  }

  const nodes: AedNode[] = [];
  let ignored = 0;

  for (const feature of features) {
    if (!isRecord(feature)) {
      ignored += 1;
      continue;
    }

    const properties = isRecord(feature.properties) ? feature.properties : {};
    const id = idFrom(feature, properties);
    const coordinates = coordinatesFrom(feature.geometry);
    if (id === undefined || coordinates === undefined) {
      ignored += 1;
      continue;
    }

    nodes.push({ source: { dataset, osmNodeId: id }, coordinates, tags: tagsFrom(properties) });
  }

  return { nodes, ignored };
}

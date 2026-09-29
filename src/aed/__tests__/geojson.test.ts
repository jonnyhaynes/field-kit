import { describe, expect, it } from '@jest/globals';

import { GeoJsonShapeError, parseGeoJsonExtract } from '../geojson';

const DATASET = 'osm-geofabrik-united-kingdom-260927';

const collection = (features: unknown[]): unknown => ({
  type: 'FeatureCollection',
  features,
});

/**
 * The shape `osmium export -u type_id` actually writes: the id is a top-level `feature.id`,
 * prefixed with the OSM type, and tags live in `properties`.
 */
const point = (id: string | number, coordinates: unknown, properties: Record<string, unknown>) => ({
  type: 'Feature',
  id,
  geometry: { type: 'Point', coordinates },
  properties,
});

describe('parseGeoJsonExtract', () => {
  it('reads a point feature into a gated-input record', () => {
    const extract = parseGeoJsonExtract(
      collection([
        point('n13992619', [-0.1278, 51.5074], {
          emergency: 'defibrillator',
          access: 'yes',
          check_date: '2025-06-01',
        }),
      ]),
      DATASET,
    );

    expect(extract.nodes).toEqual([
      {
        source: { dataset: DATASET, osmNodeId: 13992619 },
        coordinates: { latitude: 51.5074, longitude: -0.1278 },
        tags: { emergency: 'defibrillator', access: 'yes', check_date: '2025-06-01' },
      },
    ]);
    expect(extract.ignored).toBe(0);
  });

  it('accepts an id in properties instead of the top level', () => {
    const extract = parseGeoJsonExtract(
      collection([
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [1, 2] },
          properties: { '@id': 'node/2002', emergency: 'defibrillator' },
        },
      ]),
      DATASET,
    );
    expect(extract.nodes[0].source.osmNodeId).toBe(2002);
  });

  it('accepts a bare numeric id', () => {
    const extract = parseGeoJsonExtract(
      collection([point(2002, [1, 2], { emergency: 'defibrillator' })]),
      DATASET,
    );
    expect(extract.nodes[0].source.osmNodeId).toBe(2002);
  });

  it('strips @-prefixed metadata from the tags', () => {
    const extract = parseGeoJsonExtract(
      collection([
        point('n1', [0, 0], {
          '@version': '3',
          '@timestamp': '2026-09-27T20:23:36Z',
          emergency: 'defibrillator',
        }),
      ]),
      DATASET,
    );
    expect(extract.nodes[0].tags).toEqual({ emergency: 'defibrillator' });
  });

  it('counts a non-point geometry as ignored rather than inventing a position', () => {
    const extract = parseGeoJsonExtract(
      collection([
        {
          type: 'Feature',
          id: 'w2',
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
          properties: { emergency: 'defibrillator' },
        },
      ]),
      DATASET,
    );
    expect(extract.nodes).toEqual([]);
    expect(extract.ignored).toBe(1);
  });

  it.each([
    [
      'a feature with no id',
      { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
    ],
    ['a feature with no geometry', { type: 'Feature', id: 'n3', properties: {} }],
    ['a feature with one coordinate', point('n4', [0], { emergency: 'defibrillator' })],
    ['a feature with non-numeric coordinates', point('n5', ['0', '0'], {})],
    ['a bare string', 'nope'],
  ])('counts %s as ignored', (_label, feature) => {
    const extract = parseGeoJsonExtract(collection([feature]), DATASET);
    expect(extract.nodes).toEqual([]);
    expect(extract.ignored).toBe(1);
  });

  it.each([
    ['a non-object payload', 'nonsense'],
    ['null', null],
    ['the wrong type', { type: 'Feature' }],
    ['missing features', { type: 'FeatureCollection' }],
    ['features of the wrong type', { type: 'FeatureCollection', features: 'lots' }],
  ])('throws GeoJsonShapeError on %s', (_label, payload) => {
    expect(() => parseGeoJsonExtract(payload, DATASET)).toThrow(GeoJsonShapeError);
  });

  it('returns an empty extract for a valid empty collection', () => {
    expect(parseGeoJsonExtract(collection([]), DATASET)).toEqual({
      nodes: [],
      sourceTimestamp: undefined,
      ignored: 0,
    });
  });
});

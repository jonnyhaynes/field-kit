import { describe, expect, it } from '@jest/globals';

import { OverpassShapeError, overpassTimestamp, parseOverpassExtract } from '../overpass';

const DATASET = 'osm-overpass@2026-09-27T20:23:36Z';

const response = (elements: unknown[], osm3s?: unknown): unknown => ({
  version: 0.6,
  generator: 'Overpass API 0.7.62.5',
  ...(osm3s === undefined ? {} : { osm3s }),
  elements,
});

describe('parseOverpassExtract', () => {
  it('turns nodes into gated-input records carrying their OSM id and tags', () => {
    const extract = parseOverpassExtract(
      response([
        {
          type: 'node',
          id: 1001,
          lat: 51.5074,
          lon: -0.1278,
          tags: { emergency: 'defibrillator', access: 'yes', check_date: '2025-06-01' },
        },
      ]),
      DATASET,
    );

    expect(extract.nodes).toEqual([
      {
        source: { dataset: DATASET, osmNodeId: 1001 },
        coordinates: { latitude: 51.5074, longitude: -0.1278 },
        tags: { emergency: 'defibrillator', access: 'yes', check_date: '2025-06-01' },
      },
    ]);
    expect(extract.ignored).toBe(0);
  });

  it('reads the OSM data timestamp as provenance', () => {
    const extract = parseOverpassExtract(
      response([], { timestamp_osm_base: '2026-09-27T20:23:36Z' }),
      DATASET,
    );
    expect(extract.sourceTimestamp).toBe('2026-09-27T20:23:36Z');
    expect(overpassTimestamp(response([], { timestamp_osm_base: '2026-09-27T20:23:36Z' }))).toBe(
      '2026-09-27T20:23:36Z',
    );
  });

  it('falls back to center for a way', () => {
    const extract = parseOverpassExtract(
      response([{ type: 'way', id: 2002, center: { lat: 55.9533, lon: -3.1883 }, tags: {} }]),
      DATASET,
    );
    expect(extract.nodes[0].coordinates).toEqual({ latitude: 55.9533, longitude: -3.1883 });
  });

  it.each([
    ['a relation with no coordinates', { type: 'relation', id: 3003, tags: {} }],
    ['a node missing its longitude', { type: 'node', id: 1004, lat: 51.5, tags: {} }],
    ['an element with no id', { type: 'node', lat: 51.5, lon: -0.1, tags: {} }],
    ['a bare string', 'not an element'],
    ['null', null],
  ])('counts %s as ignored rather than failing', (_label, element) => {
    const extract = parseOverpassExtract(response([element]), DATASET);
    expect(extract.nodes).toEqual([]);
    expect(extract.ignored).toBe(1);
  });

  it('keeps parsing when some elements are unusable', () => {
    const extract = parseOverpassExtract(
      response([
        { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { emergency: 'defibrillator' } },
        { type: 'relation', id: 2 },
      ]),
      DATASET,
    );
    expect(extract.nodes).toHaveLength(1);
    expect(extract.ignored).toBe(1);
  });

  it('drops tag values that are not strings', () => {
    const extract = parseOverpassExtract(
      response([
        {
          type: 'node',
          id: 1,
          lat: 51.5,
          lon: -0.1,
          tags: { emergency: 'defibrillator', layer: 3, name: 'Example' },
        },
      ]),
      DATASET,
    );
    expect(extract.nodes[0].tags).toEqual({ emergency: 'defibrillator', name: 'Example' });
  });

  it('treats an empty extract as valid rather than as an error', () => {
    expect(parseOverpassExtract(response([]), DATASET)).toEqual({
      nodes: [],
      sourceTimestamp: undefined,
      ignored: 0,
    });
  });

  it.each([
    ['a non-object payload', 'nonsense'],
    ['null', null],
    ['an object with no elements array', { version: 0.6 }],
    ['elements of the wrong type', { elements: 'nodes' }],
  ])('throws OverpassShapeError on %s', (_label, payload) => {
    expect(() => parseOverpassExtract(payload, DATASET)).toThrow(OverpassShapeError);
  });

  it('names what was wrong with the payload', () => {
    expect(() => parseOverpassExtract({ version: 0.6 }, DATASET)).toThrow(/elements/);
  });
});

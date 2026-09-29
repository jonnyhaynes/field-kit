import { describe, expect, it } from '@jest/globals';

import { isWithinUkOverview, UK_OVERVIEW_BOUNDS } from '../bounds';

describe('isWithinUkOverview', () => {
  it.each([
    ['central London', { latitude: 51.5074, longitude: -0.1278 }],
    ['Shetland, the northern edge', { latitude: 60.8, longitude: -1.3 }],
    ['the Scillies, the southern edge', { latitude: 49.9, longitude: -6.3 }],
    ['west Belfast', { latitude: 54.6, longitude: -5.95 }],
    // The archive's extent is a rectangle cut from a bounding box, not the coastline, so it
    // covers the island of Ireland too — visible on the map, which draws Dublin and Dundalk.
    ['Dublin, inside the rectangle', { latitude: 53.35, longitude: -6.26 }],
  ])('accepts %s', (_label, coordinates) => {
    expect(isWithinUkOverview(coordinates)).toBe(true);
  });

  it.each([
    ['Cupertino', { latitude: 37.33, longitude: -122.03 }],
    ['Paris, just over the eastern edge', { latitude: 48.85, longitude: 2.35 }],
    ['Reykjavik', { latitude: 64.15, longitude: -21.94 }],
  ])('rejects %s', (_label, coordinates) => {
    expect(isWithinUkOverview(coordinates)).toBe(false);
  });

  it('treats the corners of the box as inside', () => {
    const { minLatitude, maxLatitude, minLongitude, maxLongitude } = UK_OVERVIEW_BOUNDS;
    expect(isWithinUkOverview({ latitude: minLatitude, longitude: minLongitude })).toBe(true);
    expect(isWithinUkOverview({ latitude: maxLatitude, longitude: maxLongitude })).toBe(true);
  });

  it('rejects a point just outside', () => {
    const { maxLatitude } = UK_OVERVIEW_BOUNDS;
    expect(isWithinUkOverview({ latitude: maxLatitude + 0.01, longitude: 0 })).toBe(false);
  });
});

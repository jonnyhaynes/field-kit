/**
 * Metro resolves these to an asset module id. Expo already treats `db` as an asset
 * extension (for the AED database) and `pmtiles` is added in `metro.config.js`; the
 * glyph `pbf` files are bundled as plain assets too. The types are the only missing part.
 */
declare module '*.db' {
  const assetId: number;
  export default assetId;
}

declare module '*.pmtiles' {
  const assetId: number;
  export default assetId;
}

declare module '*.pbf' {
  const assetId: number;
  export default assetId;
}

declare module '*.png' {
  const assetId: number;
  export default assetId;
}

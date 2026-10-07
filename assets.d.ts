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

/**
 * The map sprite PNGs carry a `.bin` tail on purpose. A `.png` is an *image* to Metro, so on
 * Android it lands in `res/` as a drawable and `expo-asset` cannot hand back a file URI for it —
 * which is what stopped the map preparing on Android at all. With a generic extension it is bundled
 * as a plain asset, like the glyph `pbf` files, and the copy works on both platforms.
 */
declare module '*.bin' {
  const assetId: number;
  export default assetId;
}

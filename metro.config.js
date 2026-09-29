// `pmtiles` and `pbf` are not Metro asset extensions. Expo already adds `db` (for the AED
// database) and `heic`/`avif` (for expo-image); the map archive and its glyph files need
// adding here.
//
// Push, never assign: setting `resolver.assetExts` to a new array would drop everything
// Expo adds, and the failure would show up as missing images in a production build.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('pmtiles', 'pbf');

module.exports = config;

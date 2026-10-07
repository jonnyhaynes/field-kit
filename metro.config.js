// `pmtiles` and `pbf` are not Metro asset extensions. Expo already adds `db` (for the AED
// database) and `heic`/`avif` (for expo-image); the map archive and its glyph files need
// adding here.
//
// `bin` is here for the map sprite *images*. A `.png` is an image to Metro, so on Android it is
// packed into `res/` as a drawable and `expo-asset` cannot produce a file URI for it — the copy
// that lays the map assets down then fails and the map never prepares on Android. Bundling them as
// generic assets (a `.bin` tail) is what keeps them copyable on both platforms.
//
// Push, never assign: setting `resolver.assetExts` to a new array would drop everything
// Expo adds, and the failure would show up as missing images in a production build.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('pmtiles', 'pbf', 'bin');

module.exports = config;

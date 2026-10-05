// Extends the Expo preset rather than replacing it, so the preset's own
// moduleNameMapper entries survive. `@/*` is the alias from tsconfig.json.
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  moduleNameMapper: {
    // Must come before the preset's `^@/(.*)$`, which would otherwise match `@/global.css` first and
    // hand a stylesheet to the JS parser. A stylesheet import only has to resolve.
    '\\.css$': '<rootDir>/scripts/jest-style-mock.js',
    ...(expoPreset.moduleNameMapper ?? {}),
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

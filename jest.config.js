// Extends the Expo preset rather than replacing it, so the preset's own
// moduleNameMapper entries survive. `@/*` is the alias from tsconfig.json.
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  moduleNameMapper: {
    ...(expoPreset.moduleNameMapper ?? {}),
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

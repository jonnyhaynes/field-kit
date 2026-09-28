const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  // Turn off stylistic rules that would fight Prettier.
  prettier,
  {
    ignores: [
      'dist/**',
      '.expo/**',
      'node_modules/**',
      // Generated native projects (CNG).
      'android/**',
      'ios/**',
      // Managed by the taste system and by each agent tool; not ours to lint.
      '.commandcode/**',
      '.claude/**',
    ],
  },
]);

// A stylesheet import has no behaviour under jest — it only needs to resolve. `theme.ts` imports
// `@/global.css` for the web build, and the constants tests reach that import for the first time.
module.exports = {};

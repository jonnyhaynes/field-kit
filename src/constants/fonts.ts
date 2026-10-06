/**
 * The three faces, bundled as subsets by `scripts/build-fonts.sh`.
 *
 * Bricolage Grotesque is the display face, Figtree the text face, IBM Plex Mono the machine face —
 * grid references, coordinates, distances, bearings, the metronome. The keys here are the family
 * names the type roles ask for, so `src/constants/__tests__/type.test.ts` can assert the two never
 * drift: a renamed font would otherwise fall back to the system face silently.
 *
 * Kept out of `_layout.tsx` so the registration can be tested without importing the router (which
 * hides the splash screen at module load).
 */
export const FONTS = {
  'BricolageGrotesque-700': require('../../assets/fonts/BricolageGrotesque-700.ttf'),
  'BricolageGrotesque-800': require('../../assets/fonts/BricolageGrotesque-800.ttf'),
  'Figtree-Regular': require('../../assets/fonts/Figtree-Regular.ttf'),
  'Figtree-SemiBold': require('../../assets/fonts/Figtree-SemiBold.ttf'),
  'IBMPlexMono-Regular': require('../../assets/fonts/IBMPlexMono-Regular.ttf'),
  'IBMPlexMono-Medium': require('../../assets/fonts/IBMPlexMono-Medium.ttf'),
} as const;

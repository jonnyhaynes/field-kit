/**
 * The two faces, bundled as subsets by `scripts/build-fonts.sh`.
 *
 * Nunito Sans is the text face; IBM Plex Mono is the machine face — grid references, coordinates,
 * distances, bearings, the metronome. The keys here are the family names the type roles ask for, so
 * `src/constants/__tests__/type.test.ts` can assert the two never drift: a renamed font would
 * otherwise fall back to the system face silently.
 *
 * Kept out of `_layout.tsx` so the registration can be tested without importing the router (which
 * hides the splash screen at module load).
 */
export const FONTS = {
  'NunitoSans-Regular': require('../../assets/fonts/NunitoSans-Regular.ttf'),
  'NunitoSans-SemiBold': require('../../assets/fonts/NunitoSans-SemiBold.ttf'),
  'IBMPlexMono-Regular': require('../../assets/fonts/IBMPlexMono-Regular.ttf'),
} as const;

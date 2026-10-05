import { useColorScheme as useRNColorScheme } from 'react-native';

import { type Scheme, resolveScheme } from '@/constants/theme';

/**
 * The single place the app decides which theme it is in.
 *
 * Dark-first, via `resolveScheme`: only an explicit `'light'` from the device resolves to light.
 * `null` and `'unspecified'` — a device that has not said, which is what a fresh install and the
 * simulator report — resolve to dark along with everything else.
 *
 * The navigation chrome, the component palette and the map style all read this one hook, so they
 * cannot disagree about what theme the app is in. They each used to coerce the platform value
 * themselves, which is exactly how chrome and content drift apart.
 */
export function useColorScheme(): Scheme {
  return resolveScheme(useRNColorScheme());
}

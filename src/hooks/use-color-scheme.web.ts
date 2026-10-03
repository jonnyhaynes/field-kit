import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { DefaultScheme, type Scheme, resolveScheme } from '@/constants/theme';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 *
 * The pre-hydration value is the app default, not `'light'`: the server has no colour scheme to
 * read, and this app is dark-first, so dark is the value that does not flash the wrong theme on the
 * first paint. The conversion itself is `resolveScheme`, shared with the native hook.
 */
export function useColorScheme(): Scheme {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Expo's static-rendering hydration guard: the server has no colour scheme, so the
    // first client render has to match the server and only then switch. There is no
    // external system to subscribe to instead, which is exactly why the rule is wrong here.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate exception
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (!hasHydrated) return DefaultScheme;

  return resolveScheme(colorScheme);
}

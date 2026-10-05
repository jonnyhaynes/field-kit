import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Colors, type Scheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * The two faces, bundled as subsets by `scripts/build-fonts.sh`.
 *
 * Overpass is the text face; IBM Plex Mono is the machine face — grid references, coordinates,
 * distances, bearings, the metronome. Nothing is styled with them yet: this makes them *available*
 * and nothing more, so if the app looks different after this commit that is a plumbing bug rather
 * than an intended restyle.
 */
const FONTS = {
  'Overpass-Regular': require('../../assets/fonts/Overpass-Regular.ttf'),
  'Overpass-SemiBold': require('../../assets/fonts/Overpass-SemiBold.ttf'),
  'IBMPlexMono-Regular': require('../../assets/fonts/IBMPlexMono-Regular.ttf'),
};

// Held until the fonts resolve, so the first screen is not painted in the system face and then
// swapped — which is exactly the flash that makes an app feel unfinished.
void SplashScreen.preventAutoHideAsync();

/** Navigation chrome follows the app palette rather than the platform default. */
function navigationTheme(scheme: Scheme) {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[scheme];

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.accent,
      background: palette.background,
      card: palette.backgroundElement,
      text: palette.text,
      border: palette.border,
    },
  };
}

export default function RootLayout() {
  // One source for the theme, shared with every component and with the map style. The scheme
  // decision used to be made here *and* in use-theme *and* in the map, independently.
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  // `fontError` as well as `fontsLoaded`: a font that fails to load must not hold the splash
  // forever. Falling back to the system face is a worse-looking app, not a broken one.
  const [fontsLoaded, fontError] = useFonts(FONTS);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={navigationTheme(scheme)}>
      {/*
        Everything except the tab shell is now pushed *inside* a tab's own stack, so the tab bar
        stays visible with that tab lit. That is why the root stack holds one entry: a screen pushed
        here would cover the tab bar, which is what the Act/CPR relationship must not do.
      */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';

import { Colors, type Scheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

type Scheme = 'light' | 'dark';

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
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = Colors[scheme];

  return (
    <ThemeProvider value={navigationTheme(scheme)}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.backgroundElement },
          headerTintColor: palette.text,
          headerTitleStyle: { fontSize: 17 },
          contentStyle: { backgroundColor: palette.background },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="cpr" options={{ title: 'Start compressions' }} />
        <Stack.Screen name="aed" options={{ title: 'Nearest defibrillator' }} />
        <Stack.Screen name="map" options={{ title: 'Offline map' }} />
        <Stack.Screen name="position" options={{ title: 'Where I am' }} />
        <Stack.Screen name="compass" options={{ title: 'Compass' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="about" options={{ title: 'Data and licences' }} />
      </Stack>
    </ThemeProvider>
  );
}

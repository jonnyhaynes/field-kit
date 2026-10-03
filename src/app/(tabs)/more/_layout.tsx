import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * More: settings, the depth switch, the OpenStreetMap report queue, and the licences.
 *
 * Data and licences stays a pushed screen rather than a section of Settings — it is long, and the
 * ODbL requires the attribution to be *reachable* rather than merely present, which a back button
 * satisfies.
 */
export default function MoreLayout() {
  const palette = Colors[useColorScheme()];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.backgroundElement },
        headerTintColor: palette.text,
        headerTitleStyle: { fontSize: 17 },
        contentStyle: { backgroundColor: palette.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'More' }} />
      <Stack.Screen name="about" options={{ title: 'Data and licences' }} />
    </Stack>
  );
}

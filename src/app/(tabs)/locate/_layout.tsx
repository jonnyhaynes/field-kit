import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Locate's stack.
 *
 * One screen plus region packs. The map, where I am and the compass are not routes any more: they
 * are in-page tabs inside the index screen, so nothing about them touches navigation. Region packs
 * stays pushed, because it is a real destination — you go there, and you come back.
 */
export default function LocateLayout() {
  const palette = Colors[useColorScheme()];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.backgroundElement },
        headerTintColor: palette.text,
        headerTitleStyle: { ...Type.title },
        contentStyle: { backgroundColor: palette.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Locate' }} />
      <Stack.Screen name="regions" options={{ headerShown: false }} />
    </Stack>
  );
}

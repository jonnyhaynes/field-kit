import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Act's stack.
 *
 * CPR and the defibrillator list live here rather than in the root stack so that pushing them keeps
 * the tab bar visible with Act lit — they are Act territory, not places of their own.
 *
 * Sending a report lives here too, and deliberately: *both* depths send one (§1), so it cannot sit
 * behind the Field tab, which only exists at the responder depth.
 */
export default function ActLayout() {
  const palette = Colors[useColorScheme()];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.backgroundElement },
        headerTintColor: palette.text,
        headerTitleStyle: { ...Type.title },
        contentStyle: { backgroundColor: palette.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="cpr" options={{ title: 'Start compressions' }} />
      <Stack.Screen name="aed" options={{ title: 'Nearest defibrillator' }} />
      <Stack.Screen name="send" options={{ title: 'Send report' }} />
    </Stack>
  );
}

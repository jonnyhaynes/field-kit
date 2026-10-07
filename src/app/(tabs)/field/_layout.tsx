import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Field: the Responder depth's workspace.
 *
 * Capture only, with scanning a pushed screen — the report screen lives in Act's stack instead,
 * because *both* depths send a report and this tab exists only when the depth is on. Putting send
 * here would have made the guided user's "Send a report" link navigate to a tab they do not have.
 */
export default function FieldLayout() {
  const palette = Colors[useColorScheme()];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.backgroundElement },
        headerTintColor: palette.text,
        headerTitleStyle: { ...Type.title },
        contentStyle: { backgroundColor: palette.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Record incident' }} />
      {/* The title is the mnemonic; the screen sets it, since one file serves all four forms. */}
      <Stack.Screen name="[form]" options={{ title: 'Record' }} />
      <Stack.Screen name="scan" options={{ title: 'Open a report' }} />
    </Stack>
  );
}

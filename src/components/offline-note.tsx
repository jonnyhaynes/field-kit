import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Surfaces } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * States what the app promises about the network, on the screens where that matters.
 *
 * Deliberately says only what is true of the screen it sits on: nothing here calls out.
 * It is not a claim that every feature is available offline — the AED screen has no
 * dataset yet, and says so itself.
 */
export function OfflineNote({ children }: { children: string }) {
  const scheme = useColorScheme();
  const theme = useTheme();

  return (
    <View
      testID="offline-note"
      style={[styles.note, { backgroundColor: Surfaces[scheme].selected }]}>
      <Text style={[styles.text, { color: theme.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { borderRadius: Radius.sm, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  text: { ...Type.note },
});

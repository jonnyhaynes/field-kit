import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { hairline } from '@/constants/surface';
import { Spacing, Surfaces } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The board's header row: a back disc, the screen's title, and an optional right slot (a chip or a
 * counter). The board draws no navigation bar — its title sits in the content at display weight —
 * so every screen that has a board mockup **hides the native header** and draws this instead.
 * Showing both was the single most visible thing that read as "not the board".
 *
 * The gesture and hardware back still work; this is the visible control.
 */
export function ScreenHeader({
  title,
  titleSize = 26,
  right,
  testID,
}: {
  title: string;
  titleSize?: number;
  right?: ReactNode;
  testID?: string;
}) {
  const scheme = useColorScheme();
  const theme = useTheme();

  return (
    <View style={styles.row} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        testID="header-back"
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.back,
          { backgroundColor: Surfaces[scheme].panel, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <Chevron color={theme.text} />
      </Pressable>

      <Text
        style={[
          styles.title,
          { color: theme.text, fontSize: titleSize, lineHeight: titleSize * 1.04 },
        ]}
        numberOfLines={1}>
        {title}
      </Text>

      {right}
    </View>
  );
}

/** The back chevron, drawn rather than imported — the app ships no icon set. */
function Chevron({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Display face at 800; the size is the board's per-screen one.
  title: { ...Type.display, flexShrink: 1 },
  pressed: { opacity: 0.7 },
});

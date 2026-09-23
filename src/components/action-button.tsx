import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ActionVariant = 'rescue' | 'default';

type Props = {
  label: string;
  /** Second line, for what the action does rather than what it is. */
  hint?: string;
  variant?: ActionVariant;
  onPress: () => void;
  testID?: string;
  accessibilityHint?: string;
};

export function ActionButton({
  label,
  hint,
  variant = 'default',
  onPress,
  testID,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const isRescue = variant === 'rescue';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isRescue ? theme.rescue : theme.backgroundElement,
          borderColor: isRescue ? 'transparent' : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.text}>
        <Text
          style={[styles.label, isRescue && styles.labelRescue, { color: isRescue ? theme.rescueInk : theme.text }]}>
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.hint, { color: isRescue ? theme.rescueInk : theme.textSecondary }]}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingVertical: Spacing.three,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  text: { gap: Spacing.half },
  label: { fontSize: 17, fontWeight: '600' },
  labelRescue: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 13 },
});

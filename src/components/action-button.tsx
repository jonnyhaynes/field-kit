import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MinTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * `rescue` is the emergency action, and appears once per screen. `signal` is the app's own action
 * colour, for the thing this screen exists to do. `default` is a destination.
 */
export type ActionVariant = 'rescue' | 'signal' | 'default';

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

  const fill = {
    rescue: theme.rescue,
    signal: theme.accent,
    default: theme.backgroundElement,
  }[variant];

  const ink = {
    rescue: theme.rescueInk,
    signal: theme.accentInk,
    default: theme.text,
  }[variant];

  // A hint on a filled button has to sit on the fill, so it takes the fill's ink rather than the
  // secondary text colour, which would be unreadable on red or on the signal.
  const hintInk = variant === 'default' ? theme.textSecondary : ink;

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
          backgroundColor: fill,
          borderColor: variant === 'default' ? theme.border : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.text}>
        <Text style={[styles.label, variant === 'rescue' && styles.labelRescue, { color: ink }]}>
          {label}
        </Text>
        {hint ? <Text style={[styles.hint, { color: hintInk }]}>{hint}</Text> : null}
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

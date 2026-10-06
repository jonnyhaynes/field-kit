import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { bevelStyle, controlSurface, hairline } from '@/constants/surface';
import { Bevel, BevelOnColor, Elevation, MinTarget, Radius, Spacing } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * `rescue` is the emergency action, and appears once per screen. `signal` is the app's own action
 * colour, for the thing this screen exists to do. `glacier` is the data accent, for the
 * defibrillator path. `default` is a destination.
 */
export type ActionVariant = 'rescue' | 'signal' | 'glacier' | 'default';

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
  const scheme = useColorScheme();
  const theme = useTheme();

  // The default destination is a control on the panel; the filled variants keep their colour and
  // take depth instead. Only `rescue` is allowed to glow (§4.1 rule 6).
  const surface: ViewStyle =
    variant === 'default'
      ? controlSurface(scheme)
      : {
          backgroundColor:
            variant === 'rescue'
              ? theme.rescue
              : variant === 'glacier'
                ? theme.glacier
                : theme.brand,
          borderColor: 'transparent',
          ...(variant === 'rescue' ? Elevation[scheme].attention : Elevation[scheme].control),
        };

  const ink = {
    rescue: theme.rescueInk,
    signal: theme.brandInk,
    glacier: theme.brandInk,
    default: theme.text,
  }[variant];

  // A hint on a filled button has to sit on the fill, so it takes the fill's ink rather than the
  // secondary text colour, which would be unreadable on red or on the signal.
  const hintInk = variant === 'default' ? theme.textSecondary : ink;

  // A coloured fill needs the stronger edge; the panel bevel is tuned for a dark panel.
  const bevel = variant === 'default' ? Bevel[scheme] : BevelOnColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.base, surface, pressed && styles.pressed]}>
      <View pointerEvents="none" style={bevelStyle(bevel, Radius.md)} />
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
    borderWidth: hairline,
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingVertical: Spacing.three,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  text: { gap: Spacing.half },
  label: { ...Type.title },
  labelRescue: { textAlign: 'center' },
  hint: { ...Type.note },
});

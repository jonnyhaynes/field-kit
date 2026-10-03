import { Pressable, StyleSheet, Text } from 'react-native';

import { MinTarget, Radius } from '@/constants/theme';
import { EMERGENCY_LABEL, callEmergencyServices } from '@/emergency/dial';
import { useTheme } from '@/hooks/use-theme';

/**
 * The emergency action, pinned above the tab bar on every screen except Act.
 *
 * It calls exactly what Act's button calls. There is deliberately no separate confirmation sheet:
 * `tel:` hands off to the dialler, which already asks before it connects, and the dialler's own
 * prompt *is* the confirmation. Adding a second one here would make the dock a different action
 * from the button with the same label, and it would cost a tap in the situation where taps matter
 * most — which is the same reasoning `emergency/dial` already records.
 *
 * The dock is a `Pressable` with a full touch target, and `tel:` places no call by itself, so the
 * worst a mis-tap does is open the dialler with 999 ready.
 */
export function CallDock() {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={EMERGENCY_LABEL}
      accessibilityHint={`Opens the dialler with ${EMERGENCY_LABEL.replace('Call ', '')} ready`}
      testID="call-dock"
      onPress={() => {
        void callEmergencyServices();
      }}
      style={({ pressed }) => [
        styles.dock,
        { backgroundColor: theme.rescue },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, { color: theme.rescueInk }]}>{EMERGENCY_LABEL}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dock: {
    minHeight: MinTarget,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  label: { fontSize: 19, fontWeight: '700' },
});

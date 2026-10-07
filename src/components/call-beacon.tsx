import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors, Elevation, Radius, Spacing } from '@/constants/theme';
import { Type } from '@/constants/type';
import { EMERGENCY_LABEL, callEmergencyServices } from '@/emergency/dial';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * The emergency action — one component, so the bottom bar and the capture form's own bar cannot
 * drift apart. It is the only thing in the app allowed to look like it is emitting light, and the
 * only control that carries a word rather than a glyph: a word beats an icon under stress.
 *
 * `testID="call-beacon"` rides here, which is why the guided flow's "exactly one beacon on every
 * screen" still holds when a capture form swaps the bar for its own.
 */
export function CallBeacon({ style }: { style?: StyleProp<ViewStyle> }) {
  const scheme = useColorScheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={EMERGENCY_LABEL}
      accessibilityHint={`Opens the dialler with ${EMERGENCY_LABEL.replace('Call ', '')} ready`}
      testID="call-beacon"
      onPress={() => {
        void callEmergencyServices();
      }}
      style={({ pressed }) => [
        styles.call,
        { backgroundColor: Colors[scheme].rescue, ...Elevation[scheme].attention },
        style,
        pressed && styles.pressed,
      ]}>
      <PhoneGlyph color={Colors[scheme].rescueInk} />
      <Text style={[styles.label, { color: Colors[scheme].rescueInk }]}>999</Text>
    </Pressable>
  );
}

/** The handset, drawn rather than imported — the app ships no icon set. */
function PhoneGlyph({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  call: {
    marginLeft: 'auto',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  label: { ...Type.machineStrong, fontSize: 21 },
  pressed: { opacity: 0.85 },
});

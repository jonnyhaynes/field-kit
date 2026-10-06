import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { bevelStyle, hairline, raisedSurface } from '@/constants/surface';
import { Bevel, Radius, Spacing, Surfaces } from '@/constants/theme';
import { Type } from '@/constants/type';
import { beatIntervalMs } from '@/cpr/pace';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Comes from licensed guidance. Never a number this app chose. */
  bpm: number;
  testID?: string;
};

const RING_COUNT = 3;

/**
 * Visual pace setter. No audio, no haptics yet — both need a device to verify, and the
 * pace itself is dormant until the compression-rate record is licensed in.
 *
 * Each beat emits a ring that expands and fades, which reads as a pulse rather than as a blinking
 * light. **Reduce Motion turns the rings off entirely** and leaves the beat dot, whose colour still
 * flips: the pace survives, the animation does not. That is the one place in the app with a genuine
 * animation, so it is the one place that gate has to exist.
 */
export function Metronome({ bpm, testID = 'metronome' }: Props) {
  const scheme = useColorScheme();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [beats, setBeats] = useState(0);
  const [lit, setLit] = useState(false);
  const pulse = useSharedValue(0);
  const interval = beatIntervalMs(bpm);

  useEffect(() => {
    // Beat only. No state reset in here: setting state synchronously in an effect causes a
    // cascading render, and letting the count carry over is harmless for a pace that does
    // not change mid-incident.
    const id = setInterval(() => {
      setBeats((n) => n + 1);
      setLit((on) => !on);
    }, interval);
    return () => clearInterval(id);
  }, [interval]);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = 0;
    pulse.value = withTiming(1, { duration: interval * 0.92, easing: Easing.out(Easing.quad) });
  }, [beats, reduceMotion, pulse, interval]);

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Compression pace, ${bpm} per minute, ${beats} beats so far`}
      style={[styles.wrap, raisedSurface(scheme)]}>
      <View pointerEvents="none" style={bevelStyle(Bevel[scheme], Radius.md)} />
      <View style={styles.stage}>
        {!reduceMotion
          ? [0, 1, 2].map((index) => (
              <PulseRing key={index} index={index} pulse={pulse} colour={theme.brand} />
            ))
          : null}
        <View
          style={[styles.dot, { backgroundColor: lit ? theme.brand : Surfaces[scheme].selected }]}
        />
      </View>
      <Text style={[styles.rate, { color: theme.text }]}>{bpm}</Text>
      <Text style={[styles.caption, { color: theme.textSecondary }]}>per minute</Text>
    </View>
  );
}

/** One ring, staggered behind the others by its index, so a beat reads as three expanding waves. */
function PulseRing({
  index,
  pulse,
  colour,
}: {
  index: number;
  pulse: SharedValue<number>;
  colour: string;
}) {
  const style = useAnimatedStyle(() => {
    // Each ring trails the one in front of it; the clamp keeps the tail from going negative.
    const progress = Math.min(Math.max(pulse.value * 1.5 - index * 0.28, 0), 1);
    return {
      opacity: (1 - progress) * 0.45,
      transform: [{ scale: 0.7 + progress * (0.5 + RING_COUNT * 0.22) }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: colour }, style]} />
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: hairline,
    borderRadius: Radius.md,
    paddingVertical: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  stage: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  dot: { width: 28, height: 28, borderRadius: Radius.pill },
  rate: { ...Type.machine, fontSize: 46 },
  caption: { ...Type.note },
});

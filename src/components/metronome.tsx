import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Contour } from '@/components/contour';
import { Radius, Spacing, Surfaces } from '@/constants/theme';
import { Type } from '@/constants/type';
import { beatIntervalMs } from '@/cpr/pace';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Comes from licensed guidance. Never a number this app chose. */
  bpm: number;
  /** The beat stops when this is false; the elapsed readout holds where it stopped. */
  running?: boolean;
  testID?: string;
};

const DISC = 176;
const BEAT_DOTS = 6;

/**
 * Visual pace setter. No audio, no haptics yet — both need a device to verify, and the pace itself
 * is dormant until the compression-rate record is licensed in.
 *
 * The board's CPR hero: a hi-vis rate disc sitting in a summit contour field, with the beat and the
 * elapsed time as readouts below. Each beat emits a ring that expands and fades, which reads as a
 * pulse rather than as a blinking light. **Reduce Motion turns the rings off entirely** and leaves
 * the beat dots, whose lit position still moves: the pace survives, the animation does not. That is
 * the one place in the app with a genuine animation, so it is the one place that gate has to exist.
 */
export function Metronome({ bpm, running = true, testID = 'metronome' }: Props) {
  const scheme = useColorScheme();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [beats, setBeats] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);
  const pulse = useSharedValue(0);
  const interval = beatIntervalMs(bpm);

  useEffect(() => {
    if (!running) return;

    // Resume from where the last run stopped rather than restarting the clock.
    const startedAt = Date.now();
    const base = elapsedRef.current;
    const id = setInterval(() => {
      elapsedRef.current = base + (Date.now() - startedAt);
      setElapsedMs(elapsedRef.current);
      setBeats((n) => n + 1);
    }, interval);

    return () => clearInterval(id);
  }, [running, interval]);

  useEffect(() => {
    if (reduceMotion || !running) return;
    pulse.value = 0;
    pulse.value = withTiming(1, { duration: interval * 0.92, easing: Easing.out(Easing.quad) });
  }, [beats, reduceMotion, pulse, interval, running]);

  const litDot = beats % BEAT_DOTS;

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Compression pace, ${bpm} per minute, ${beats} beats so far`}>
      <View style={styles.hero}>
        <Contour
          variant="summit"
          corner="center"
          tone={scheme === 'dark' ? 'brand' : 'ink'}
          size={320}
        />
        <View style={styles.stage}>
          {!reduceMotion && running
            ? [0, 1, 2].map((index) => (
                <PulseRing key={index} index={index} pulse={pulse} colour={theme.brand} />
              ))
            : null}
          <View style={[styles.disc, { backgroundColor: theme.brand }]}>
            <Text style={[styles.rate, { color: theme.brandInk }]}>{bpm}</Text>
            <Text style={[styles.rateCaption, { color: theme.brandInk }]}>per min</Text>
          </View>
        </View>
      </View>

      <View style={styles.readoutRow}>
        <View style={styles.readout}>
          <Text style={[styles.readoutLabel, { color: theme.textSecondary }]}>BEAT</Text>
          <View style={styles.dots}>
            {Array.from({ length: BEAT_DOTS }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      running && index === litDot ? theme.brand : Surfaces[scheme].selected,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <View style={[styles.readout, styles.readoutEnd]}>
          <Text style={[styles.readoutLabel, { color: theme.textSecondary }]}>ELAPSED</Text>
          <Text testID="cpr-elapsed" style={[styles.elapsed, { color: theme.text }]}>
            {formatElapsed(elapsedMs)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** `mm:ss`, because a responder reads the running time aloud in minutes and seconds. */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
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
    const spread = 1 + progress * (0.35 - index * 0.06);
    return { opacity: (1 - progress) * 0.4, transform: [{ scale: spread }] };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: colour }, style]} />
  );
}

const styles = StyleSheet.create({
  hero: { height: 320, alignItems: 'center', justifyContent: 'center' },
  stage: { width: DISC, height: DISC, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: DISC,
    height: DISC,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rate: { ...Type.machineStrong, fontSize: 60 },
  rateCaption: { ...Type.machine, fontSize: 15 },
  readoutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  readout: { gap: Spacing.one },
  readoutEnd: { alignItems: 'flex-end' },
  readoutLabel: { ...Type.label },
  dots: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', height: 20 },
  dot: { width: 14, height: 14, borderRadius: Radius.pill },
  elapsed: { ...Type.machineStrong, fontSize: 30 },
});

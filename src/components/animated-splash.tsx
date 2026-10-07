import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Contour } from '@/components/contour';
import { Colors, Surfaces } from '@/constants/theme';
import { Type } from '@/constants/type';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * The animated splash.
 *
 * The *native* splash cannot animate — it is a static image — so this is the second half of it: the
 * native splash is held until the fonts resolve, then handed over to this overlay, which draws the
 * mark (the contour field with the red point at its centre) growing in, holds, and fades away.
 *
 * It is not a loading state and never waits on anything: `RootLayout` only renders it once the fonts
 * are already in, so its only job is to make the hand-off from the static splash feel like one
 * deliberate entrance rather than a flash of the first screen.
 *
 * **Reduce Motion** skips the entrance and holds briefly: no growth, just the fade.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const scheme = useColorScheme();
  const reduceMotion = useReducedMotion();
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const overlay = useSharedValue(1);

  useEffect(() => {
    if (!reduceMotion) {
      enter.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
    }

    const hold = reduceMotion ? 300 : 1250;
    const timer = setTimeout(() => {
      overlay.value = withTiming(
        0,
        { duration: 360, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(onDone)();
        },
      );
    }, hold);

    return () => clearTimeout(timer);
  }, [reduceMotion, enter, overlay, onDone]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.92 + enter.value * 0.08 }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));

  return (
    <Animated.View
      testID="animated-splash"
      style={[styles.fill, { backgroundColor: Surfaces[scheme].canvas }, overlayStyle]}>
      <Animated.View style={[styles.centre, markStyle]}>
        <View style={styles.markBox}>
          <Contour
            variant="summit"
            corner="center"
            tone={scheme === 'dark' ? 'brand' : 'ink'}
            size={340}
            animated={false}
          />
          {/* The mark's red point, at the centre of the rings — the one red on the splash. */}
          <View style={[styles.dot, { backgroundColor: Colors[scheme].rescue }]} />
        </View>

        <Text style={[styles.word, { color: Colors[scheme].text }]}>Field Kit</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centre: { alignItems: 'center', gap: 4 },
  markBox: { width: 340, height: 340, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
    borderRadius: 6,
  },
  word: { ...Type.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.9 },
});

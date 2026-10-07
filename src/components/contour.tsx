import { useEffect } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { Colors, type Scheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * The contour field — the identity's decorative line language, borrowed from the OS map.
 *
 * One irregular closed path drawn as a nest of rings at stepped scales and opacities, anchored in a
 * corner and bleeding off it — or centred, for CPR's summit field, which is the one place the board
 * puts the field around the thing rather than behind a corner. The geometry is the approved board's:
 * the same blob in every field, only the scale ramp, the opacity ramp and the rotation change, so
 * `hill` and `summit` are two readings of one shape rather than two shapes. The stroke is
 * `non-scaling`, so the line stays 1.3pt however far the ring is scaled.
 *
 * **It breathes.** By default the field drifts in and out on a slow loop, so the lines read as a
 * living surface rather than a printed one. On CPR the field is handed the metronome's `pulse`
 * instead, so it expands **on each beat** rather than on its own clock — the board's note that the
 * rings breathe with the compressions.
 *
 * **Decoration on an emergency app.** It is `pointerEvents="none"` and hidden from the accessibility
 * tree, so it can never intercept a tap or be read out; keep it in corners, never under body text.
 * **Reduce Motion stops it entirely** — the field is drawn once and left still.
 */

const BLOB =
  'M10,-95 C70,-105 120,-40 100,15 C85,60 40,110 -15,95 C-70,80 -115,40 -100,-15 C-88,-60 -45,-88 10,-95Z';

/** The blob's authored radius, in its own units — used to normalise a ring to the box. */
const BLOB_RADIUS = 110;
const STROKE = 1.3;

/** How long one breath takes, out and back. Slow enough to read as ambient, not as a loading state. */
const BREATH_MS = 7000;

type Variant = 'hill' | 'summit';
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
type Tone = 'brand' | 'glacier' | 'ink';

type Props = {
  variant?: Variant;
  corner?: Corner;
  /** Which palette role the lines take. Decorative, so `brand` by default. */
  tone?: Tone;
  /** The square the rings are drawn in, in points. */
  size?: number;
  /**
   * A 0→1-per-beat value to drive the field with — CPR passes the metronome's. When given, the field
   * rides the beat instead of its own slow loop.
   */
  pulse?: SharedValue<number>;
  /** Set false to hold the field still (the splash draws its own entrance). */
  animated?: boolean;
};

/** Outer to inner: the two readings of the one shape. */
const PRESETS: Record<Variant, { rotation: number; rings: { scale: number; opacity: number }[] }> =
  {
    hill: {
      rotation: 0,
      rings: [
        { scale: 1.1, opacity: 0.18 },
        { scale: 0.78, opacity: 0.28 },
        { scale: 0.48, opacity: 0.45 },
        { scale: 0.22, opacity: 0.7 },
      ],
    },
    summit: {
      rotation: -20,
      rings: [
        { scale: 1.4, opacity: 0.1 },
        { scale: 1.05, opacity: 0.15 },
        { scale: 0.72, opacity: 0.22 },
        { scale: 0.42, opacity: 0.34 },
        { scale: 0.16, opacity: 0.6 },
      ],
    },
  };

const CORNER_STYLE: Record<Corner, ViewStyle> = {
  'top-left': { top: 0, left: 0 },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
  center: { top: '50%', left: '50%' },
};

/** Where the rings' centre sits in the box: the panel-facing corner, or the box's centre. */
const ANCHOR: Record<Corner, { x: number; y: number }> = {
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 1, y: 0 },
  'bottom-left': { x: 0, y: 1 },
  'bottom-right': { x: 1, y: 1 },
  center: { x: 0.5, y: 0.5 },
};

const toneColour: Record<Tone, (scheme: Scheme) => string> = {
  brand: (scheme) => Colors[scheme].brand,
  glacier: (scheme) => Colors[scheme].glacier,
  ink: (scheme) => Colors[scheme].text,
};

export function Contour({
  variant = 'hill',
  corner = 'top-right',
  tone = 'brand',
  size = 240,
  pulse,
  animated = true,
}: Props) {
  const scheme = useColorScheme();
  const reduceMotion = useReducedMotion();
  const preset = PRESETS[variant];
  const stroke = toneColour[tone](scheme);

  const motion = animated && !reduceMotion;
  const beatDriven = pulse !== undefined;

  // The ambient breath. Skipped when Reduce Motion is on, and when a beat drives the field instead.
  const ambient = useSharedValue(0);
  useEffect(() => {
    if (!motion || beatDriven) return;
    ambient.value = 0;
    ambient.value = withRepeat(
      withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [motion, beatDriven, ambient]);

  const source = pulse ?? ambient;
  const animatedStyle = useAnimatedStyle(() => {
    if (!motion) return {};
    const p = source.value;
    return { transform: [{ scale: 0.985 + p * 0.05 }], opacity: 0.82 + p * 0.18 };
  });

  // The largest ring is the box's 92%, so every ring shares one scale rather than each preset
  // carrying its own absolute numbers.
  const maxScale = Math.max(...preset.rings.map((ring) => ring.scale));
  const unit = (0.92 * size) / BLOB_RADIUS;
  const x = ANCHOR[corner].x * size;
  const y = ANCHOR[corner].y * size;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.box,
        CORNER_STYLE[corner],
        // `top: 50%` puts the box's corner at the centre; pull it back by half so the rings, which
        // sit at the box's centre, land on the parent's centre.
        corner === 'center' ? { marginLeft: -size / 2, marginTop: -size / 2 } : null,
        { width: size, height: size },
        animatedStyle,
      ]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G fill="none" stroke={stroke} strokeWidth={STROKE}>
          {preset.rings.map((ring) => (
            <Path
              key={ring.opacity}
              d={BLOB}
              vectorEffect="non-scaling-stroke"
              strokeOpacity={ring.opacity}
              transform={`translate(${x} ${y}) scale(${(ring.scale / maxScale) * unit}) rotate(${preset.rotation})`}
            />
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute' },
});

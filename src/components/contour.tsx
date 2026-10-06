import { StyleSheet, View, type ViewStyle } from 'react-native';
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
 * **Decoration on an emergency app.** It is `pointerEvents="none"` and hidden from the accessibility
 * tree, so it can never intercept a tap or be read out; keep it in corners, never under body text.
 */

const BLOB =
  'M10,-95 C70,-105 120,-40 100,15 C85,60 40,110 -15,95 C-70,80 -115,40 -100,-15 C-88,-60 -45,-88 10,-95Z';

/** The blob's authored radius, in its own units — used to normalise a ring to the box. */
const BLOB_RADIUS = 110;
const STROKE = 1.3;

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
}: Props) {
  const scheme = useColorScheme();
  const preset = PRESETS[variant];
  const stroke = toneColour[tone](scheme);

  // The largest ring is the box's 92%, so every ring shares one scale rather than each preset
  // carrying its own absolute numbers.
  const maxScale = Math.max(...preset.rings.map((ring) => ring.scale));
  const unit = (0.92 * size) / BLOB_RADIUS;
  const x = ANCHOR[corner].x * size;
  const y = ANCHOR[corner].y * size;

  return (
    <View
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
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute' },
});

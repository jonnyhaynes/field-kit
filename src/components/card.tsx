import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { bevelStyle, cardSurface, hairline, type CardTone } from '@/constants/surface';
import { Bevel, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type { CardTone };

/**
 * The panel every screen used to redraw for itself.
 *
 * Before this existed, the card was an identical `borderRadius` + hairline + padding + fill block
 * copy-pasted across a dozen files, with eight more local wrappers over the top. That was survivable
 * while a card was "a fill and a border"; it is not once a raised surface is a four-part stack,
 * because a stack that is not identical everywhere reads as hand-made.
 *
 * `tone` is the four shapes those copies actually took. Keeping them named means a screen says what
 * kind of surface it wants rather than restating the recipe, and the surface system can be turned on
 * by editing `surface.ts` rather than a dozen files.
 */
type Props = {
  children: ReactNode;
  /** Default `raised`. Prefer a tone over `style` for anything that repeats. */
  tone?: CardTone;
  testID?: string;
  /** Escape hatch for a genuine one-off (a bespoke frame, not a surface). */
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, tone = 'raised', testID, style }: Props) {
  const scheme = useColorScheme();

  return (
    <View testID={testID} style={[styles.card, cardSurface(tone, scheme), style]}>
      {/* Only a raised panel catches light. A notice or an outline sits on the canvas, not above it. */}
      {tone === 'raised' ? (
        <View pointerEvents="none" style={bevelStyle(Bevel[scheme], Radius.md)} />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: hairline,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});

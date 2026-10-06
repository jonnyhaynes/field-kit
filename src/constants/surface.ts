/**
 * The surface compositions — the four-part stack, named once.
 *
 * `theme.ts` holds the raw tokens (the ramp, the bevel colours, the elevation levels); this composes
 * them into the shapes a component actually applies. It lives apart from the tokens for the same
 * reason `type.ts` does: a screen should ask for "a raised panel" rather than restating a fill, a
 * stroke and a shadow, which is how the app came to have a dozen slightly different cards.
 *
 * The stack is, top to bottom:
 *
 *   lit top edge      a 1px line, ~10% white — the single most effective move
 *   graduated fill    panel colour, a shade lighter at the top
 *   hairline stroke   present, but no longer the shape
 *   soft drop shadow  depth, not decoration
 *
 * In the Contour register the fill is the whole of the brand's expression: the brand action is a flat
 * hi-vis fill rather than a gradient, and depth comes from the surface ramp and a near-black shadow
 * rather than a glow. Pure functions of the scheme, so they are unit-testable without a device.
 */

import { StyleSheet, type ViewStyle } from 'react-native';

import { Colors, Elevation, Radius, Surfaces, type Scheme } from '@/constants/theme';

/**
 * The hairline stroke.
 *
 * The design calls for a stroke along a panel's edge, thinner and quieter than the fill. It is the
 * `line` token rather than a brand tint: on pine and hi-vis a tinted edge whispers, and the register
 * keeps the brand for the action, not for every border.
 */
function stroke(scheme: Scheme): string {
  return Colors[scheme].border;
}

/**
 * The graduated fill, as an `experimental_backgroundImage` gradient string.
 *
 * Derived from the ramp rather than a second set of literals: in both schemes the top is the lighter
 * of the two adjacent steps, so the panel reads as lit from above. React Native parses this CSS
 * string itself (`linear-gradient(to bottom, …)`), so no gradient library is needed.
 */
export function cardFill(scheme: Scheme): string {
  const top = scheme === 'dark' ? Surfaces.dark.control : Surfaces.light.panel;
  const bottom = scheme === 'dark' ? Surfaces.dark.panel : Surfaces.light.control;
  return `linear-gradient(to bottom, ${top}, ${bottom})`;
}

/**
 * A raised panel: the graduated fill over the solid panel colour, a hairline stroke and the panel
 * shadow.
 *
 * `backgroundColor` is the solid panel *and* the gradient's base, so a platform that cannot draw the
 * gradient — the API is still experimental — shows a plain panel rather than nothing, which is the
 * one degradation that would look broken.
 */
export function raisedSurface(scheme: Scheme): ViewStyle {
  return {
    backgroundColor: Surfaces[scheme].panel,
    experimental_backgroundImage: cardFill(scheme),
    borderColor: stroke(scheme),
    ...Elevation[scheme].panel,
  };
}

/**
 * A control: something tappable sitting on a panel. One step up the ramp from the panel, with the
 * control shadow. Used by secondary buttons, chips and inputs so they cannot disagree about depth.
 */
export function controlSurface(scheme: Scheme): ViewStyle {
  return {
    backgroundColor: Surfaces[scheme].control,
    borderColor: stroke(scheme),
    ...Elevation[scheme].control,
  };
}

/**
 * A filled brand action — the thing a screen exists to do, and the app's whole action vocabulary.
 *
 * A flat hi-vis fill, not a gradient: the colour *is* the identity, and printing it once reads
 * harder than washing it across a surface. `borderColor` is transparent so the fill is the shape.
 */
export function brandSurface(scheme: Scheme): ViewStyle {
  return {
    backgroundColor: Colors[scheme].brand,
    borderColor: 'transparent',
    ...Elevation[scheme].control,
  };
}

/**
 * The four shapes the card idiom actually took, before it was one component. `outline` and `dashed`
 * are deliberately *not* raised, and keep the neutral stroke: they are the quiet empty states, which
 * sit on the canvas rather than above it.
 */
export type CardTone = 'raised' | 'tinted' | 'outline' | 'dashed';

/** The surface for a card tone. The `never` guard means a new tone fails `tsc --noEmit`. */
export function cardSurface(tone: CardTone, scheme: Scheme): ViewStyle {
  switch (tone) {
    case 'raised':
      return raisedSurface(scheme);
    case 'tinted':
      return { backgroundColor: Surfaces[scheme].selected, borderColor: 'transparent' };
    case 'outline':
      return { borderColor: Colors[scheme].border };
    case 'dashed':
      return { borderColor: Colors[scheme].border, borderStyle: 'dashed' };
    default: {
      const unhandled: never = tone;
      return unhandled;
    }
  }
}

/**
 * The lit top edge, as a view to place absolutely inside a surface.
 *
 * A view rather than an inset `boxShadow` because this is the move the whole system rests on, so it
 * must not depend on a newer style API. `color` is the panel bevel on a panel, or the stronger
 * `BevelOnColor` on a filled control; `radius` matches the container's corners so the line sits
 * inside them.
 */
export function bevelStyle(color: string, radius: number = Radius.md): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: color,
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
  };
}

/** The hairline stroke width every surface uses, so cards and controls stay in step. */
export const hairline = StyleSheet.hairlineWidth;

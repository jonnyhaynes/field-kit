/**
 * Field Kit design tokens.
 *
 * **The register.** Contour: a hi-vis signal (`#D7F94A`) on pine (`#0F1A16`), with green-tinted
 * neutrals rather than grey. The name and the mark come from the OS map — contour rings on a pine
 * field — so the identity is the app's own subject rather than a borrowed look. Dark-first, with a
 * warm stone light theme designed alongside it rather than treated as the variant nobody looked at.
 *
 * This *replaces* the violet register (violet brand, magenta gradients, round Nunito Sans) shipped in
 * #49 and #50. That reversal is recorded in `docs/plans/field-kit-contour.md`, which also points back
 * at the register it replaced: `docs/plans/field-kit-violet-register.md`.
 *
 * **What did not change, because it is safety rather than style:** red is the emergency action and
 * nothing else, records stay on the device, offline is the default path, and the app still never
 * diagnoses. Guidance is reproduced, never authored.
 *
 * Values are the sRGB equivalents of the OKLCH tokens authored in
 * `docs/design/field-kit-contour.html`. React Native's colour parser does not understand `oklch()`,
 * so the hex is the shipped value. The neutrals carry a real green tint (hue ~155) rather than being
 * grey — that tint is what makes the surfaces read as one family with the pine canvas.
 *
 * One thing is measured rather than eyeballed, and must stay true if this palette is edited: every
 * text-on-surface pair the app actually renders is checked by
 * `src/constants/__tests__/contrast.test.ts` in both schemes, and the suite fails below 4.5:1 (3:1
 * for large text). Changing a value here means re-running it.
 */

import '@/global.css';

/**
 * The surface ramp, ordered by how much light each step catches.
 *
 * Three fills, not four: the plan names one *raised* step for chips, inputs and selected states, so
 * `control` and `selected` share it. The only place the two were visually distinct was the active tab
 * background, and that is a hi-vis disc from slice 3 on — keeping a fourth step nobody asked for
 * would be a token that exists only to be wrong. The three background keys on `Colors` below are
 * derived from this, so there is one source for the ramp rather than two that can drift.
 */
export const Surfaces = {
  light: {
    canvas: '#F1EFE8',
    panel: '#FFFFFF',
    control: '#E2DED2',
    selected: '#E2DED2',
  },
  dark: {
    canvas: '#0F1A16',
    panel: '#17261F',
    control: '#1E3229',
    selected: '#1E3229',
  },
} as const;

export const Colors = {
  light: {
    text: '#10201A',
    textSecondary: '#4A5A52',
    /** Quieter than `textSecondary`, for the small-caps label marker. */
    muted: '#5F6D65',
    background: Surfaces.light.canvas,
    backgroundElement: Surfaces.light.panel,
    backgroundSelected: Surfaces.light.selected,
    border: '#DDD8CB',
    /** The hi-vis brand, and the app's action colour: every primary action is filled with this. */
    brand: '#D7F94A',
    brandInk: '#0F1A16',
    /** The hi-vis as a *text* colour on the light canvas — the fill itself fails there. */
    brandText: '#4B6B0E',
    /** The AED / data accent, and the numbered badges. Never the emergency. */
    glacier: '#8ED8F8',
    glacierText: '#0B6E99',
    /** The emergency action, and nothing else. */
    rescue: '#E5192B',
    rescueInk: '#FFFFFF',
    /** The bottom pill, drawn as ink in both schemes. */
    bar: '#10201A',
  },
  dark: {
    text: '#F1EFE8',
    textSecondary: '#A9BDB3',
    muted: '#8FA69A',
    background: Surfaces.dark.canvas,
    backgroundElement: Surfaces.dark.panel,
    backgroundSelected: Surfaces.dark.selected,
    border: '#24382F',
    brand: '#D7F94A',
    brandInk: '#0F1A16',
    brandText: '#D7F94A',
    glacier: '#8ED8F8',
    glacierText: '#8ED8F8',
    rescue: '#E5192B',
    rescueInk: '#FFFFFF',
    bar: '#070D0B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * The lit top edge on a raised surface — a bevel, not a border. A border draws the shape; this
 * suggests the material, as though the panel were catching light from above.
 */
export const Bevel = {
  light: 'rgba(255, 255, 255, 0.90)',
  dark: 'rgba(255, 255, 255, 0.10)',
} as const;

/**
 * The lit top edge on a *coloured* surface — a filled brand or rescue button.
 *
 * The panel bevel above is about 10% white, which reads on a dark panel and disappears on hi-vis or
 * red, so a filled control needs its own, stronger edge. One value for both schemes, because it sits
 * on the button's own colour rather than on the canvas.
 */
export const BevelOnColor = 'rgba(255, 255, 255, 0.32)';

/**
 * Elevation, as a stack rather than a shadow.
 *
 * Every raised surface gets the same four parts: a hairline stroke, the lit top edge above, a filled
 * body, and a soft drop below. Three levels, and nothing in between.
 *
 * **The shadow is near-black, not brand-hued.** The violet register tinted its shadows because a
 * violet shadow on a violet surface read as light; on pine the depth comes from the surface ramp, and
 * a tinted shadow would read as glow. Pure black keeps the surfaces grounded.
 *
 * `attention` carries a coloured shadow in the emergency red — the one element allowed to look like it
 * is emitting light. **iOS only:** Android's `elevation` always draws a grey shadow and ignores the
 * colour, so on Android the red action gets depth but no glow. Acceptable; not worth a library.
 */
export const Elevation = {
  light: {
    panel: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 24,
      shadowOpacity: 0.12,
      elevation: 2,
    },
    control: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 28,
      shadowOpacity: 0.16,
      elevation: 4,
    },
    attention: {
      shadowColor: '#E5192B',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 26,
      shadowOpacity: 0.35,
      elevation: 8,
    },
  },
  dark: {
    panel: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 26,
      shadowOpacity: 0.5,
      elevation: 3,
    },
    control: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 30,
      shadowOpacity: 0.55,
      elevation: 5,
    },
    attention: {
      shadowColor: '#E5192B',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 26,
      shadowOpacity: 0.55,
      elevation: 8,
    },
  },
} as const;

/** The two themes the app ships. Nothing else is a theme. */
export type Scheme = 'light' | 'dark';

/**
 * The theme this app opens in when the device expresses no preference.
 *
 * Dark, because the app is built for the dark. See `@/hooks/use-color-scheme` — that hook is the
 * single place this decision is made.
 */
export const DefaultScheme: Scheme = 'dark';

/**
 * The single rule for turning a raw platform colour scheme into one of our two themes.
 *
 * Both the native and the web scheme hooks call this, so the dark-first decision lives in one place
 * rather than being restated per platform — which is how the two drift apart.
 */
export function resolveScheme(device: string | null | undefined): Scheme {
  return device === 'light' || device === 'dark' ? device : DefaultScheme;
}

/** The 1-4-9 rhythm: 4px micro, 16px component, 36px section. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Radii are generous by design: a rounded surface reads as a material, a square one as a box. */
export const Radius = {
  sm: 12,
  md: 18,
  lg: 22,
  xl: 26,
  pill: 999,
} as const;

/** Minimum touch target. Nothing interactive may render smaller than this. */
export const MinTarget = 52;

export const MaxContentWidth = 800;

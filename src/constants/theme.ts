/**
 * Field Kit design tokens.
 *
 * **The register.** A violet-register emergency tool: a violet brand on violet-tinted neutrals, large
 * radii, and light emitted from gradients rather than paper-like flat fills. Still dark-first, because
 * the moment this app is needed may well be in the dark, and light is designed alongside it rather
 * than treated as the variant nobody looked at.
 *
 * This *replaces* the earlier register — deliberately cool near-black, one fluorescent amber signal.
 * That decision was reversed by the owner against a reference they liked; the record of what changed
 * and why is `docs/plans/field-kit-violet-register.md`.
 *
 * **What did not change, because it is safety rather than style:** red is the emergency action and
 * nothing else, records stay on the device, offline is the default path, and the app still never
 * diagnoses. Every other red in the old palette has gone.
 *
 * Values are the sRGB equivalents of the OKLCH tokens authored in
 * `docs/design/field-kit-redesign.html` and `docs/design/field-kit-brandkit.html`. React Native's
 * colour parser does not understand `oklch()`, so the hex is the shipped value and the OKLCH is kept
 * beside it for traceability. The neutrals carry a real violet tint (hue ~290) rather than being grey
 * — that tint is what makes the surfaces read as one family with the brand.
 *
 * One thing is measured rather than eyeballed, and must stay true if this palette is edited: every
 * text-on-surface pair is checked by `scripts/contrast.ts` in both schemes, and the suite fails below
 * 4.5:1 (3:1 for large text). Changing a value here means re-running it.
 */

import '@/global.css';

/**
 * The surface ramp, ordered by how much light each step catches.
 *
 * The three background keys on `Colors` below are derived from this, so there is one source for the
 * ramp rather than two that can drift apart.
 */
export const Surfaces = {
  light: {
    canvas: '#F3F4F9', // oklch(97% 0.007 277)
    panel: '#FFFFFF', // oklch(100% 0.000 90)
    control: '#F1F2F8', // oklch(96% 0.008 279)
    selected: '#E9E7F6', // oklch(93% 0.020 292)
  },
  dark: {
    canvas: '#0B0A12', // oklch(15% 0.017 290)
    panel: '#16141F', // oklch(20% 0.022 293)
    control: '#1E1B2A', // oklch(23% 0.029 293)
    selected: '#272238', // oklch(27% 0.041 294)
  },
} as const;

export const Colors = {
  light: {
    text: '#14121C', // oklch(19% 0.020 294)
    textSecondary: '#655F7A', // oklch(50% 0.043 295) - on `selected` this measured 4.40 at L53
    background: Surfaces.light.canvas,
    backgroundElement: Surfaces.light.panel,
    backgroundSelected: Surfaces.light.selected,
    border: '#E3E2EE', // oklch(92% 0.016 290)
    /** The brand violet, and the app's action colour: every primary action is filled with this. */
    brand: '#4B21F0', // oklch(48% 0.273 278)
    /** The two ends of a violet field, for a gradient surface. */
    brand2: '#7C4DFF', // oklch(58% 0.247 288)
    brandDeep: '#3A14D6', // oklch(43% 0.256 275)
    brandInk: '#FFFFFF',
    /** Accents. Decorative and categorical — they carry state, never the emergency. */
    pink: '#DE2468', // oklch(59% 0.219 7)
    teal: '#0A7A5C', // oklch(52% 0.102 168) - as a *label* it measured 2.84 at L67
    amber: '#B97F00', // oklch(64% 0.134 77)
    /** The emergency action, and nothing else. */
    rescue: '#E11D38', // oklch(58% 0.223 22)
    rescueInk: '#FFFFFF',
  },
  dark: {
    text: '#F4F2FA', // oklch(96% 0.011 298)
    textSecondary: '#A8A2BE', // oklch(73% 0.041 295)
    background: Surfaces.dark.canvas,
    backgroundElement: Surfaces.dark.panel,
    backgroundSelected: Surfaces.dark.selected,
    border: '#312B45', // oklch(31% 0.047 294)
    brand: '#6D4BFF', // oklch(56% 0.250 284)
    brand2: '#9A6BFF', // oklch(65% 0.211 294)
    brandDeep: '#3A14D6', // oklch(43% 0.256 275)
    brandInk: '#FFFFFF',
    pink: '#FF3E7F', // oklch(67% 0.229 6)
    teal: '#2FD9A8', // oklch(79% 0.151 168)
    amber: '#FFC24B', // oklch(85% 0.148 81)
    rescue: '#E51D38', // oklch(59% 0.226 23) - white on it measured 3.67 at L65
    rescueInk: '#FFFFFF',
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
 * The panel bevel above is about 10% white, which reads on a dark panel and disappears on violet or
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
 * **The shadow colour is the brand hue, never black.** A neutral shadow on a tinted surface reads as
 * dirt; a violet shadow reads as light. That is most of the difference between a component kit and a
 * designed app. Split by scheme because the opacity has to be: a shadow that reads as depth on a
 * violet near-black is a bruise on a white canvas.
 *
 * `attention` carries a coloured shadow in the emergency red — the one element allowed to look like it
 * is emitting light. **iOS only:** Android's `elevation` always draws a grey shadow and ignores the
 * colour, so on Android the red action gets depth but no glow. Acceptable; not worth a library.
 */
export const Elevation = {
  light: {
    panel: {
      shadowColor: '#3C1EA0',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 24,
      shadowOpacity: 0.16,
      elevation: 2,
    },
    control: {
      shadowColor: '#3C1EA0',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 28,
      shadowOpacity: 0.2,
      elevation: 4,
    },
    attention: {
      shadowColor: '#E11D38',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 26,
      shadowOpacity: 0.35,
      elevation: 8,
    },
  },
  dark: {
    panel: {
      shadowColor: '#160A45',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 26,
      shadowOpacity: 0.55,
      elevation: 3,
    },
    control: {
      shadowColor: '#160A45',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 30,
      shadowOpacity: 0.6,
      elevation: 5,
    },
    attention: {
      shadowColor: '#E00E2C',
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

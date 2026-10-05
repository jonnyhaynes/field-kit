/**
 * Field Kit design tokens.
 *
 * The register is field equipment rather than a health product: a cool near-black base, one
 * fluorescent signal for action, and rescue red doing exactly one job. It deliberately avoids the
 * clinical blue/teal a first aid app is expected to wear, and it is dark-first, because the moment
 * this app is needed may well be in the dark.
 *
 * Values are the sRGB equivalents of the design's OKLCH tokens (React Native's colour parser does
 * not understand `oklch()`). The OKLCH figure is kept in a comment so the two stay traceable.
 *
 * Two things were measured rather than eyeballed, and both are worth keeping true if this palette is
 * edited:
 *
 *  1. Every value is IN sRGB GAMUT. The design's signal wanted chroma 0.19 at L 80 / hue 72, which
 *     sRGB cannot show and a converter silently clamps — so the hex would no longer be the OKLCH in
 *     the comment. The chroma below is the most sRGB can hold at that lightness and hue, which keeps
 *     the intent ("as fluorescent as the display allows") and the comment honest.
 *  2. `rescue` is at L 58 rather than the design's 63, because at 63 white-on-red measured 3.93 and
 *     this is the one label that must never be hard to read. At 58 it is 4.83, and still 4.13 against
 *     the near-black background. Do not lighten it back without re-measuring.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#090E12', // oklch(16% 0.012 250)
    textSecondary: '#50565D', // oklch(45% 0.014 250)
    background: '#F6F9FB', // oklch(98% 0.004 250)
    backgroundElement: '#FFFFFF', // oklch(100% 0 0)
    backgroundSelected: '#E7ECF0', // oklch(94% 0.008 250)
    border: '#CFD5DB', // oklch(87% 0.010 250)
    accent: '#DF9200', // oklch(72% 0.154 72) - the signal, as saturated as sRGB allows
    accentInk: '#231200', // oklch(20% 0.047 72)
    rescue: '#C60014', // oklch(52% 0.213 27)
    rescueInk: '#FFFFFF',
  },
  dark: {
    text: '#F3F5F8', // oklch(97% 0.004 250)
    textSecondary: '#A5ACB2', // oklch(74% 0.012 250)
    background: '#07090C', // oklch(14% 0.008 250)
    backgroundElement: '#101418', // oklch(19% 0.010 250)
    backgroundSelected: '#1B2025', // oklch(24% 0.012 250)
    border: '#292E35', // oklch(30% 0.014 250)
    accent: '#FFA913', // oklch(80% 0.168 72) - the signal, as saturated as sRGB allows
    accentInk: '#231200', // oklch(20% 0.047 72)
    rescue: '#E50019', // oklch(58% 0.237 27) - L58 not 63, for a legible label. See the header.
    rescueInk: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

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

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

/** Minimum touch target. Nothing interactive may render smaller than this. */
export const MinTarget = 52;

export const MaxContentWidth = 800;

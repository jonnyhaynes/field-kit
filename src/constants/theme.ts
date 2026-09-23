/**
 * Field Kit design tokens.
 *
 * The palette is warm graphite and hi-vis amber, with rescue red reserved for one
 * thing only: the emergency action. It deliberately avoids the clinical blue/teal
 * that a first aid app is expected to wear, and it works in daylight and in the dark,
 * because that is where this app gets used.
 *
 * Values are the sRGB equivalents of the design's OKLCH tokens (React Native's colour
 * parser does not understand `oklch()`). The OKLCH figure is kept in a comment so the
 * two stay traceable to each other.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2A2724', // oklch(23% 0.012 85)
    textSecondary: '#6B6560', // oklch(46% 0.012 85)
    background: '#F7F5F0', // oklch(97.2% 0.006 85)
    backgroundElement: '#FDFCFA', // oklch(99% 0.003 85)
    backgroundSelected: '#EDE9E2',
    border: '#E3DFD8', // oklch(89% 0.008 85)
    accent: '#EFB01F', // oklch(80% 0.155 78) - hi-vis amber
    accentInk: '#3D2E10', // oklch(28% 0.06 78)
    rescue: '#B3261E', // oklch(48% 0.185 25)
    rescueInk: '#FFFFFF',
  },
  dark: {
    text: '#F0EDE8', // oklch(94% 0.006 85)
    textSecondary: '#A8A29A', // oklch(70% 0.010 85)
    background: '#1C1917', // oklch(19% 0.008 85)
    backgroundElement: '#262220', // oklch(24% 0.009 85)
    backgroundSelected: '#332E2A',
    border: '#3B3632', // oklch(33% 0.010 85)
    accent: '#F2B837', // oklch(82% 0.150 78)
    accentInk: '#2A1F0A',
    rescue: '#CE3B2E', // oklch(58% 0.180 25)
    rescueInk: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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

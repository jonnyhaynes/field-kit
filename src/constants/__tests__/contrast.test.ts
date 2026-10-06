import { describe, expect, it } from '@jest/globals';

import { Colors, Surfaces } from '../theme';

/**
 * The contrast gate.
 *
 * The register changed wholesale and light is a new theme, so every text-on-surface pair the app
 * actually renders is *measured* rather than assumed. The previous palette's results do not carry
 * over, which is the entire reason this exists: a warm, tinted palette is exactly the kind that looks
 * fine on a monitor and fails outdoors.
 *
 * WCAG 2.1: 4.5:1 for body text, 3:1 for large text (≥18.66px bold, or ≥24px). Thresholds are per
 * pair rather than global, because a display line and a 13px caption have different obligations.
 * Pairs are named for where they render, not for the token, so a reader can check the claim.
 *
 * The bar is ink in **both** schemes, so its labels take the dark-scheme `text`/`textSecondary`
 * values even under light — that is why the (light) bar rows below borrow `Colors.dark`.
 */

type Pair = [label: string, foreground: string, background: string, minimum: number];

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = channel(parseInt(h.slice(0, 2), 16));
  const g = channel(parseInt(h.slice(2, 4), 16));
  const b = channel(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const { dark, light } = Colors;

// [label, foreground, background, minimum]
const pairs: Pair[] = [
  // Body text, both canvases.
  ['body text on the canvas (dark)', dark.text, Surfaces.dark.canvas, 4.5],
  ['body text on the canvas (light)', light.text, Surfaces.light.canvas, 4.5],
  ['body text on a panel (light)', light.text, Surfaces.light.panel, 4.5],
  // Secondary text where the boards actually place it.
  ['secondary text on a panel (dark)', dark.textSecondary, Surfaces.dark.panel, 4.5],
  ['secondary text on the canvas (light)', light.textSecondary, Surfaces.light.canvas, 4.5],
  // The muted label marker on a dark panel.
  ['a label on a panel (dark)', dark.muted, Surfaces.dark.panel, 4.5],
  // The two filled accents, with their ink.
  ['the ink on a hi-vis fill', dark.brandInk, dark.brand, 4.5],
  ['the ink on a glacier fill', dark.brandInk, dark.glacier, 4.5],
  // The accents as text, where the fill itself would fail.
  ['the hi-vis as text on stone', light.brandText, Surfaces.light.canvas, 4.5],
  ['the glacier as text on stone', light.glacierText, Surfaces.light.canvas, 4.5],
  // The emergency action — the one red.
  ['the rescue ink on the emergency fill', dark.rescueInk, dark.rescue, 4.5],
  // The bottom pill, ink in both schemes.
  ['a tab label on the bar (dark)', dark.text, dark.bar, 4.5],
  ['a tab label on the bar (light)', dark.text, light.bar, 4.5],
  ['a secondary tab label on the bar (dark)', dark.textSecondary, dark.bar, 4.5],
  ['a secondary tab label on the bar (light)', dark.textSecondary, light.bar, 4.5],
];

describe('the contrast gate', () => {
  it.each(pairs)('%s', (_label, foreground, background, minimum) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum);
  });
});

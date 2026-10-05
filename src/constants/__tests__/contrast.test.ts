import { describe, expect, it } from '@jest/globals';

import { Colors, Surfaces } from '../theme';

/**
 * The contrast gate.
 *
 * The palette changed wholesale and light is effectively a new theme, so every text-on-surface pair
 * the app actually renders is *measured* rather than assumed. The previous palette's results do not
 * carry over, which is the entire reason this exists: a warm, tinted palette is exactly the kind that
 * looks fine on a monitor and fails outdoors.
 *
 * WCAG 2.1: 4.5:1 for body text, 3:1 for large text (≥18.66px bold, or ≥24px). Thresholds are per
 * pair rather than global, because a display line and a 13px caption have different obligations.
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

describe.each(['light', 'dark'] as const)('%s theme contrast', (scheme) => {
  const c = Colors[scheme];
  const s = Surfaces[scheme];

  // [label, foreground, background, minimum]
  const pairs: Pair[] = [
    ['body text on the canvas', c.text, s.canvas, 4.5],
    ['body text on a panel', c.text, s.panel, 4.5],
    ['body text on a control', c.text, s.control, 4.5],
    ['body text on a selected control', c.text, s.selected, 4.5],
    ['secondary text on the canvas', c.textSecondary, s.canvas, 4.5],
    ['secondary text on a panel', c.textSecondary, s.panel, 4.5],
    ['secondary text on a selected control', c.textSecondary, s.selected, 4.5],
    ['a display heading on the canvas', c.text, s.canvas, 3],
    ['the brand ink on a brand fill', c.brandInk, c.brand, 4.5],
    ['the rescue ink on the emergency fill', c.rescueInk, c.rescue, 4.5],
    ['the pink chip label on a panel', c.pink, s.panel, 4.5],
    ['the teal chip label on a panel', c.teal, s.panel, 4.5],
  ];

  it.each(pairs)('%s', (_label, foreground, background, minimum) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum);
  });
});

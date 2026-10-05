import { describe, expect, it } from '@jest/globals';

import {
  bevelStyle,
  brandFill,
  brandSurface,
  cardFill,
  cardSurface,
  controlSurface,
  raisedSurface,
  type CardTone,
} from '../surface';
import { Bevel, Colors, Elevation, Radius, Surfaces } from '../theme';

/** The brand-tinted hairline a raised surface carries instead of the neutral border. */
const VIOLET_STROKE = /^rgba\(154, 107, 255/;

describe('cardFill', () => {
  it('draws a top-to-bottom gradient from the ramp, lighter at the top', () => {
    expect(cardFill('dark')).toBe(
      `linear-gradient(to bottom, ${Surfaces.dark.control}, ${Surfaces.dark.panel})`,
    );
    expect(cardFill('light')).toBe(
      `linear-gradient(to bottom, ${Surfaces.light.panel}, ${Surfaces.light.control})`,
    );
  });

  it('always ends on the panel colour, so the gradient agrees with the solid base', () => {
    for (const scheme of ['light', 'dark'] as const) {
      expect(cardFill(scheme)).toContain(Surfaces[scheme].panel);
    }
  });
});

describe('raisedSurface', () => {
  it('carries the solid panel as its fallback base, in case the gradient does not render', () => {
    expect(raisedSurface('dark').backgroundColor).toBe(Surfaces.dark.panel);
    expect(raisedSurface('light').backgroundColor).toBe(Surfaces.light.panel);
  });

  it('layers the gradient over that base', () => {
    expect(raisedSurface('dark').experimental_backgroundImage).toBe(cardFill('dark'));
  });

  it('strokes the edge in the brand hue rather than a neutral border', () => {
    const surface = raisedSurface('dark');
    expect(String(surface.borderColor)).toMatch(VIOLET_STROKE);
    expect(surface.borderColor).not.toBe(Colors.dark.border);
    expect(surface.shadowOpacity).toBe(Elevation.dark.panel.shadowOpacity);
    expect(surface.elevation).toBe(Elevation.dark.panel.elevation);
  });
});

describe('controlSurface', () => {
  it('is one step up the ramp, with the control shadow', () => {
    const surface = controlSurface('dark');
    expect(surface.backgroundColor).toBe(Surfaces.dark.control);
    expect(String(surface.borderColor)).toMatch(VIOLET_STROKE);
    expect(surface.elevation).toBe(Elevation.dark.control.elevation);
  });
});

describe('brandSurface', () => {
  it('fills with the brand and keeps the control depth', () => {
    const surface = brandSurface('light');
    expect(surface.backgroundColor).toBe(Colors.light.brand);
    expect(surface.borderColor).toBe('transparent');
    expect(surface.elevation).toBe(Elevation.light.control.elevation);
  });

  it('lays the violet field over the flat brand, so it degrades to a solid fill', () => {
    expect(brandSurface('dark').experimental_backgroundImage).toBe(brandFill('dark'));
    expect(brandFill('dark')).toBe(
      `linear-gradient(150deg, ${Colors.dark.brand2}, ${Colors.dark.brandDeep})`,
    );
  });
});

describe('cardSurface', () => {
  const tones: readonly CardTone[] = ['raised', 'tinted', 'outline', 'dashed'];

  it('maps every tone to its own shape', () => {
    expect(cardSurface('raised', 'dark')).toEqual(raisedSurface('dark'));
    expect(cardSurface('tinted', 'dark')).toEqual({
      backgroundColor: Surfaces.dark.selected,
      borderColor: 'transparent',
    });
    expect(cardSurface('outline', 'dark')).toEqual({ borderColor: Colors.dark.border });
    expect(cardSurface('dashed', 'dark')).toEqual({
      borderColor: Colors.dark.border,
      borderStyle: 'dashed',
    });
  });

  it('leaves the quiet tones un-raised, so only a panel sits above the canvas', () => {
    for (const tone of tones.filter((tone) => tone !== 'raised')) {
      const surface = cardSurface(tone, 'dark');
      expect(surface.elevation).toBeUndefined();
      expect(surface.shadowOpacity).toBeUndefined();
    }
  });
});

describe('bevelStyle', () => {
  it('is a 1px lit line pinned to the top, matching the container radius', () => {
    const style = bevelStyle(Bevel.dark, Radius.md);
    expect(style.position).toBe('absolute');
    expect(style.top).toBe(0);
    expect(style.height).toBe(1);
    expect(style.backgroundColor).toBe(Bevel.dark);
    expect(style.borderTopLeftRadius).toBe(Radius.md);
    expect(style.borderTopRightRadius).toBe(Radius.md);
  });
});

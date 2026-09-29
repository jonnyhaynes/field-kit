import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { buildMapStyle } from '../style';
import { mapAssetUrls } from '../urls';

/**
 * Guards the bug that made the map blank on a Retina simulator: MapLibre appends `@2x` to the
 * sprite URLs on a high-DPI device, so it asks for `sprite@2x.json` and `sprite@2x.png` *instead
 * of* the 1x pair. Shipping only the 1x descriptor failed the sprite load, which failed the
 * style. Both densities have to be there.
 */

const REPO = process.cwd();
const FLAVOURS = ['light', 'dark'] as const;

type SpriteEntry = { width: number; height: number; x: number; y: number; pixelRatio: number };
type Sprite = Record<string, SpriteEntry>;

function descriptor(flavour: (typeof FLAVOURS)[number], density: '1x' | '2x'): Sprite {
  const file = density === '2x' ? 'sprite-2x.json' : 'sprite.json';
  return JSON.parse(readFileSync(join(REPO, 'assets/maps/sprites', flavour, file), 'utf8'));
}

/** Every icon the built style asks for, wherever it appears. */
function iconImages(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((entry) => iconImages(entry, found));
    return found;
  }
  if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'icon-image' && typeof value === 'string') found.push(value);
      else iconImages(value, found);
    }
  }
  return found;
}

describe('bundled sprite assets', () => {
  it.each(FLAVOURS)('ships both densities for the %s sprite', (flavour) => {
    for (const file of ['sprite.json', 'sprite.png', 'sprite-2x.json', 'sprite-2x.png']) {
      expect(existsSync(join(REPO, 'assets/maps/sprites', flavour, file))).toBe(true);
    }
  });

  it.each(FLAVOURS)('ships a real 2x descriptor for %s, not a copy of the 1x one', (flavour) => {
    const base = descriptor(flavour, '1x');
    const retina = descriptor(flavour, '2x');

    expect(Object.keys(retina).sort()).toEqual(Object.keys(base).sort());

    const key = Object.keys(base)[0];
    expect(retina[key].width).toBe(base[key].width * 2);
    expect(retina[key].pixelRatio).toBe(2);
    expect(base[key].pixelRatio).toBe(1);
  });

  it('has an entry for every icon the style references', () => {
    const style = buildMapStyle({
      urls: mapAssetUrls('file:///data/maps', 'light'),
      scheme: 'light',
    });

    const icons = [...new Set(iconImages(style.layers))];
    expect(icons.length).toBeGreaterThan(0);

    const sprite = descriptor('light', '1x');
    expect(icons.filter((icon) => !(icon in sprite))).toEqual([]);
  });
});

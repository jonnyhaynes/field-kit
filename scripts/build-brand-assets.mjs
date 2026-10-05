/**
 * Generates the app icons and splash mark from the Field Kit mark.
 *
 * The mark is four modular tiles of a first-aid cross around a single red point — the emergency at
 * the centre of everything. `assets/brand/mark.svg` is the single source; the geometry below is the
 * same numbers, kept here so the PNGs can be produced without a browser or a native rasteriser.
 *
 * Why a script rather than five committed PNGs nobody can trace: the same reason `build-fonts.sh` and
 * the AED pipeline exist. Run it when the mark changes.
 *
 *   npm run brand
 *
 * `jimp-compact` is a *transitive* dependency (it arrives with `@expo/image-utils`, which Expo CLI
 * uses for image processing). It is deliberately not a direct dependency: adding a rasteriser to the
 * app's manifest to draw five files that change once a year would be the wrong trade. The script fails
 * loudly if it cannot resolve it, rather than writing a half-drawn icon.
 */

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let Jimp;
try {
  Jimp = require('jimp-compact');
} catch {
  throw new Error('jimp-compact is not installed — run `npm install` first.');
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'assets/images');

// --- the mark, in a 96-unit box (mirrors assets/brand/mark.svg) -------------------------------
const BOX = 96;
const MODULES = [
  { x: 31, y: 1, w: 34, h: 34, r: 12 },
  { x: 1, y: 31, w: 34, h: 34, r: 12 },
  { x: 61, y: 31, w: 34, h: 34, r: 12 },
  { x: 31, y: 61, w: 34, h: 34, r: 12 },
];
const DOT = { cx: 48, cy: 48, r: 9 };

const VIOLET_TOP = [0x9a, 0x6b, 0xff];
const VIOLET_BOTTOM = [0x3a, 0x14, 0xd6];
const RED = [0xe5, 0x1d, 0x38];
const WHITE = [0xff, 0xff, 0xff];
const CANVAS = [0x0b, 0x0a, 0x12];

const SUPERSAMPLE = 3;

function insideRoundRect(px, py, { x, y, w, h, r }) {
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function insideMark(px, py) {
  for (const m of MODULES) if (insideRoundRect(px, py, m)) return true;
  return false;
}

function insideDot(px, py) {
  const dx = px - DOT.cx;
  const dy = py - DOT.cy;
  return dx * dx + dy * dy <= DOT.r * DOT.r;
}

/** A diagonal violet field, the same 150deg the surfaces use. */
function field(t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return [0, 1, 2].map((i) =>
    Math.round(VIOLET_TOP[i] + (VIOLET_BOTTOM[i] - VIOLET_TOP[i]) * clamped),
  );
}

/**
 * Draws the mark into a square canvas.
 *
 * `background` is either `null` (transparent) or a colour (a flat fill) or `'field'` (the violet
 * gradient). Every pixel is computed rather than composited so the anti-aliasing comes from the
 * supersampled downsample, which is where the clean edges come from.
 */
function render({ size, markScale, background, moduleColor, dotColor }) {
  const s = size * SUPERSAMPLE;
  const img = new Jimp(s, s, 0x00000000);
  // markScale is a fraction of the *canvas*, not of the 96-unit box.
  const mark = s * markScale;
  const offset = (s - mark) / 2;
  const unit = mark / BOX;

  img.scan(0, 0, s, s, function (x, y, idx) {
    const data = this.bitmap.data;

    // background
    if (background === 'field') {
      const t = (x * 0.45 + y * 0.9) / (s * 1.2);
      const [r, g, b] = field(t);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    } else if (background) {
      data[idx] = background[0];
      data[idx + 1] = background[1];
      data[idx + 2] = background[2];
      data[idx + 3] = 255;
    } else {
      data[idx + 3] = 0;
    }

    // the mark
    const ux = (x - offset) / unit;
    const uy = (y - offset) / unit;
    if (ux < 0 || uy < 0 || ux > BOX || uy > BOX) return;

    let colour = null;
    if (insideDot(ux, uy)) colour = dotColor;
    else if (insideMark(ux, uy)) colour = moduleColor;
    if (!colour) return;

    data[idx] = colour[0];
    data[idx + 1] = colour[1];
    data[idx + 2] = colour[2];
    data[idx + 3] = 255;
  });

  return img.resize(size, size, Jimp.RESIZE_BICUBIC);
}

async function write(name, img) {
  const path = resolve(OUT, name);
  await img.quality(100);
  await img.writeAsync(path);
  console.log(`  ${name.padEnd(30)} ${img.bitmap.width}x${img.bitmap.height}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log('Writing brand assets…');

  // The app icon: a violet field, white modules, the red point. Opaque — iOS icons have no alpha.
  await write(
    'icon.png',
    render({ size: 1024, markScale: 0.62, background: 'field', moduleColor: WHITE, dotColor: RED }),
  );

  // Android adaptive: the foreground keeps the mark inside the ~66% safe zone so the launcher's mask
  // cannot clip it, and the background is the field on its own.
  await write(
    'android-icon-foreground.png',
    render({ size: 1024, markScale: 0.5, background: null, moduleColor: WHITE, dotColor: RED }),
  );
  await write(
    'android-icon-background.png',
    render({ size: 1024, markScale: 0.5, background: 'field', moduleColor: WHITE, dotColor: RED }),
  );
  // Monochrome is a silhouette: the launcher tints it, so it carries shape only.
  await write(
    'android-icon-monochrome.png',
    render({ size: 1024, markScale: 0.5, background: null, moduleColor: WHITE, dotColor: WHITE }),
  );

  // The splash mark sits on the app's own dark canvas, so it is the violet mark rather than white.
  await write(
    'splash-icon.png',
    render({
      size: 512,
      markScale: 0.72,
      background: null,
      moduleColor: [0x6d, 0x4b, 0xff],
      dotColor: RED,
    }),
  );

  // Web.
  await write(
    'favicon.png',
    render({
      size: 64,
      markScale: 0.7,
      background: CANVAS,
      moduleColor: [0x9a, 0x6b, 0xff],
      dotColor: RED,
    }),
  );

  console.log('Done.');
}

await main();

/**
 * Generates the app icons and splash mark from the Field Kit mark.
 *
 * The mark is the Contour cross: three nested plus outlines drawn as *strokes* around a single red
 * point. `assets/brand/mark.svg` is the single source; the geometry below is the same numbers, kept
 * here so the PNGs can be produced without a browser or a native rasteriser.
 *
 * The rasteriser tests distance-to-outline rather than point-in-shape, because the mark is drawn, not
 * filled — a filled-rect test would render three solid pluses instead of three lines. Each ring is a
 * plus outline with half-arm-length `a` and half-arm-width `b`; by symmetry a point reduces to the
 * first quadrant, where the outline is four segments, so the per-pixel cost stays small even at 3×
 * supersampling.
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
import { mkdir } from 'node:fs/promises';
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
const CENTRE = 48;
const STROKE = 3.5;

/** Outer to inner: half-arm-length `a`, half-arm-width `b`, and the ring's stroke opacity. */
const PLUS_RINGS = [
  { a: 46, b: 18, opacity: 0.45 },
  { a: 33, b: 11, opacity: 0.75 },
  { a: 20, b: 4, opacity: 1 },
];
const DOT = { r: 5.5 };

const PINE = [0x0f, 0x1a, 0x16];
const HI_VIS = [0xd7, 0xf9, 0x4a];
const RED = [0xe5, 0x19, 0x2b];
const STONE = [0xf1, 0xef, 0xe8];

const SUPERSAMPLE = 3;

/** Distance from a point to a segment. */
function segDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSq));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

/**
 * Distance from a point to a plus outline, in the first quadrant.
 *
 * The outline in `dx,dy >= 0` is four segments — the right arm's two sides and the top arm's two
 * sides — and the plus is symmetric about both axes, so reducing to `|dx|,|dy|` is exact rather than
 * an approximation. Vertices, clockwise from the outer corner of the top arm:
 *   (a,0) → (a,b) → (b,b) → (b,a) → (0,a)
 */
function plusEdgeDistance(dx, dy, a, b) {
  return Math.min(
    segDist(dx, dy, a, 0, a, b),
    segDist(dx, dy, a, b, b, b),
    segDist(dx, dy, b, b, b, a),
    segDist(dx, dy, b, a, 0, a),
  );
}

/** Source-over compositing of a non-premultiplied colour onto a running pixel. */
function over(src, alpha, dr, dg, db, da) {
  const dstA = da / 255;
  const outA = alpha + dstA * (1 - alpha);
  if (outA === 0) return [0, 0, 0, 0];
  const mix = (s, d) => Math.round((s * alpha + d * dstA * (1 - alpha)) / outA);
  return [mix(src[0], dr), mix(src[1], dg), mix(src[2], db), Math.round(outA * 255)];
}

/**
 * Draws the mark into a square canvas.
 *
 * `background` is either `null` (transparent) or a flat colour. `moduleColor` is the ring colour and
 * `dotColor` the point; either may be `null` for a layer that carries no mark (the Android adaptive
 * background is the flat field on its own). Every pixel is computed rather than composited so the
 * anti-aliasing comes from the supersampled downsample, which is where the clean edges come from.
 */
function render({
  size,
  markScale = 0.62,
  background = null,
  moduleColor = null,
  dotColor = null,
}) {
  const s = size * SUPERSAMPLE;
  const img = new Jimp(s, s, 0x00000000);
  // markScale is a fraction of the *canvas*, not of the 96-unit box.
  const mark = s * markScale;
  const offset = (s - mark) / 2;
  const unit = mark / BOX;

  img.scan(0, 0, s, s, function (x, y, idx) {
    const data = this.bitmap.data;

    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    if (background) {
      [r, g, b] = background;
      a = 255;
    }

    if (moduleColor || dotColor) {
      const ux = (x + 0.5 - offset) / unit;
      const uy = (y + 0.5 - offset) / unit;
      if (ux >= 0 && uy >= 0 && ux <= BOX && uy <= BOX) {
        if (moduleColor) {
          const dx = Math.abs(ux - CENTRE);
          const dy = Math.abs(uy - CENTRE);
          for (const ring of PLUS_RINGS) {
            if (plusEdgeDistance(dx, dy, ring.a, ring.b) <= STROKE / 2) {
              [r, g, b, a] = over(moduleColor, ring.opacity, r, g, b, a);
            }
          }
        }
        if (dotColor) {
          const ddx = ux - CENTRE;
          const ddy = uy - CENTRE;
          if (ddx * ddx + ddy * ddy <= DOT.r * DOT.r) {
            [r, g, b, a] = over(dotColor, 1, r, g, b, a);
          }
        }
      }
    }

    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = a;
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

  // The app icon: a pine field, hi-vis rings, the red point. Opaque — iOS icons have no alpha.
  await write(
    'icon.png',
    render({ size: 1024, markScale: 0.62, background: PINE, moduleColor: HI_VIS, dotColor: RED }),
  );

  // Android adaptive: the foreground keeps the mark inside the ~66% safe zone so the launcher's mask
  // cannot clip it; the background is the pine field on its own, with no second copy of the mark.
  await write(
    'android-icon-foreground.png',
    render({ size: 1024, markScale: 0.5, moduleColor: HI_VIS, dotColor: RED }),
  );
  await write('android-icon-background.png', render({ size: 1024, background: PINE }));

  // Monochrome is a silhouette: the launcher tints it, so it carries shape only.
  await write(
    'android-icon-monochrome.png',
    render({ size: 1024, markScale: 0.5, moduleColor: STONE, dotColor: STONE }),
  );

  // The splash mark sits on the app's own pine canvas (app.json sets the colour), so it is the hi-vis
  // mark on transparency rather than a second baked background.
  await write(
    'splash-icon.png',
    render({ size: 512, markScale: 0.72, moduleColor: HI_VIS, dotColor: RED }),
  );

  // Web.
  await write(
    'favicon.png',
    render({ size: 64, markScale: 0.7, background: PINE, moduleColor: HI_VIS, dotColor: RED }),
  );

  console.log('Done.');
}

await main();

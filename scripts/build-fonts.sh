#!/usr/bin/env bash
#
# Regenerates the fonts in assets/fonts/.
#
# The shipped files are subsets, not the foundry originals, because the originals are many times
# larger and the app uses a fraction of the glyphs. A binary nobody can trace is worse than a build
# step, so the pipeline lives here rather than in someone's shell history — the same rule the AED
# dataset and the map archive follow.
#
# Static instances rather than the variable font, and that was measured rather than assumed: React
# Native resolves a static face more reliably than a variable one, and instancing drops the unused
# axes, so the safe option is also the small one.
#
# Bricolage Grotesque is a THREE-axis variable font (wght, wdth, opsz). Every axis must be pinned or
# the output is still a partial variable font, which is the failure mode this script exists to avoid;
# wdth and opsz are pinned and only wght moves, between the two instances the type roles use (700 for
# titles, 800 for the display line). Figtree is a single-axis font (wght) and its two used weights are
# instanced the same way. IBM Plex Mono ships as static files, so Medium is fetched directly.
#
# Requires fonttools. Use a virtualenv rather than a system install:
#
#   python3 -m venv .venv-fonts && ./.venv-fonts/bin/pip install fonttools brotli
#   PATH="$PWD/.venv-fonts/bin:$PATH" npm run fonts
#
set -euo pipefail

OUT="assets/fonts"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Latin, Latin-1 supplement (the degree sign and middot the readouts use), and general punctuation
# (the dashes, quotes and ellipsis the copy uses).
RANGE="U+0020-007E,U+00A0-00FF,U+2000-206F"

# Pinned the way the defibrillator dataset and the map archive are pinned: a named release, so the
# same command produces the same bytes later.
BASE="https://raw.githubusercontent.com/google/fonts/main"

echo "Downloading sources…"
curl -sSfL "$BASE/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz%2Cwdth%2Cwght%5D.ttf" -o "$WORK/BricolageGrotesque.ttf"
curl -sSfL "$BASE/ofl/figtree/Figtree%5Bwght%5D.ttf" -o "$WORK/Figtree.ttf"
curl -sSfL "$BASE/ofl/ibmplexmono/IBMPlexMono-Regular.ttf" -o "$WORK/IBMPlexMono-Regular.ttf"
curl -sSfL "$BASE/ofl/ibmplexmono/IBMPlexMono-Medium.ttf" -o "$WORK/IBMPlexMono-Medium.ttf"

mkdir -p "$OUT"
rm -f "$OUT"/*.ttf

# The same opsz=32 the register pins the display face at; wdth at its default. Both weights share it,
# so title and display are the same cut at two weights rather than two shapes.
echo "Instancing Bricolage Grotesque at 700 and 800 (all three axes pinned)…"
for weight in 700 800; do
  fonttools varLib.instancer "$WORK/BricolageGrotesque.ttf" \
    "wght=$weight" "wdth=100" "opsz=32" -o "$WORK/bricolage-$weight.ttf"
done

echo "Instancing Figtree at 400 and 600 (the only axis pinned)…"
for weight in 400 600; do
  fonttools varLib.instancer "$WORK/Figtree.ttf" "wght=$weight" -o "$WORK/figtree-$weight.ttf"
done

echo "Subsetting…"
pyftsubset "$WORK/bricolage-700.ttf" --output-file="$OUT/BricolageGrotesque-700.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting
pyftsubset "$WORK/bricolage-800.ttf" --output-file="$OUT/BricolageGrotesque-800.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting
pyftsubset "$WORK/figtree-400.ttf" --output-file="$OUT/Figtree-Regular.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting
pyftsubset "$WORK/figtree-600.ttf" --output-file="$OUT/Figtree-SemiBold.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting
pyftsubset "$WORK/IBMPlexMono-Regular.ttf" --output-file="$OUT/IBMPlexMono-Regular.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting
pyftsubset "$WORK/IBMPlexMono-Medium.ttf" --output-file="$OUT/IBMPlexMono-Medium.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting

echo
echo "Written:"
ls -l "$OUT" | awk 'NR>1 {printf "  %-32s %6.1f KB\n", $9, $5/1024}'
du -ch "$OUT"/*.ttf | tail -1 | awk '{print "  total " $1}'

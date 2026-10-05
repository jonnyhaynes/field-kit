#!/usr/bin/env bash
#
# Regenerates the fonts in assets/fonts/.
#
# The shipped files are subsets, not the foundry originals, because the originals are 6x larger and
# the app uses a fraction of the glyphs. A binary nobody can trace is worse than a build step, so the
# pipeline lives here rather than in someone's shell history — the same rule the AED dataset and the
# map archive follow.
#
# Static instances rather than the variable font, and that was measured rather than assumed:
#
#   Overpass, variable, subset       311 KB -> 93 KB    (one file, every weight)
#   Overpass, static 400 + 600       --    -> 88 KB    (two files)
#   IBM Plex Mono Regular, subset    132 KB -> 22 KB
#
# The static pair is *smaller* than the variable file, because instancing drops the unused weight
# axis, and React Native resolves a static face more reliably than a variable one. So the safe option
# is also the cheap one.
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
curl -sSfL "$BASE/ofl/overpass/Overpass%5Bwght%5D.ttf"   -o "$WORK/Overpass[wght].ttf"
curl -sSfL "$BASE/ofl/ibmplexmono/IBMPlexMono-Regular.ttf" -o "$WORK/IBMPlexMono-Regular.ttf"

mkdir -p "$OUT"

echo "Instancing Overpass at 400 and 600…"
for weight in 400 600; do
  fonttools varLib.instancer "$WORK/Overpass[wght].ttf" "wght=$weight" -o "$WORK/overpass-$weight.ttf"
done

echo "Subsetting…"
pyftsubset "$WORK/overpass-400.ttf" --output-file="$OUT/Overpass-Regular.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting
pyftsubset "$WORK/overpass-600.ttf" --output-file="$OUT/Overpass-SemiBold.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting
pyftsubset "$WORK/IBMPlexMono-Regular.ttf" --output-file="$OUT/IBMPlexMono-Regular.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting

echo
echo "Written:"
ls -l "$OUT" | awk 'NR>1 {printf "  %-28s %6.1f KB\n", $9, $5/1024}'
du -ch "$OUT"/*.ttf | tail -1 | awk '{print "  total " $1}'

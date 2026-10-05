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
# Nunito Sans is a FOUR-axis variable font (wght, wdth, opsz, YTLC). Every axis must be pinned or the
# output is still a partial variable font, which is the failure mode this script exists to avoid; the
# other three are pinned at their defaults and only wght moves.
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
curl -sSfL "$BASE/ofl/nunitosans/NunitoSans%5BYTLC%2Copsz%2Cwdth%2Cwght%5D.ttf" -o "$WORK/NunitoSans.ttf"
curl -sSfL "$BASE/ofl/ibmplexmono/IBMPlexMono-Regular.ttf" -o "$WORK/IBMPlexMono-Regular.ttf"

mkdir -p "$OUT"
rm -f "$OUT"/*.ttf

echo "Instancing Nunito Sans at 400 and 600 (all four axes pinned)…"
for weight in 400 600; do
  fonttools varLib.instancer "$WORK/NunitoSans.ttf" \
    "wght=$weight" "opsz=12" "wdth=100" "YTLC=500" -o "$WORK/nunito-$weight.ttf"
done

echo "Subsetting…"
pyftsubset "$WORK/nunito-400.ttf" --output-file="$OUT/NunitoSans-Regular.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting
pyftsubset "$WORK/nunito-600.ttf" --output-file="$OUT/NunitoSans-SemiBold.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting
pyftsubset "$WORK/IBMPlexMono-Regular.ttf" --output-file="$OUT/IBMPlexMono-Regular.ttf" \
  --unicodes="$RANGE" --layout-features='*' --no-hinting

echo
echo "Written:"
ls -l "$OUT" | awk 'NR>1 {printf "  %-28s %6.1f KB\n", $9, $5/1024}'
du -ch "$OUT"/*.ttf | tail -1 | awk '{print "  total " $1}'

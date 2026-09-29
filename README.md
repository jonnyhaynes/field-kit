# Field Kit

First aid reference for remote and low-signal environments. Native iOS and Android, built with
Expo. It has to work with no network at all: the guidance, the defibrillator data and the position
maths all live on the phone.

**Status: Phase 2 in progress.** The offline skeleton (Phase 1) is done, and Phase 2 is under way:
the AED domain layer, the extract pipeline, and the UK dataset itself — 22,357 defibrillators built
from a pinned OpenStreetMap extract — are all in. The screen does not read the dataset yet, so it
still shows its honest empty state.

- The approved implementation plan is [`docs/plans/fieldkit-v1.md`](docs/plans/fieldkit-v1.md).
  Read that before starting any work.
- How we build is in [`docs/dev-workflow.md`](docs/dev-workflow.md).
- Agent context is in [`AGENTS.md`](AGENTS.md).

## What's here

| Screen | What it does |
| --- | --- |
| `src/app/index.tsx` | Act — Call 999 as the single dominant action, with CPR and the defibrillator locator one tap away |
| `src/app/cpr.tsx` | Compressions, paced by a metronome driven by licensed guidance |
| `src/app/aed.tsx` | Nearest defibrillator — an honest empty state, because nothing loads the dataset yet |

## Run

```sh
npm install
npx expo start
```

MapLibre, NFC and the camera are native modules, so this needs a **dev build**, not Expo Go:

```sh
npx expo run:ios     # or run:android
```

## Checks

```sh
npm run typecheck                 # tsc --noEmit
npm run typecheck:scripts         # tsc over scripts/, against Node's globals
npm run lint                      # eslint
npm run format:check              # prettier
npm test                          # jest
npx expo export --platform ios    # proves the whole module graph bundles
```

All of these run in CI on every pull request and every push to `main`
(`.github/workflows/ci.yml`), along with an offline run of the AED pipeline against a checked-in
fixture (`npm run build:aed -- --from-file scripts/fixtures/overpass-sample.json`).

## Why the screens look half-empty

**There is no clinical content, and that is the point.** Field Kit reproduces first aid guidance
from a licensed source; it never writes its own. That licence is not in place yet, so every clinical
value renders as an empty slot rather than an unattributed instruction. `npm test` fails if any
record ships without its citation.

The metronome is written and its tempo maths is tested, but it is dormant: it beats at the pace in
the licensed record, and there is no such record yet. The screen says so instead of showing a number
we chose ourselves.

## Not yet in place

- **Clinical content** — blocked on the licence. See the plan, §2.1. This is the only thing gating
  real work.
- **Reading the AED dataset** — the data is committed and the query code is tested, but nothing
  loads it on device yet. That wiring, the proximity list and the flagging UI are the next slice;
  until then the defibrillator screen shows its empty state rather than pretending.
- **Offline map packs** — Phase 2d.
- **Maestro flows** — `.maestro/` carries the conventions and has no flows yet.
- **An EAS project** — `app.json` now has both bundle identifiers (`com.colouringcode.fieldkit`), so
  installing on a device is unblocked, but `eas.json` is not set up and that needs an Expo account.

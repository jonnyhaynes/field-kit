# Field Kit

First aid reference for remote and low-signal environments. Native iOS and Android, built with
Expo. It has to work with no network at all: the guidance, the defibrillator data and the position
maths all live on the phone.

**Status: Phase 2 in progress.** Phase 1 (the offline skeleton) is done and Phase 2 is nearly
there: the AED domain layer, the extract pipeline, the UK dataset (22,357 defibrillators from a
pinned OpenStreetMap extract) and the on-device list are all in. The defibrillator screen shows the
nearest three to you, with distances, unverified labelling and local flagging — all of it offline.

- The approved implementation plan is [`docs/plans/fieldkit-v1.md`](docs/plans/fieldkit-v1.md).
  Read that before starting any work.
- How we build is in [`docs/dev-workflow.md`](docs/dev-workflow.md).
- Agent context is in [`AGENTS.md`](AGENTS.md).

## What's here

| Screen | What it does |
| --- | --- |
| `src/app/index.tsx` | Act — Call 999 as the single dominant action, with CPR and the defibrillator locator one tap away |
| `src/app/cpr.tsx` | Compressions, paced by a metronome driven by licensed guidance |
| `src/app/aed.tsx` | Nearest defibrillator — the nearest three from the bundled dataset, with unverified labelling and local flagging |

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
- **Sending a flag upstream** — a flag hides an entry on your device immediately, but turning it
  into an OpenStreetMap note needs an opt-in surface that doesn't exist yet, and it posts publicly
  under your name. Tracked separately rather than bolted onto the list.
- **Offline map packs** — Phase 2d.
- **Maestro flows** — `.maestro/` carries the conventions and has no flows yet.
- **An EAS project** — `app.json` now has both bundle identifiers (`com.colouringcode.fieldkit`), so
  installing on a device is unblocked, but `eas.json` is not set up and that needs an Expo account.

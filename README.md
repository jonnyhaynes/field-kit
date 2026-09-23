# Field Kit

First aid reference for remote and low-signal environments. Native iOS and Android, built with
Expo. It has to work with no network at all: the guidance, the defibrillator data and the position
maths all live on the phone.

**Status: Phase 1 done — the offline skeleton.** Three Guided screens, no network calls, and no
clinical content (which is deliberate, not an omission — see below).

- The approved implementation plan is [`docs/plans/fieldkit-v1.md`](docs/plans/fieldkit-v1.md).
  Read that before starting any work.
- How we build is in [`docs/dev-workflow.md`](docs/dev-workflow.md).
- Agent context is in [`AGENTS.md`](AGENTS.md).

## What's here

| Screen | What it does |
| --- | --- |
| `src/app/index.tsx` | Act — Call 999 as the single dominant action, with CPR and the defibrillator locator one tap away |
| `src/app/cpr.tsx` | Compressions, paced by a metronome driven by licensed guidance |
| `src/app/aed.tsx` | Nearest defibrillator — an honest empty state, because there is no dataset yet |

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
npm test                          # jest
npx expo export --platform ios    # proves the whole module graph bundles
```

## Why the screens look half-empty

**There is no clinical content, and that is the point.** Field Kit reproduces first aid guidance
from a licensed source; it never writes its own. That licence is not in place yet, so every clinical
value renders as an empty slot rather than an unattributed instruction. `npm test` fails if any
record ships without its citation.

The metronome is written and its tempo maths is tested, but it is dormant: it beats at the pace in
the licensed record, and there is no such record yet. The screen says so instead of showing a number
we chose ourselves.

## Not yet in place

- **Clinical content** — blocked on the licence. See the plan, §2.1.
- **AED dataset and offline map packs** — Phase 2.
- **Bundle identifiers** — `app.json` has no `ios.bundleIdentifier` or `android.package`, so the app
  cannot be installed on a device yet, and no Maestro flow can target it.
- **Maestro flows** — `.maestro/` carries the conventions and has no flows, for the same reason.
- **No linter or formatter** — `npm run lint` will try to install ESLint on first run rather than
  checking anything, and Prettier is not installed.
- **No CI** — so "CI must be green before review" is not yet enforced.

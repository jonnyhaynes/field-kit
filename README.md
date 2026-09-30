# Field Kit

First aid reference for remote and low-signal environments. Native iOS and Android, built with
Expo. It has to work with no network at all: the guidance, the defibrillator data and the position
maths all live on the phone.

**Status: Phase 4a done, and region packs landed.** Phase 3 is complete: "Where I am" gives latitude,
longitude and an **OS grid reference** — the form a British 999 operator works in — with no reference
offered when you are outside Great Britain, Northern Ireland and the Isle of Man rather than a
plausible-looking one for the wrong country. A **what3words location** can be resolved on demand beside
it, which is the one thing on that screen that uses the network. A **compass** gives a bearing to walk
on, or says plainly when the device cannot provide one.

Phase 4a has landed what the rest of Phase 4 stands on: a **report** that exists and persists on the
phone, a **depth gate** that reveals responder capture without changing one thing about the emergency
path, and the four **capture forms** — SAMPLER, ABCDE, ETHANE and ASHICE — held as data. They record
what someone observes and never what to do about it, and ETHANE reports the scene where ASHICE hands
over a patient.

**Region packs** are in: the bundled map is a national overview, and a pack adds street-level detail
for one area — downloaded once, then offline for good. A pack is drawn *over* the overview rather than
replacing it, because a blank rectangle wherever it does not reach is worse than a coarse map. The
first pack is the Lake District at zoom 14 (18.9 MB); it is cut, hashed and pinned in the app's
catalogue, but **not yet published**, because a release asset needs a public repository.

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
| `src/app/map.tsx` | Offline map — a bundled UK overview, your position and the nearest defibrillators marked |
| `src/app/regions.tsx` | Region packs — the catalogue, downloads with progress, and what is using space |
| `src/app/position.tsx` | Where I am — latitude, longitude and an OS grid reference to read out |
| `src/app/compass.tsx` | Compass — a bearing to walk on, and the bearing to the nearest defibrillators |
| `src/app/settings.tsx` | Settings — the Responder depth switch, and reports waiting to send to OpenStreetMap |
| `src/app/record.tsx` | Record incident — responder capture: SAMPLER, ABCDE, ETHANE and ASHICE, written down on the phone |
| `src/app/about.tsx` | Data and licences — where the defibrillator and map data come from |

## Run

```sh
npm install
npx expo start
```

MapLibre, NFC and the camera are native modules, so this needs a **dev build**, not Expo Go:

```sh
npx expo run:ios     # or run:android
```

## Configuration

Nothing is required to run the app. One optional variable:

| Variable | What it does |
| --- | --- |
| `EXPO_PUBLIC_WHAT3WORDS_KEY` | A what3words API key, for resolving a location on "Where I am". **It needs a plan that can convert coordinates to a word address** — the free tier cannot, and answers `402 QuotaExceeded`. That was checked against the live API rather than inferred from the docs. Without a working key the screen says so. Put it in `.env`, which is gitignored — never in the repo. Note that an `EXPO_PUBLIC_` value is inlined into the JS bundle at build time, so it is not a secret: anyone with a build can spend the quota. |

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

## Cutting a region pack

Not a check, and not in CI: it needs the `pmtiles` CLI and reads byte ranges out of a 138 GB remote
archive, which is not a job to run on every push.

```sh
brew install pmtiles
npm run build:pack -- --region lake-district --name "Lake District" \
  --description "Fells and valleys around Windermere, Keswick and Wasdale, at street level." \
  --bbox=-3.55,54.20,-2.70,54.75 --maxzoom=14 --tag maps-2026.09
```

It writes the pack to `packs/` (gitignored — a 19 MB binary is a release asset, not repository
content) and records it in `assets/maps/regions.json`, which is what ships. `--no-catalogue` cuts and
prints the size without touching the catalogue, which is how the zoom level was chosen: measured at
z12/z13/z14 rather than guessed. Publish with the `gh release create` line the script prints.

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
- **A compass on real hardware** — the screen exists and is honest about a device without a
  magnetometer, but a simulator has none, so a real bearing has never been seen. The bearing and
  distance to nearby defibrillators are verified; the heading is not.
- **what3words** — resolved on demand and never cached, so nothing stale can be shown as current.
  Needs `EXPO_PUBLIC_WHAT3WORDS_KEY` (see Configuration); without it the screen says so rather than
  pretending. The licence terms were read, and one of them governs how a location may be displayed
  beside its coordinates; that is carried as an open question for the licensor in the plan, §7.
- **Android and real hardware** — the map, the position screen and the 7 MB asset copy are verified
  on an iOS simulator only. Android's local `pmtiles://file://` path is documented but unexercised
  here, and neither platform has been tried on a device.
- **Region packs are built but not published** — the cutter, the catalogue, the download and the
  overlay all work, and the Lake District pack is cut and pinned at 18.9 MB. Nothing can fetch it
  yet: release assets on a private repository need authentication an app cannot hold, so the first
  release goes out once the repository is public. Until then the screen honestly reports that the
  pack is not where it expects to find it. Two limits are deliberate and documented: a download is
  foreground-only (leaving the screen stops it), and **a pack adds geometry but not names** — its
  label layers are dropped so that every place name is not drawn twice.
- **Sending a report to OpenStreetMap** — a flag hides an entry here immediately, and leaves a report
  you can read, edit and send yourself in Settings. The app never sends anything on your behalf:
  OpenStreetMap's usage policy forbids that, and their notes are meant to be a person writing to a
  mapper. No account is used, so reports are anonymous. **Untested against the real API** — nothing
  has been posted from here, deliberately, and whether React Native can set the required `User-Agent`
  still needs a device check.
- **Maestro flows** — eleven, across `.maestro/map/`, `.maestro/location/`, `.maestro/settings/` and
  `.maestro/capture/`. All pass, and each is self-contained — it sets its own position and permissions
  — so the suite is order-independent (see `.maestro/README.md` for what the device taught us). The
  `smoke/`, `guided/`, `aed/` and `transfer/` areas are still conventions only.
- **Getting a report off the phone** — a report is written and persisted locally, and that is as far as
  it goes. QR render and scan, the share sheet, `sms:`/`mailto:`/`whatsapp://` and NFC are Phase 4b
  and 4c, so a report recorded on the phone currently stays on the phone.
- **A clinician has not read the capture fields** — the mnemonics are standard and their structure is
  public, but *which* observations to ask for, and using ACVPU rather than a Glasgow Coma Scale, is
  engineering judgement. The forms record and never assess, which is the mitigation; a clinical read
  before release is still wanted (plan, §2.5).
- **An EAS project** — `app.json` now has both bundle identifiers (`com.colouringcode.fieldkit`), so
  installing on a device is unblocked, but `eas.json` is not set up and that needs an Expo account.

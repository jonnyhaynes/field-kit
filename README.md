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
first pack is the Lake District at zoom 14 (18.9 MB), published as a GitHub Release asset and fetched
by the app on request — verified end to end on a device, from the tap to the map redrawing with street
detail.

**Getting a report off the phone** is in too: a report becomes a **QR code** another phone can read, or
goes by the share sheet, SMS, email or WhatsApp. Both depths can send — Guided sends where you are and
what has happened, Responder sends the scene — and a report that arrives by scan is shown as its own
thing, never merged into the reader's own record.

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
| `src/app/send.tsx` | Send report — the QR code the other phone reads, the share sheet, and SMS, email and WhatsApp |
| `src/app/scan.tsx` | Scan a report — reads another phone's code and shows what arrived, kept apart from your own record |
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

## Where the clinical content comes from

**It is reproduced, never written.** Every clinical value in this app is a published source's own
wording, attributed and dated on the screen that shows it: the compression rate, the compression steps
and the AED guidance come from **North West Ambulance Service**, an NHS ambulance trust.

**The licence is the Open Government Licence.** NHS material is published under the OGL, which permits
copying, adaptation and commercial use provided the source is attributed — so this needs no permission
conversation, and it is why the app ships real guidance rather than an empty slot. Each record carries
its publisher, its source URL and the date it was checked; `assertCited` refuses any record without
them, and a test asserts the metronome's pace sits inside the range the source publishes.

**The Resuscitation Council UK remains the intended authority** (plan §2.1). Their permission is free
on application, and their wording will replace this under the same ids when it is in hand — one record
per slot, not a screen change. Both are UK practice; the OGL route is what made a finished app possible
without waiting.

**One thing to confirm before release:** the OGL is the basis relied on here, and it is stated on the
NHS England and NHS website terms rather than on the trust page the wording was taken from. Worth a
line to NWAS, or a switch to a page whose terms are explicit.

## Not yet in place

- **Clinical content** — in, from North West Ambulance Service under the Open Government Licence, and
  cited on screen. The Resuscitation Council UK remains the intended authority and their wording will
  replace it under the same ids (§2.1). Confirm the trust page's terms, or RCUK's permission, before
  release.
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
- **Region packs** — published and working. A pack is cut by `npm run build:pack`, pinned in the
  catalogue that ships in the app, downloaded from a GitHub Release, verified against its md5 before
  it is accepted, drawn over the overview, and deletable. **Verified end to end on a device**, from
  the download tap to the map redrawing with street detail — which also settled that a GitHub asset
  redirect is followed. Three limits are deliberate and documented: a download is **foreground-only**
  (leaving the screen stops it, and nothing is kept); **a pack adds geometry but not names**, because
  its label layers are dropped so that no place name is drawn twice; and, the catalogue being bundled
  rather than fetched, **adding or fixing a pack needs an app release**. Not verified: a download over
  a poor connection, or any of this on Android.
- **Sending a report to OpenStreetMap** — a flag hides an entry here immediately, and leaves a report
  you can read, edit and send yourself in Settings. The app never sends anything on your behalf:
  OpenStreetMap's usage policy forbids that, and their notes are meant to be a person writing to a
  mapper. No account is used, so reports are anonymous. **Untested against the real API** — nothing
  has been posted from here, deliberately, and whether React Native can set the required `User-Agent`
  still needs a device check.
- **Maestro flows** — fourteen, across `.maestro/map/`, `.maestro/location/`, `.maestro/settings/`,
  `.maestro/capture/` and `.maestro/transfer/`. All pass, and each is self-contained — it sets its own
  position and permissions — so the suite is order-independent (see `.maestro/README.md` for what the
  device taught us). The `smoke/`, `guided/` and `aed/` areas are still conventions only.
- **Getting a report off the phone** — built, and verified except for the claim it rests on. A report
  becomes a QR code, or goes by the share sheet, SMS, email or WhatsApp; both depths can send, and a
  report that arrives by scan is shown as its own thing. **What is not verified is that a phone camera
  can read the drawn code.** It renders crisply with the right content and the serialisation
  round-trips, but an attempt to decode the rendered pixels failed, so the two-device check the plan
  always called for is now the first task rather than a formality — see the plan's "Verified, and not".
  Scanning cannot be exercised in a simulator at all, because there is no camera.
- **NFC tags are built for Android only, and none of it has been run.** A report can be written to an
  NDEF tag and read back, carrying exactly the bytes the QR path carries. iOS shows no tag control at
  all, because the reader-session entitlement needs an Apple Developer account the project does not
  have yet (§2.5) — so the decision was not to offer a control that can only fail. And nothing about
  the tag path has been exercised: no simulator has an NFC reader and there is no device, so the logic
  is unit-tested, the absence is asserted on the device, and the rest waits for an Android phone.
- **A clinician has not read the capture fields** — the mnemonics are standard and their structure is
  public, but *which* observations to ask for, and using ACVPU rather than a Glasgow Coma Scale, is
  engineering judgement. The forms record and never assess, which is the mitigation; a clinical read
  before release is still wanted (plan, §2.5).
- **An EAS project** — `app.json` now has both bundle identifiers (`com.colouringcode.fieldkit`), so
  installing on a device is unblocked, but `eas.json` is not set up and that needs an Expo account.

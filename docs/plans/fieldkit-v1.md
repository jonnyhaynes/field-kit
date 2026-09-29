# Field Kit — v1 implementation plan

First aid for remote and low-signal environments. **Field Kit**; repo and package name `field-kit`.

**Status: revision 3 — approved**, with the two decisions below recorded after sign-off. This file
is the canonical copy; revise it here, per `docs/dev-workflow.md` step 2. The plan-mode working file
in `~/.commandcode/plans/` is a scratch copy and may lag behind it.

Design artefacts referenced below and already in the repo:
`docs/design/guided-flow-options.html` (the 3-vs-4-screens choice) and
`docs/design/app-map.html` (the whole app, and what maps back to the original ask).

---

## 0. What changed in this revision

| Decision | Change |
| --- | --- |
| **Name** | App is called **Field Kit**; repo and package name `field-kit`. Closes rev 2's open question 1. |
| **Report sending** | **Both depths send a report**, not just Responder. Resolves rev 3's own open question 3. |
| **Responder depth** | **Back in v1.** Rev 2 concluded Guided-only because there's no clinician reviewer; you've confirmed the responder capture content is supplied and stays in. §2.1 rewritten. |
| **Guided depth** | **Option B: 3 screens**, with AED as a peer destination rather than step 4. Closes rev 2's open question 4. |
| **Map data** | **Both** — bundled UK overview *and* downloadable region packs. Closes rev 2's open question 3. |
| **Depth model** | New: **depth is not a mode.** The emergency path is identical for everyone; the Responder depth adds tools rather than replacing the app. §1. |
| **Repo guidance** | Already amended for the native pivot — `AGENTS.md`, `docs/dev-workflow.md`, `.gitignore` and the project taste entry are done. §5 Phase 0. |

---

## 1. What we're building

A native iOS/Android first aid app that works with no network at all: guidance, defibrillator
data and position maths are all local.

**Depth is not a mode.** Call 999, CPR and the defibrillator locator sit in the same place for
everyone, always. The Responder depth *adds* structured capture on top. Two consequences worth
protecting: a trained responder never loses the fast path, and an untrained user never meets a
mnemonic form or a mode picker under stress.

- **Guided** — three screens. Act (Call 999 dominant, plus the two secondary paths), CPR with a
  metronome, and the defibrillator locator. Hard ceiling of four screens.
- **Responder** — an added depth: SAMPLER, ABCDE, ETHANE and ASHICE capture, turned into a report.

**Both depths can send a report.** Guided sends a short one — where I am and what's happened —
without asking an untrained user to work through a handover mnemonic. Responder sends the full
capture. Same transfer surface underneath: QR, share sheet, NFC tag.

### Decisions locked

| Decision | Choice |
| --- | --- |
| Platform | Native (Expo / React Native), iOS + Android, from v1 |
| Name | Field Kit; repo and package `field-kit` (trademark check pending) |
| Guided flow | 3 screens, AED as a peer destination |
| Depth model | Depth adds tools; never replaces the emergency path |
| Report sending | Available in both depths; Responder fills the full capture |
| AED data | OpenStreetMap extract (`emergency=defibrillator`), bundled, offline-queryable |
| Basemap | Protomaps PMTiles — bundled UK overview + downloadable region packs |
| what3words | Resolve online, store on the incident record; current position uses lat/long + OS grid ref |
| Transfer | QR primary, then OS share sheet, then NFC tags |
| Records storage | OS app sandbox + device encryption; no SQLCipher |
| Geography | UK first, but no UK-only assumptions outside OS grid refs and the AED dataset |

---

## 2. The dependencies that aren't code

### 2.1 Content, and the missing safety gate

Two different things are in play, and only one of them is settled:

- **TORLEA is the source of the responder capture content.** Established.
- **A licence to use it *uncredited*** is not established, and a no-attribution term is unusual —
  licences normally require credit rather than forbid it.

The plan therefore takes a default that holds either way:

- The capture **forms** are built against the public mnemonic structure. SAMPLER, ABCDE, ETHANE
  and ASHICE are standard pre-hospital practice, not anyone's IP, so a form that asks the right
  questions is safe to build regardless.
- Every content record carries an internal `source` field, so the traceability rule still has
  teeth even where the UI names nobody.
- No TORLEA reference appears in the UI.

**Why this is the highest-risk open item:** with no clinician author or reviewer, the licence *is*
the safety gate. The only thing between a user and unverified instructions is that the wording is
a training provider's, reproduced verbatim. That's defensible with a licence; without one the
project has neither a licence nor a reviewer. **One line from TORLEA confirming uncredited use
closes it**, and it should be in hand before any clinical content ships.

Resuscitation guidance (CPR, AED use) still needs its own source. The intended route is the
**Resuscitation Council UK** reproduction permission — their own application form states RCUK is
"usually willing to grant permission without charge" for material in its publications, including
algorithms. That fits a zero budget. Content stays **version-pinned to a named guideline edition**
so the app can state exactly what it presents.

### 2.2 what3words

Cache-versus-store is a licence question, so Phase 0 includes reading the what3words API Licence
Agreement. The design does not depend on the answer: the online resolver is one implementation
behind an interface, with an offline no-op behind it.

### 2.3 Map data and basemap — zero budget

Two constraints force the choice:

- **OpenStreetMap's own tile server cannot be used for offline packs.** Their Tile Usage Policy
  says offline use is not permitted there, and that "download city/country for offline use"
  features rely on prohibited bulk downloading.
- **There is no budget for a commercial tile provider.**

Which leaves **Protomaps**: one PMTiles archive, self-hosting with no API keys, licensed as an
ODbL Produced Work with OpenStreetMap attribution. Cost is storage and egress only.

Shape: a **low-detail UK-wide overview bundled in the app**, so the map is never blank and the
offline promise doesn't depend on the user remembering to prepare; plus **downloadable
higher-detail region packs** for people planning a trip. Exact sizes get measured in Phase 2 —
Protomaps' docs note each extra zoom level roughly doubles the file, so `maxzoom` is the whole
game. Attribution ("© OpenStreetMap contributors", Protomaps) appears in the map UI and in About.

### 2.4 The medical device question

MHRA's determination turns on **intended purpose**, which is set by the claims made, not by the
code. Educational and awareness content is generally out of scope; software that directs a
treatment decision for a specific patient sits closer to clinical decision support.

So this is a **copy and framing discipline, not an engineering blocker**: keep the framing at
"reference guidance — call 999", avoid patient-specific diagnosis language, prefer "here is what
the algorithm says" over "your casualty has X, so do Y", and document the intent once so there's
an answer ready if store review asks. That's your call to document, not mine to assert.

### 2.5 Open, but not blocking

Field Kit trademark and store-name availability, an Apple Developer account (needed for the NFC
entitlement), and ODbL share-alike obligations on the derived AED database.

---

## 3. Stack

- **Expo SDK 57**, React Native 0.86, React 19.2, TypeScript 6 (strict), from the `create-expo-app`
  default template. **Expo Router**, with the router at `src/app/` and `@/*` aliased to `./src/*`.
- **Dev builds, not Expo Go** — MapLibre, NFC and the camera are native modules, so CNG
  (`expo prebuild`) + EAS Build from the start. `/android` and `/ios` generated and gitignored.
- **npm**, lockfile committed.
- **Bundle identifiers are unset.** `app.json` has no `ios.bundleIdentifier` or `android.package`.
  Both need a domain you own, and Maestro flows need them to target the installed app.
- Operational warning: `create-expo-app` now generates its own `AGENTS.md`, `CLAUDE.md` and
  `.claude/settings.json`. Pass **`--no-agents-md`** or it overwrites this repo's agent setup.
- `expo-location` (GPS + heading), `expo-sensors` (magnetometer), `expo-sqlite`, `expo-camera`
  (QR scan), `expo-sharing` + RN `Share`, `react-native-qrcode-svg`, `react-native-nfc-manager`,
  `@maplibre/maplibre-react-native`, `zustand` (incident session), `proj4` (OSGB36 grid refs).
- **Unit:** Jest via `jest-expo`, installed. Tests import their globals from `@jest/globals` so
  `tsc` types them without loosening the global config. React Native Testing Library is *not*
  installed yet — component tests arrive with the first component worth testing.
- **E2E: Maestro**, matching the existing setup in `stem-4-clear-fear-expo/.maestro/`: explicit
  inclusion allow-list in `.maestro/config.yaml` (one glob per area — Maestro's `flows` globs are
  inclusion-only, so a `!subflows/**` negation is silently inert), flows named `TC-NN — description`
  with `tags:`, testID selectors, shared steps in `subflows/`, and a `.maestro/README.md`.
- ESLint, Prettier, `tsc --noEmit`.

---

## 4. Architecture

A capability layer so features degrade instead of crashing:

```
src/capabilities/   ← canCompass, canNfc, canQr, canMapRegions, canResolveW3w
src/emergency/      ← tel: dialer + confirmation sheet
src/content/        ← cited records: source, review date, guideline edition, depth
src/aed/            ← bundled dataset, proximity query, flagging, attribution
src/location/       ← GPS, lat/long, OSGB36 conversion, bearing
src/compass/        ← magnetometer heading, calibration warning, GPS-course fallback
src/what3words/     ← resolver interface (online impl + offline no-op)
src/incident/       ← active incident session (Zustand)
src/capture/        ← SAMPLER / ABCDE / ETHANE / ASHICE forms (depth-gated)
src/report/         ← report model, local persistence, compact serialisation
src/transfer/       ← QR render/scan, share sheet, sms:/mailto:/whatsapp:
src/nfc/            ← NDEF read/write of a serialised report
src/maps/           ← MapLibre offline manager + region packs
src/app/            ← Expo Router screens (the template puts the router under src/,
                       with @/* aliased to ./src/*)
.maestro/           ← E2E flows by area, with subflows/ and config.yaml
```

### 4.1 Design rules that are not negotiable

1. **Never present a stale or unverified position as authoritative.** A what3words address is a
   3 m square; a cached one shown as "current location" would send help to the wrong place. Current
   position → lat/long and grid ref, computed on-device. Recorded location → stored 3wa with its
   sample time, clearly labelled.
2. **Every clinical instruction carries its source and review date.**
3. **AED results are unverified by default.** Show the last-verified date where the source has one;
   never imply an AED is accessible, working, or still there.
4. **Offline is the default path, not the fallback.** Anything needing network degrades visibly —
   never silently, and never by gating a core flow.
5. **No accounts, no analytics on lookups.** Records stay on the device until the user shares them.
6. **Red is reserved for the emergency action.** It appears once, on Call 999, and nowhere else.

### 4.2 Transfer — QR first

**QR needs no network on either side.** Generating one is local rendering; scanning is on-device
via the camera (AVFoundation on iOS, MLKit on Android). So QR is the primary path: it crosses iOS
and Android, needs no entitlement and no physical tags, and showing a code is a deliberate
on-screen act.

Payload is a **compressed, compact handover subset** — ETHANE fields, coordinates, time — because
a full report can exceed a single QR's capacity (version 40 is roughly 2.9 KB binary). If it still
overflows, fall back to plain text plus the share sheet rather than shrinking into an unreadable
code.

Then the **OS share sheet** (AirDrop / Nearby Share / WhatsApp / email) with `sms:`, `mailto:` and
`whatsapp://` deep links, and **NFC NDEF tag read/write** for storing or reading a report from a
physical tag. Phone-to-phone NFC isn't available to third-party apps any more, so tags are the only
NFC shape worth building.

### 4.3 AED data quality

The dataset will contain wrong entries — AEDs get removed, moved, locked away, or were mis-tagged
in OSM in the first place. So: a **visible disclaimer** on every result; **flag as inaccurate**
stored locally, suppressing that entry immediately; and when online and opted in, the queued flag
becomes an **OpenStreetMap note** — the fix belongs upstream where the data lives, not in a private
fork. Surface the source's `check_date` where present.

### 4.4 Content as data

Each record is typed, carrying `depth: 'guided' | 'responder'`, its source, its review date and the
guideline edition. A content change is then a reviewable diff, not a code change — which is what
`AGENTS.md` already claims about safety-critical content, so the architecture should enforce it.

---

## 5. Phases

**Phase 0 — groundwork.** TORLEA confirmation in writing (§2.1); Field Kit trademark and store-name
check; what3words licence read; ODbL and Protomaps attribution settled; MHRA intent documented;
Apple Developer account.
*Already done:* the Expo app is scaffolded (SDK 57, dependencies installed, `tsc --noEmit` clean);
the bundle identifiers are set (`com.colouringcode.fieldkit`); the four checks and a bundle check
run in CI; this plan is filed at `docs/plans/fieldkit-v1.md`; both design artefacts are in
`docs/design/`; `.maestro/` carries the conventions; and `AGENTS.md`, `docs/dev-workflow.md`,
`.gitignore` and the project taste entry are amended for the native pivot.

**Phase 1 — offline skeleton. Done.** Expo Router screens, content model, **Guided depth at 3
screens** (Act, CPR, defibrillator locator), emergency call button. No network calls anywhere.
*Landed:* `src/app/{index,cpr,aed}.tsx` as a Stack; the cited-content model with `assertCited`
running at import time; the palette tokens; Jest with 23 tests over the content gate and the pace
maths; `expo export` bundles clean. *Deliberately absent:* every clinical value. The corpus is
empty, so the slots render empty and the metronome is dormant rather than guessing a pace.

**Phase 2 — AED.** OSM extract pipeline (`scripts/build-aed-db.ts`) → quality gate (require
public-access tagging, drop stale nodes) → bundled SQLite with bounding-box + haversine proximity →
proximity list → flagging (§4.3) → MapLibre with bundled overview and downloadable region packs →
attribution.

**Phase 2 as sliced** — tracked as issues #4–#7. The domain layer lands before the pipeline so the
gate and the distance maths are executable and tested without a dataset or a network.

| Slice | Issue | Scope |
| --- | --- | --- |
| 2a | #4 | AED domain layer — record model, quality gate, bounding-box + haversine proximity. Offline, fixtures only. |
| 2b | #5 | OSM extract pipeline → gated SQLite. Pipeline landed; the real dataset is generated by a documented manual run (see below). |
| 2c | #6 | AED proximity list on-device, with flagging. |
| 2d | #7 | MapLibre basemap — bundled UK overview plus region packs. |

**Gate staleness policy — refined for #4, and one item left open.** "Drop stale nodes" is narrowed:
staleness never *silently* drops a node. A missing or unreadable `check_date` becomes
`never-verified` and the UI says so; age-based dropping is an explicit, opt-in parameter. **Still
open for sign-off:** the threshold at which an *explicitly* stale `check_date` should drop a node.
There is no defensible number yet, so #4 ships the parameter and does not assume one.

**Phase 2b as delivered — the pipeline, not the data.** `scripts/build-aed-db.ts` reads an Overpass
JSON export, runs the gate and writes the SQLite database plus its metadata; CI exercises that whole
path offline against a checked-in fixture, so the pipeline is provably correct without reaching OSM.
**No dataset is committed yet.** Every Overpass instance was unreachable from the development
environment, and committing fixture-built records would put fabricated defibrillators in front of a
user — so the real run is a tracked follow-up, and the AED screen keeps its honest empty state until
then. Fallback for that run: the Geofabrik UK extract (2.1 GB, dated and md5-checksummed) filtered
with `osmium`, converted to the same Overpass JSON shape.

Two things the research settled. **`.db` is already a Metro asset extension in SDK 57**, so no
`metro.config.js` is needed as long as the file is `*.db` and not `*.sqlite`. And **`check_date` is
present on only ~7% of UK AED nodes**, which is why `never-verified` is the common case rather than
an edge case. Still open for a human: **ODbL share-alike** makes a systematic UK-wide extraction a
Derivative Database, so the derived database must itself be offered under ODbL — a decision on
*where* before the dataset ships.

**Phase 3 — position and orientation.** GPS, lat/long, OSGB36 grid ref, compass with calibration
warning and fallback, and the online-w3w-resolved-onto-the-record flow.

**Phase 4 — responder capture and report.** Depth gate, SAMPLER / ABCDE / ETHANE / ASHICE forms,
local persistence, QR render and scan, share sheet, `sms:`/`mailto:`/`whatsapp://`, NFC NDEF
read/write.

**Phase 5 — release.** EAS builds, store listings, disclaimer copy per §2.4.

---

## 6. Verification

**Unit and component (Jest)**

- **Content traceability** — every record has a source, review date and edition; the build fails if
  any is missing one.
- **Depth gate** — responder capture is unreachable when the depth is off, and the emergency path
  is identical either way.
- **Coordinate maths** — round-trip tests against known OS grid ref ↔ lat/long pairs, plus an
  out-of-UK case that reports "grid ref unavailable" rather than a wrong answer.
- **AED query** — fixture dataset; nearest-3 ordering, quality-gate failures excluded, and a
  flagged entry disappearing from results immediately.
- **Stale-position guard** — a cached 3wa is never rendered in the current-position slot.
- **Serialisation** — a report round-trips through the QR payload encoder, including overflow.

**Offline**

- Run every core flow in airplane mode; assert no network call is attempted (no-op fetch spy) and
  that nothing degrades silently.

**E2E (Maestro, on device)**

- Areas: `smoke/`, `guided/`, `aed/`, `location/`, `capture/`, `transfer/`, `settings/`, with shared
  `subflows/` as in the existing setup.
- Real-device checks: QR generate-then-scan between two devices; share sheet to SMS, WhatsApp and
  email; NFC tag write then read on Android and read on iOS with the entitlement in place; compass
  against a known bearing, plus the fallback when the magnetometer is unavailable.

---

## 7. Open questions for the reviewer

1. **One line from TORLEA** confirming the capture content may be used uncredited. This is the
   single item standing between the project and having no safety gate at all (§2.1).
2. **Field Kit trademark and store-name availability** — there's an existing open-source FieldKit in
   environmental sensing, so this needs a real check before anything ships under the name.

Resolved since revision 2: the app name (Field Kit, repo `field-kit`), the Guided share path (both
depths send a report), the PMTiles location (both), the Guided screen count (three), the bundle
identifiers (`com.colouringcode.fieldkit`), and `expo-env.d.ts` (committed, so the CI type-check is
reproducible from a clean checkout).

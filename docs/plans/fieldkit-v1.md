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
  ETHANE and ASHICE are not variants of each other: ETHANE reports the **scene**, ASHICE hands over a
  **patient**, and each form says which it is so a responder knows what they are describing.

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
| what3words | Resolve online, store on the incident record; current position uses lat/long + OS grid ref. **Needs a key on an account with `convert-to-3wa` enabled — see §2.2.** |
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

**Routes checked, and why RCUK is the one to take — decided.** Three alternatives were looked at before
committing to it, and none of them removes the need:

- **ILCOR's international consensus** is genuinely open access, but under **CC BY-NC-ND**, and the
  **no-derivatives** term is the obstacle: an app screen needs wording adapted and abridged, which that
  licence forbids. It is the evidence the algorithms rest on, not a licence for our text.
- **Crown copyright under the Open Government Licence** would need no permission at all, and NHS
  Digital's content demonstrably carries the OGL — but whether a given NHS first-aid page does is a
  per-source question, and none was confirmed.
- **Public-domain sources** remain the fallback if RCUK declines, at the cost of a US or evidence-level
  voice rather than the UK clinical practice this app is for.

**So the request that matters is RCUK's**, for the resuscitation wording: the capture forms do not need
one, because they are structure rather than prose and the structure is public (§4.4). And the safety
gate is unchanged — **a clinician reading the wording**, which is a person to ask rather than a licence
to buy (§2.5). Nothing has to be built to receive the content: a cited record already carries its
source, review date and edition, and `assertCited` refuses anything missing them, so the CPR screen
fills in the day the wording arrives.

**Delivered — the content is in, under the OGL.** The three guidance slots carry **verbatim wording from
North West Ambulance Service**, an NHS trust, cited to its source page and the date it was checked. NHS
material is published under the **Open Government Licence**, which permits copying, adaptation and
commercial use provided the source is attributed — so this needed no permission conversation, which is
what made a finished app possible now rather than after an application.

Two things are recorded rather than assumed. The metronome beats at **110**, the middle of the source's
published 100–120 range: the range is theirs, the single number is this app's reading of it, and a test
keeps it inside the range. And **RCUK remains the intended authority** — their permission is free on
application, and their wording replaces this under the same ids, so a licensed outcome later is one
record per slot rather than a screen change. Before release the trust page's own terms should be
confirmed, since the OGL basis is stated on NHS England and NHS website terms rather than on that page.

### 2.2 what3words

**Read, in Phase 3c.** Four things came out of the licence. The one that costs money matters more
than the one that looks like a trap:

- **The Free tier cannot convert coordinates to a location** — that was removed in November 2024. The
  cheapest plan that can is **Basic, US$9.99/month**, and free access exists only for NGOs/charities
  (written approval) or emergency services. An app being free to *users* does not exempt the licensee.
- **Clause 6.3(b)** says a 3 Word Address must not be displayed *"alongside its corresponding
  coordinates"*, or shared with a third party that way.
- **Offline resolution is not on the public API.** It needs the Enterprise Suite SDK (~5 MB bundled,
  separately licensed), not the API this app would call.
- **Storing is permitted** (6.3(e)(ii), up to 100 m coordinate-derived pairs, where "strictly
  necessary"), but the reverse direction must always be re-called, no local dataset may be built, the
  newest API version must be used, and all what3words Data must be deleted on termination.

**Where the build stands.** The subscription is a known future commitment rather than a build gate:
the key comes from `EXPO_PUBLIC_WHAT3WORDS_KEY` — never committed — and without one the app reports
`not-configured` instead of pretending. Nothing is cached in this build, so the cache-versus-store
question does not arise; if a resolved location is ever stored, §4.1 rule 1 governs how it may be
shown. One item in the clause list above is not settled by this build and is carried as an open
question for the licensor in §7.

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
- `expo-location` (GPS, heading **and the compass** — see Phase 3b; `expo-sensors` turned out to be
  unnecessary), `expo-sqlite`, `expo-camera` (QR scan), `expo-sharing` + RN `Share`,
  `react-native-qrcode-svg`, `react-native-nfc-manager`, `@maplibre/maplibre-react-native`,
  `zustand` (incident session), `proj4` (OSGB36 grid refs).
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
stored locally, suppressing that entry immediately; and a report the user can **review, edit and send
themselves** — the fix belongs upstream where the data lives, not in a private fork. Surface the
source's `check_date` where present.

**Not "when online and opted in".** This section originally had the queued flag become an OSM note
automatically, and that is not permitted. OSM's API Usage Policy says a client must not *"submit
website forms in an automated manner or on behalf of users"*, and the Notes API page says notes are
*"intended for humans to communicate with other humans"* and are *"not a place to dump automated error
checking"*. That same page explicitly permits third-party apps to **include** notes functionality, so
the feature is fine and the automation is not: the queue is a list the user sends from, one note at a
time, not an outbox. `README.md` and `src/notes/queue.ts` say the same thing, so the next person to
reach for an auto-send meets the constraint first.

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
| 2b | #5, #9 | OSM extract pipeline → gated SQLite, plus the committed UK dataset (22,357 records). |
| 2c | #6, #12 | AED proximity list on-device, with local-first flagging. OSM-note submission split out. |
| 2d | #7, #14 | MapLibre basemap — bundled UK overview at zoom 8, plus the map and data/licences screens. Region packs split out. |

**Gate staleness policy — refined for #4, and one item left open.** "Drop stale nodes" is narrowed:
staleness never *silently* drops a node. A missing or unreadable `check_date` becomes
`never-verified` and the UI says so; age-based dropping is an explicit, opt-in parameter. **Still
open for sign-off:** the threshold at which an *explicitly* stale `check_date` should drop a node.
There is no defensible number yet, so #4 ships the parameter and does not assume one.

**Phase 2b as delivered — the pipeline and the dataset.** `scripts/build-aed-db.ts` reads either an
Overpass JSON export *or* a GeoJSON export from `osmium`, runs the gate and writes the SQLite
database plus its metadata; CI exercises the whole path offline against a checked-in fixture, so the
pipeline is provably correct without reaching OSM. The real dataset is now generated and committed:
**22,357 records (2.1 MB)** from the pinned Geofabrik `united-kingdom-260927.osm.pbf` (md5
`4b63755764a6ef617d00ca75088db378`, OSM data to 2026-09-27T20:23:36Z). Overpass was unreachable from
the development environment (the main instance and two mirrors all 504), so the Geofabrik route was
used: `osmium tags-filter` → `osmium export -u type_id` → the pipeline.

**Gate access policy — changed from the original plan, and it needed to be.** The plan said "require
public-access tagging". That turned out to be wrong for real OSM data: **46% of UK defibrillator
nodes carry no `access` tag at all**, because the tag is optional and its absence means "no
restriction recorded", not "no access". Requiring a positive value silently dropped 10,528 ordinary
public defibrillators — half the dataset, and the wrong half. The gate now rejects only explicit
exclusion — `no`, `private`, `customers`, `employees`, `staff` (546 nodes) — and keeps everything
else, labelled unverified. This changes a rule merged in #4, so it is recorded here rather than
buried in a diff.

**Still open.** The age threshold from #4: age-dropping remains off, so nothing was dropped as
`stale` in this run. And **ODbL share-alike** — a systematic UK-wide extraction is a Derivative
Database, so the derived database must itself be offered under ODbL. Attribution ("© OpenStreetMap
contributors", linking to the licence) is recorded both beside the data and inside the database's own
`meta` table, but *where* the derived database is offered is still a human decision.

Two things the research settled along the way. **`.db` is already a Metro asset extension in SDK 57**,
so no `metro.config.js` is needed as long as the file is `*.db` and not `*.sqlite`. And **`check_date`
is present on only 7.4% of UK AED nodes** — 1,581 of 22,357 accepted records here — which is why
`never-verified` is the common case rather than an edge case.

**Phase 2c as delivered — the list, on the device.** The AED screen loads the shipped database
(`SQLiteProvider` with `assetSource`; expo-sqlite copies the bundled file into the app's directory
once), reads all 22,357 rows, and reuses the tested `nearestAeds` to rank the nearest three — so
proximity has one implementation rather than a second one in SQL. Each result shows a deliberately
coarse distance (rounded to 10 m under a kilometre: a mapped point is not accurate to the metre) and
whether the position was ever checked, carries the unverified disclaimer, and can be flagged as
inaccurate, which hides it on that device immediately and persistently. The database is opened
`PRAGMA query_only`, so nothing on the device can write to the shipped data; flags live in
expo-sqlite's key-value store instead.

**A slice of Phase 3 came forward, deliberately.** The list needs the user's position to compute
distances, and position was Phase 3. Rather than reorder the phase quietly, the narrow piece moved:
`src/location/current-position.ts` takes a foreground fix and does nothing else. Grid references,
the compass and what3words stay in Phase 3. The position is not stored and not sent, and there is no
network call anywhere in `src/` (verified by grep, and the offline note on the screen says only what
is true of that screen).

**Not done in 2c:** the acceptance criterion that a flag becomes an OpenStreetMap note when online
and opted in. Local-first flagging is complete; submission needs an opt-in surface that does not
exist yet, and it posts to a third party under the user's name, so it is a separate tracked decision
(#12) rather than a side effect of the list landing.

**Phase 2c follow-up as delivered — the report, sent by the person who made it.** `src/notes/` holds
the queue, the opt-in and the client; `src/app/settings.tsx` is where a report is read, edited and
sent. Flagging is untouched: the entry still disappears at once and offline, and the flag now also
leaves a report waiting.

**The policy changed the design, and the issue with it.** #12 asked for a flag to *become* a note when
online and opted in. OSM's usage policy forbids submitting *"on behalf of users"*, so it does not:
nothing is sent by the app, and with the opt-in off there is no send control at all — not a disabled
one, none. Two details from the API shaped the rest: **no account is needed** (an unauthenticated
request creates an anonymous note, which suits §4.1 rule 5), and an anonymous note gets a **403 inside
a "Moderation Zone"**, which is surfaced as its own message rather than as a generic failure.

**Verified:** the policy's safety property on a simulator — with the opt-in off the screen offers no
way to send — and the review state with it on, both screenshotted, with the opt-in returned to off so
the flows leave no trace. Nothing was sent to OpenStreetMap, by design: a test that posted real notes
would be vandalism, so the success path is covered against an injected `fetch` instead.

**Not verified, and it needs hardware:** whether React Native can set a `User-Agent` at all. OSM
requires one identifying the app and version, and blocks clients that fake another's — so if it
cannot, that is a reason not to ship this rather than a detail to work around.

**Phase 2d as delivered — the bundled basemap.** The UK overview ships inside the app: a Protomaps v4
PMTiles archive cut for the UK bounding box, with its lettering and sprites bundled too, so the style
fetches nothing. `src/maps/style.ts` builds the style from `@protomaps/basemaps` and rewrites every
remote URL to a local `file://` copy — including the font stacks buried inside `text-field` format
expressions, which is exactly where the first attempt missed them and left the style reaching for
protomaps.github.io. The map screen shows your position and the nearest defibrillators, and
`src/app/about.tsx` carries the attribution and licence text the ODbL requires to be *reachable*,
not merely present.

**Measured, not guessed — the `maxzoom` trade-off.** Cut from `build.protomaps.com/20260929.pmtiles`
(a 138 GB planet archive, read remotely with `pmtiles extract` rather than downloaded):

| maxzoom | archive size |
| --- | --- |
| 5 | 959 kB |
| 6 | 1.3 MB |
| 7 | 2.6 MB |
| **8** | **6.4 MB** |

**z8 is used** — the largest that fits an 8 MB budget, and each further zoom roughly doubles the file
(z9 would be about 12 MB). At z8 the archive holds only ~190 tiles of the UK, so this is a national
overview — coastlines, towns, major roads — not street level. That is the honest limit of the
bundled map, and the reason region packs exist as a separate slice.

To rebuild it:

```sh
pmtiles extract https://build.protomaps.com/<build>.pmtiles assets/maps/uk-overview.pmtiles \
  --bbox=-8.65,49.86,1.77,60.86 --maxzoom=8
```

**Phase 2d follow-up as delivered — region packs.** The mechanism and one pack: a bundled catalogue
(`assets/maps/regions.json`), an installer that verifies what it downloaded before it accepts it, and
a pack drawn *over* the overview rather than instead of it. `docs/plans/14-region-packs.md` carries
the plan, the measurements, and what it deliberately does not do.

Two things are worth recording here rather than leaving in the diff. A pack **layers** instead of
replacing, because a blank rectangle wherever it does not reach is the failure this phase already
fixed once. And a pack supplies geometry but **not** its own labels — two sources each drawing names
would draw every name twice — so the trade is detail without more names. Measured over a Lake District
box, cut from the same build as the bundled archive: z12 4.8 MB, z13 10.0 MB, z14 18.9 MB. The pack is
z14, inside a 25 MB cap.

**Landed: the first pack release.** The repository is public, and the Lake District pack is published
as a release asset carrying its ODbL notice. The app downloads it, verifies its md5 and draws with it
— checked on a device from the tap through to the map redrawing with street detail, which also settled
whether a GitHub asset redirect is followed (it is). Still true, and the accepted cost of the
catalogue being bundled rather than fetched: **adding or fixing a pack needs an app release**.

**Labels are Latin-only, and POIs are dropped — a decision, not an oversight.** Protomaps' name
expression falls back to each feature's local `name` and appends secondary script lines, so a UK
extract drags in Cyrillic, Georgian, CJK and emoji (mostly POI names — the variation-selector range
is an emoji signature). MapLibre asks for a glyph range per script it meets, and this app ships Latin
glyphs; bundling the rest of Unicode to render a handful of shop names would cost megabytes. So the
map labels English-then-local and the POI layer is gone: a cafe's name is not what an orientation map
is for. A `name` that is itself non-Latin can still slip through as a missing glyph in one label —
not a broken map, and not worth a megabyte per script to avoid.

**Verified on a device — by looking at it.** The map was run on an iOS 26.4 simulator and driven with
Maestro to a screenshot, which settles the assumption this slice rested on: **`pmtiles://file://`
works on iOS**, glyphs and sprites load over `file://`, place labels draw, and the AED markers sit on
the London streets you would expect. The device log shows no glyph or sprite failures.

Three things came out of actually looking, and none of them would have surfaced from a type-check or a
bundle check: a missing 2x sprite descriptor (a blank map on a Retina device), glyph requests for
scripts the app does not ship (fixed by narrowing labels to Latin and dropping POIs), and — from a
screenshot — that a position outside the archive left a grey rectangle with no explanation at all,
which breaks §2.3's "never blank" promise. The map now falls back to the UK overview and says why, and
deliberately marks no defibrillators, because "nearest to you" would be a lie about a place the user is
not standing.

The archive's extent is a **rectangle** cut from a bounding box rather than the coastline, so it
includes the island of Ireland — Dublin and Dundalk are drawn and labelled. Tidying that up means
`pmtiles extract --region` with a GeoJSON outline, which would also drop tiles nobody in the UK needs;
noted rather than done.

Two `.maestro/map/` flows cover the map: one inside the UK and one outside. Each documents the
simulator location it needs, since a flow cannot set one.

**Phase 3 — position and orientation.** GPS, lat/long, OSGB36 grid ref, compass with calibration
warning and fallback, and the online-w3w-resolved-onto-the-record flow.

**Phase 3a as delivered — the grid reference.** `src/location/osgb.ts` converts the current position
to an OS grid reference, and `src/app/position.tsx` ("Where I am", reached from the map) is where to
read it out: latitude and longitude, the reference, and its accuracy stated beside it. `proj4` is
used with an **explicit** EPSG:27700 definition containing `+towgs84` — proj4 does not ship 27700,
and a definition without a datum shift is silently 60–100 m out.

**Eight figures, not ten — a correction to the design.** The number of digits is a claim about
accuracy. OS puts the plain Helmert datum shift at 3 m (95%) in plan and a phone's GPS at 3–10 m, so a
ten-figure (1 m) reference claims more than either supports — and the design artefact shows exactly
that (`NY 26259 06255`). The app shows eight figures (10 m), and says so on the screen.

**A rectangle is not coverage.** The OS grid's published area of use contains the whole island of
Ireland, and Dublin projects inside it to a plausible reference in the wrong country — the same
rectangle trap the map archive had. So coverage is a real outline: Great Britain, Northern Ireland and
the Isle of Man, generated by `scripts/build-gb-outline.ts` from Natural Earth 1:10m (public domain)
and committed as data. Outside it the screen offers no reference rather than inventing one. Northern
Ireland is included deliberately — OS's stated coverage stops at GB and the Isle of Man, but the grid
is computable across NI, and refusing someone in Belfast a reference is worse than the ambiguity.

Measuring mattered here too: a first attempt at a 1:50m outline put **Land's End 4.4 km outside** the
polygon, a false negative on the Cornish coast. 1:10m at a 0.005° tolerance brings every coastal test
point within 1.2 km while leaving Dundalk 6.4 km out; the 2 km coastal pad covers the former and not
the latter.

**Verified on a device, both branches, screenshotted:** `TQ 3002 8038` for central London — the
canonical `TQ 30 80` square — and Dublin showing latitude and longitude with no reference offered.
Two `.maestro/location/` flows, each documenting the simulator location it needs.

**Phase 3c as delivered — the location, and the guard.** `src/what3words/` holds the resolver: a real
call to `convert-to-3wa` with `fetch` injected so every documented failure is testable without a
network, and an honest no-op when no key is configured. The screen asks only when the user taps
Resolve, and a result is tied to the point it was taken at — move 10 m and the words are dropped
rather than left beside the new coordinates. That is §4.1 rule 1 in miniature.

**The stale-position guard is enforced by the compiler.** `CurrentPosition` and `RecordedLocation` are
separate types, so a recorded location cannot be passed to a current-position slot at all; the test
that proves it carries a `@ts-expect-error`, which means widening the type makes the annotation unused
and fails `tsc --noEmit` in CI. Removing the annotation by hand produces exactly the right error:
*"Argument of type 'RecordedLocation' is not assignable to parameter of type 'CurrentPosition'"*.
`assertCurrent` covers the other route in — a value that came back from storage and lost its type on
the way.

**Not done here:** nothing is stored. There is no incident record to store against, so
`RecordedLocation.words` exists as a shape and Phase 4 fills it.

**Phase 3b as delivered — the compass, and a fallback that cannot lie.** `src/compass/` holds the
reading and the policy; `src/capabilities/` holds the probe; `src/app/compass.tsx` is reached from
"Where I am" by the control the design already drew.

**No new dependency, and the plan was wrong about one.** `expo-location`'s `watchHeadingAsync`
already returns a platform tilt-compensated heading *and* a calibration signal — expo's Android path
performs the rotation matrix, the screen-orientation remap and the declination itself. Building this
from `expo-sensors`' raw magnetometer would have been reimplementing all of it. §3 said
`expo-sensors`; it is not needed and was not installed.

**The policy is a pure function, and it is the only route to a number.**
`chooseCompassDisplay` decides what may be shown, so an untrustworthy bearing has no path to the
screen even by mistake. Three platform behaviours make it necessary:

- **`accuracy` does not mean the same thing on the two platforms.** iOS buckets a real angular error
  (`2` is "within 35°"); Android reports a raw calibration status and **initialises it to `0`**, so
  some devices read `0` all session with a working magnetometer. The gate is `accuracy >= 2`, which
  errs towards showing nothing — a stuck calibration state is a degradation, a wrong bearing is a
  hazard.
- **Both platforms signal an unavailable true heading with a negative value, and neither exposes the
  declination.** So magnetic north is shown **labelled as magnetic** rather than quietly passed off as
  true north.
- **The GPS course is the dangerous half.** On Android `coords.heading` is
  `Location.getBearing()`, which returns **`0.0` when there is no bearing at all** — expo never checks
  `hasBearing()` — so a stationary phone reports due north. The course is therefore accepted only
  above a walking pace and labelled "direction of travel", never as a compass.

The capability probe is load-bearing rather than decorative: `useHeading` asks `canCompass()` first
and does not subscribe at all when the device has no compass. It has to be empirical, because no API
answers the question — iOS **rejects** with no magnetometer, and Android **resolves and then never
emits**, so only a timeout catches that one.

**Verified on a simulator, honestly:** the compass screen shows its "no compass on this device" state
rather than a dial, because the iOS Simulator has no magnetometer, and the flow asserts both that the
state renders and that no dial or readout does. What *did* work is the part computed from position:
the nearest defibrillators appear with real bearings and distances (`067° NE`, 220 m from central
London), which is `initialBearing` against the bundled dataset.

**Not verifiable here, and left as a real-device check:** a bearing against a known direction, the
metal that pushes `accuracy` down into the calibration state, and — the open question — whether iOS
ever supplies a usable `trueHeading` at all, since Apple requires location updates on the heading
manager and expo's streamer does not start them.

**Phase 4 — responder capture and report.** *4a is built* (issue [#23](https://github.com/jonnyhaynes/field-kit/issues/23)):
the report model, the depth gate and the four capture forms, persisted locally on the same key-value
store as everything else — see `docs/plans/23-report-and-capture.md` for the plan and how it was built.

Two corrections came out of building it, both recorded there in full. **ETHANE is a scene report, not
a patient handover** — that is ASHICE — so the one-line list that stood here was loose rather than
wrong, and each form now declares which of the two it is. And **the forms record observations, never
treatment**: ABCDE and ASHICE as taught interleave assessments with interventions ("give oxygen",
"cannulate", "administer"), which §2.1 forbids, so the field sets take the observation half and drop
the action half, with a test walking every label and option against a list of instruction words.

**Phase 4b as delivered — getting the report off the phone.** QR first, then the share sheet, then the
three schemes, with both depths able to send and a code that can be scanned back in. See
`docs/plans/24-transfer-qr-share.md` for the plan and what was built.

Two things are worth recording here. **The payload is the ETHANE answers, the position and the times**
— not the full capture, which travels as text through the share sheet, because a code has a hard size
limit and building one is only useful if it stays readable. And **the Act screen offers the send link
to both depths**: the plan had it as a Guided-only link, which would have meant turning the Responder
depth on *removing* a destination, and §1 says depth adds rather than moves.

**Phase 4c as delivered — tags.** A report can be written to an NDEF tag and read back, carrying
*exactly* the bytes the QR path carries rather than a second format — `serialiseHandover` out,
`parseHandover` in, same refusals. See `docs/plans/25-nfc-tags.md`.

**It is offered on Android only, and deliberately.** iOS needs the reader-session entitlement, which
needs the Apple Developer account still open in §2.5, so iOS shows no tag control at all rather than
one that can only fail — a recorded decision, and one that lifts when the entitlement exists. Nothing
about the tag path has been run: there is no NFC reader in a simulator and no device here, so the
logic is unit-tested and the absence is asserted, and that is the whole of it.

**Still open in Phase 4: proving a phone camera can read the QR code.** The code renders with the
right content and the serialisation round-trips, but a decoder could not read the rendered pixels, so
the two-device scan the plan always called for is the first task rather than a formality (§6).

**Phase 5 — release.** EAS builds, store listings, disclaimer copy per §2.4.

---

## 6. Verification

**Unit and component (Jest)**

- **Content traceability** — every record has a source, review date and edition; the build fails if
  any is missing one.
- **Depth gate** — responder capture is unreachable when the depth is off, and the emergency path
  is identical either way. Enforced by a type rather than a conditional: `responderForms` accepts only
  a responder depth, so widening it fails `tsc --noEmit` in CI instead of waiting for a reviewer.
- **No treatment in the capture forms** — every field label and every choice option is checked against
  a list of instruction words ("give", "administer", "dose", "treat", "recommend"). This app records
  what someone observes and never recommends anything, and a form is where that rule would erode.
- **Coordinate maths** — round-trip tests against known OS grid ref ↔ lat/long pairs, plus an
  out-of-UK case that reports "grid ref unavailable" rather than a wrong answer.
- **AED query** — fixture dataset; nearest-3 ordering, quality-gate failures excluded, and a
  flagged entry disappearing from results immediately.
- **Map style** — the built style is pure and testable: no URL a fetch could follow, a local
  `pmtiles://file://` source, local glyph and sprite templates, and no Protomaps font stack name left
  to be URL-escaped into a path that does not exist on disk.
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
  against a known bearing, plus the fallback when the magnetometer is unavailable. **The compass half
  of this cannot be done in a simulator** — there is no magnetometer, so the simulator only ever
  exercises the "no compass" branch (§5, Phase 3b).

---

## 7. Open questions for the reviewer

1. **One line from TORLEA** confirming the capture content may be used uncredited. This is the
   single item standing between the project and having no safety gate at all (§2.1).
2. **Field Kit trademark and store-name availability** — there's an existing open-source FieldKit in
   environmental sensing, so this needs a real check before anything ships under the name.
3. **How what3words clause 6.3(b) applies to showing a location beside its coordinates.** The two
   appear together on "Where I am" and the clause restricts that pairing. It needs a line from
   what3words rather than an interpretation from here — and dropping the pairing would be a change to
   one screen's layout, not to the resolver (§2.2). **Settled for reports, still open for the screen:**
   a report payload may carry a what3words location alongside its coordinates, by the product owner's
   decision recorded in `docs/plans/24-transfer-qr-share.md` — which is the pairing the clause names,
   and the *sharing with a third party* half of it, which is exactly what a report does. The display
   question on "Where I am" is unchanged.

Resolved since revision 2: the app name (Field Kit, repo `field-kit`), the Guided share path (both
depths send a report), the PMTiles location (both), the Guided screen count (three), the bundle
identifiers (`com.colouringcode.fieldkit`), and `expo-env.d.ts` (committed, so the CI type-check is
reproducible from a clean checkout).

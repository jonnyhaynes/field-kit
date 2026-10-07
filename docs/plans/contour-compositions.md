# Contour slice 4 — the compositions

**Status: draft — awaiting approval.** No code until a human approves this plan.

**Ticket:** to be filed. The Contour identity work has run on `docs/plans/field-kit-contour.md` with no
tracking issue (its own ticket is recorded as "number TBD"); opening one for slice 4, and updating the
umbrella plan's §9, is part of landing this.

**Design:** `docs/design/field-kit-contour.html`. The board draws **eight** screens — *Emergency path*
(CPR running, nearest defibrillator, offline map, send report) and *Field and settings* (record
incident, ABCDE capture, More, region packs). **Act, Where I am, Compass, Scan and About are not
drawn**; they inherit slices 1 and 3 and the umbrella plan's §4 table.

**Depends on:** slices 1–3, all merged (`#51`–`#54`). **Overlaps #43** — read §2 before this plan.

**Base:** branch off `feat/contour-bar` (`60f6c0c`), the tip that carries all three merged slices.
`origin/main` could not be fetched from this environment, so it still reads `52e0fa0`; the PR should
be retargeted against the real `main` once it includes `#54`.

---

## 1. What this slice is

The app is painted in Contour but still **composed** like the register it replaced. The palette,
faces, surfaces and the one-pill bar are in (slices 1 and 3), and the `Contour` component exists but
is **imported by no screen** (`src/components/contour.tsx` is dead code until this slice). What is
missing is the *structure* the board draws on top of that:

- an Act hero with a hill field behind the question;
- a CPR screen whose rate disc sits in a summit field, with a beat indicator and an elapsed readout;
- an AED screen with **ranked, numbered** rows and a **walk-on-a-bearing** entry point;
- a map with numbered markers and a **bottom sheet** bound to the selected one;
- a Field index with a report hero and **progress rows**;
- a Send screen with the light QR card and the four-channel grid;
- a More screen with a **pending-reports count** and an "on this phone" list;
- a Region packs download hero with live progress and a space-used readout.

This slice changes presentation, plus the two small behaviours in §3. It changes **no copy that
carries clinical meaning** (the AED disclaimer wording the board shows is a placeholder and the
shipped wording stays), **no data model**, and **no offline rule**.

---

## 2. The overlap with #43, and the sequencing call

`docs/plans/43-responder-capture-form.md` (open, draft, awaiting approval) restructures the responder
capture into *exactly* what the board draws for **Field** and **ABCDE**:

| Board element | Where it is already specified |
| --- | --- |
| Field's four rows with progress (`4/6`) | #43 §1–§2, its "index of four" |
| Tapping a row opens the form | #43 §2, the focused pushed route |
| The A–B–C–D–E step bar | #43 §2, "a named stepper" |
| The bottom bar becoming Previous / Next | #43 §2 + this plan's §5.4 |
| The review step with per-form Edit links | #43 §4 |

So the umbrella plan's §5 items **3 and 4 are #43's §1 and §2, not new work here.** This plan must not
quietly re-decide them.

**Recommendation — land #43 first, then compose the screens it creates.** Three reasons:

1. #43 **moves routes and rewrites the capture flows** (`field/index`, a new `[form]` route, a review
   route). Composing the *current* inline four-cards-in-one-scroll screen would be thrown away.
2. #43 is the **larger structural** change and is already planned in detail; this slice is a
   composition pass over whatever structure exists.
3. It keeps **one idea per plan**, which is the repo's convention.

If you would rather not serialise them, this slice *can* go first and #43 follow — but the Field rows
and the capture form would then be composed twice. I would not do that.

---

## 3. Decisions taken

### The umbrella plan's §5 five

| # | Item | Decision | Why |
| --- | --- | --- | --- |
| 1 | **"Walk on a bearing"** (AED hero, AED list, map sheet) | **Include** | Drawn in two mockups, and the compass already computes a bearing to the nearest three AEDs (`DefibrillatorBearings`). This is a new *entry point*, not new maths. Seam: navigate to `/locate` with a `tab=compass` param, read once into the pane state. |
| 2 | **Elapsed time on CPR** | **Include** | Small new state: a start timestamp when the metronome starts, rendered `mm:ss` in `machine`. |
| 3 | **Progress counts on Field rows** | **Via #43** | #43's index already derives `answered / fields`. Slice 4 styles it; it adds no second count. It must read as progress, never a score — a bar and a ratio, no percentage, no colour reward. |
| 4 | **Capture Previous/Next + A–E step bar** | **Via #43** | #43's focused form *is* the stepper; slice 4 gives it the board's step-bar skin. |
| 5 | **"999" as a word in the bar** | **Already shipped** | `#54`. No work. |

### The board's other behaviours, which §5 does not list

| # | Item | Decision | Why |
| --- | --- | --- | --- |
| 6 | `±6 m` accuracy chip on the report hero | **Cut** | `useCurrentPosition` returns latitude/longitude only. An accuracy figure is a **data-model change**, and §9 keeps the model out of scope. The hero shows `started HH:MM` and the recorded position with its sample time, both of which already exist (`RecordedLocation.sampledAt`). |
| 7 | Map **bottom sheet bound to the selected marker** | **Include; selection by tap** | The sheet shows the nearest AED by default (the board's marker "1"); tapping a numbered marker selects it. Marker hit-testing is the one genuinely new interaction — if it proves fiddly it ships nearest-only and tap-select becomes a follow-up, stated rather than faked. |
| 8 | AED "Flag as inaccurate" as a quiet underlined text button | **Include** | Presentation only; the `aed-flag-${index}` testID is unchanged. |
| 9 | Send's **Edit** affordance | **Via #43** | #43's review step owns per-form Edit links. Slice 4 gives Send the light QR card and the Share / SMS / Email / WhatsApp grid. |
| 10 | State chips — "Running", "Report open", "In progress" | **Include** | Derived from state that already exists (metronome running; report open; a form part-filled). |
| 11 | Pending-reports **count badge** on More | **Include** | `useNoteQueue().notes.length`. |

### The one thing this plan asks you to settle

**Act's "two readout tiles"** (umbrella plan §4). Live figures — a grid reference and a nearest-AED
distance — would mean **Act loads position and the whole 22,357-record AED dataset on the emergency
screen.** That is the wrong place to add work.

**Recommendation: the two tiles are *links* — "Where I am" and "Nearest defibrillator" — without live
readouts.** If you want the live figures, say so and I will add the loads, accepting the cost on Act;
it is a one-line change to this decision, not to the structure.

---

## 4. Per-screen composition

Board-specified screens first, then the five that inherit.

### Emergency path

| Screen | Change from today |
| --- | --- |
| **Act** | Hero becomes an ink/panel panel with a **hill `Contour`** in the hero's corner; the question moves to `display`; the breathing action becomes the hi-vis **`signal`** variant ("They're not breathing / Start compressions"); AED row below it; two link tiles (§3). Responder "Record incident" unchanged, responder-only. |
| **CPR** | Hero: **summit `Contour`** behind a large hi-vis rate disc showing the bpm in `machine` 60 over "per min". New **beat row** — `BEAT` label over six dots (one lit per beat) and `ELAPSED` over `mm:ss`. The **"Get a defibrillator"** glacier button moves **above** Stop and carries the nearest distance + "unverified" as a `machine` subtitle. Below: Stop (`control`) and "How to do compressions". "Running" chip while the metronome runs. |
| **AED** | Title; provenance notice (existing `Disclaimer`, restyled as a glacier panel — **wording unchanged**); a **hero card** with a glacier `Contour` corner, a numbered glacier badge, distance in `machine` 30, bearing (`initialBearing`, already implemented) in `machine` 15, site/access rows, buttons **"Show on a map"** (`/locate`) and **"Walk on a bearing"** (`/locate?tab=compass`), and **"Flag as inaccurate"** as a quiet text button; then numbered rows 2 and 3; then "How to use an AED" (existing `ContentSlot`) as an outline button. |
| **Map** | Two corner `Contour` fields (hi-vis); numbered glacier markers on the MapLibre layers (already drawn); a top overlay — the offline pill "Offline · UK overview" and a Region packs button; a **bottom sheet card** for the selected AED — badge, distance + bearing, "name · Unverified", **"Walk on a bearing"** and "Details"; a dashed bearing line from the user to marker 1. |
| **Send** | Light QR card with the caption "Hold it up — another phone scans this"; a "What has happened" card with rows Position / Started / Forms and an **Edit** link (via #43); a four-button grid Share / SMS / Email / WhatsApp; the on-device privacy note. |

### Field and settings

| Screen | Change from today |
| --- | --- |
| **Field (index)** | "This report" hero in **ink** with a hi-vis `Contour` corner — `THIS REPORT`, `started HH:MM`, the recorded position, and a sampled-time chip (§3.6); the `RESPONDER CAPTURE` section label; the four form **rows with progress bars and counts** (from #43); Send. |
| **Capture form** | The A–E step bar (done / current / pending), the step counter, **Previous / Next** with a dynamic "Next: D", and the sticky action — all from #43, wearing the board's step-bar skin. **999 stays at the end.** |
| **More** | Responder-tools card with the toggle and its note; a **"Show reports waiting to send"** row with a glacier count badge; an **"On this phone"** card — Region packs ("1 installed" style), Scan a report, Data and licences; a version footer (`Field Kit <version> · guidance <edition>`). |
| **Regions** | A **download hero** with a hi-vis `Contour` corner, the region name, "street detail · zoom 14 · 18.9 MB", a progress bar with `x / y MB` and a percentage, Stop, and "Then offline for good."; "Other packs" rows with Get / Check; a **"Space used"** card. |

### Inherited (not drawn on the board)

| Screen | Change |
| --- | --- |
| **Where I am** | Recompose into an **ink readout card** holding the OS grid reference (`machine`), with the latitude/longitude and the bearing as light rows. Behaviour unchanged. |
| **Compass** | Readout into the board's treatment (`machine` `"{deg}° {cardinal}"`), dial and AED-bearing rows restyled. Behaviour unchanged. |
| **Scan** | Inherit slices 1/3; camera frame and result card on the new surfaces. Behaviour unchanged. |
| **About** | Sections as `Card`s on the new surfaces. Behaviour unchanged. |

---

## 5. What is inherited unchanged

- **Every cited content record** — source, review date, edition, and `assertCited` at import.
- **The AED dataset, gate, proximity query and flagging.** `PRAGMA query_only` stays.
- **The emergency dial** — `tel:`, no confirmation sheet, `call-beacon` unchanged.
- **The depth gate** — `visibleTabs`, `responderForms`, and the off-Field redirect.
- **Offline as the default path** — every `OfflineNote` keeps its wording, and no network call is
  added. (The CPR and AED screens already load the AED dataset; §3.2 reuses that provider for the
  distance on CPR's button — it is the existing load, not a new one.)
- **Every `testID`**, and `TAB_TEST_IDS` / `call-beacon` in particular.

---

## 6. Slices

Each is separately reviewable. 1–5 are the composition; 6 is the verification pass. Slice 3 waits on
#43.

| # | Slice | Contents |
| --- | --- | --- |
| 1 | Act + CPR | The emergency screens, the hill and summit fields, the CPR run state, beat row and elapsed time. |
| 2 | AED + Map | Ranked numbered rows, the provenance panel, the map sheet, and **walk on a bearing** (the `/locate?tab=compass` seam). |
| 3 | Field + capture | The report hero and the progress rows; the capture step-bar skin. **Requires #43.** |
| 4 | Send + More + Regions | The QR card and channel grid; the count badge and on-this-phone list; the download hero and space used. |
| 5 | Where I am + Compass + Scan + About | The inheritance pass — surfaces and `machine` readouts, no behaviour change. |
| 6 | Maestro, contrast and screenshots | Flow updates for any moved selector, the new walk-on-bearing assertion, the updated contrast pairs, 320px screenshots on iOS and Android, both themes. |

---

## 7. Verification

**Mechanical.** `npm run typecheck`, `typecheck:scripts`, `lint`, `format:check`, `test`, and
`npx expo export --platform ios`. The token tests must stay green unchanged — `contrast.test.ts`
(every rendered text/surface pair ≥ 4.5:1, ≥3:1 large, both schemes) is the one that notices if a
`Contour` stroke or a chip colour lands on the wrong surface.

**Unchanged invariants that must still pass.** `visibleTabs` returns three tabs at guided and four at
responder, in the same order; the depth-gate type test; the pace-in-range test; content traceability.

**On a device, by looking at it.** The full Maestro suite on iOS **and** Android — the bar, safe areas
and safe-area insets are where the two platforms differ. Specifically:

- **TC-01** (the beacon: exactly one, on every screen) and **TC-02** (the depth adds one tab, order
  stable) unchanged and passing — they are what notice if the bar is disturbed.
- a **new** `.maestro/` assertion: "Walk on a bearing" reaches the Compass pane with a bearing shown.
- an AED marker tap on the map opens the sheet for that marker (§3.7), or the ship is nearest-only
  and the plan says so.
- 320px on iOS and Android, **both themes**, on Act, CPR, AED, Map, Where I am, Field, a capture form
  and Send; the icon at 40px; and CPR with **Reduce Motion** on.

---

## 8. Risks

1. **Hi-vis is loud.** The rule is **one hi-vis fill per screen plus the active tab**. Act's new
   primary action makes two bright things on the app's most important screen, with the red 999 capsule
   a third — worth looking at before it ships. The board accepts it; the umbrella plan's §7 flags it
   as an honest gap.
2. **CPR loading the AED dataset** for the button's distance. It is the same provider the AED screen
   uses, but it now mounts on the emergency path. If it shows any delay, the distance is dropped and
   the button ships without it.
3. **Map marker hit-testing** (§3.7) — the only new interaction, and the only part of this slice that
   could quietly not work. It is called out as a ship/follow-up fork rather than assumed.
4. **The #43 sequencing** (§2). Composing before #43 means composing twice.
5. **Churn fatigue** — this is the fourth pass over these screens (violet register → Contour palette →
   this). The token layer is what makes it cheap; the cost is in review, not code.
6. **Maestro selectors** that assumed the old structure (`scrollUntilVisible` calls added in #35/#36
   are the known trap) — updated in slice 6, not deferred.

---

## 9. Out of scope

- **#43's structure** — the index, the stepper, the disclosure, the review step and the route changes.
  This slice consumes them.
- **The data model** — including position accuracy (§3.6).
- **Clinical content** — nothing here instructs anyone clinically; the board's guidance text is a
  placeholder and the shipped wording stays.
- **The map *style*** beyond the palette and the markers (contour lines on the real map come from the
  tiles, not the `Contour` component).
- **Region-pack catalogue changes** — packs still need an app release; unchanged.
- Learning or gamification — unchanged.

---

## 10. What approval means

Approving this approves the **composition** of every screen to the Contour board, the two included
behaviours (**elapsed time on CPR**, **walk on a bearing**), the cut of the accuracy chip, and the
**sequencing recommendation that #43 lands first**. It does not approve #43's structure (its own
plan), any data-model change, or any change to clinical content.

The PR(s) will be titled `[ai-assisted]`, reference this doc, `docs/design/field-kit-contour.html` and
`#43`, and end with a `Manually reviewed by <name>` line. A human merges once CI is green.

---

## 11. As built

**Landed: all five slices (2 partly).** The mechanical checks are green throughout: `typecheck`,
`typecheck:scripts`, `lint`, `format:check`, `test` (37 suites, 561 tests) and
`npx expo export --platform ios`.

**Slice 1 — Act and CPR. Done.** Act's question moved into a panel with the hill field in its corner;
the breathing action is the hi-vis `signal` variant; two link tiles lead to Where I am and the offline
map. CPR gained the summit field behind a hi-vis rate disc, the beat row, the elapsed readout, a
Stop/Start run state, and the defibrillator promoted above Stop. New: a `glacier` `ActionButton`
variant and a centred `Contour` corner. Locate reads a `tab` param on focus.

Two departures, both recorded rather than slipped in:

1. **CPR's defibrillator button carries a static hint**, not the board's live "nearest 340 m ·
   unverified". Mounting the AED dataset on the emergency path is §8 risk 2, and it is unmeasured
   here (no device), so the distance is left for a follow-up rather than added blind.
2. **Act's two tiles are "Where I am" and "Offline map"**, not "Where I am" and "Nearest
   defibrillator" as §3 tentatively said. The defibrillator already has its own footer action, and a
   second entry to the same place is noise.

**Slice 2 — AED and Map. Done, with the map's sheet deferred.** The AED list ranks its results: the
nearest is a hero card with a glacier field, a numbered glacier badge, the walking bearing beside the
distance, and a "Walk on a bearing" link; the others are quiet rows. The flag is a quiet underlined
text button. The map gains the contour fields in two corners, glacier markers, and a "Walk on a
bearing" link. Locate's `tab` param carries both to the Compass pane.

Deferred from the board, and why:

3. **The board's "[Site name]" and access rows are not built.** `AedRecord` carries no name or
   access, and the data model is out of scope (§9); the board says its own names are placeholders.
4. **The map's bottom sheet and numbered markers are not built.** Markers stay unnumbered glacier
   circles on the existing `MapView`; the numbers live on the list and hero. Tap-select and the
   overlaid sheet are the genuinely new interaction §3.7 flagged, and they need a device to verify.
   The walk-on-a-bearing entry is a link, not a sheet.

**Slice 3 — Field and capture. Built with #43.** #43 landed the index, the focused form and the named
stepper; this slice's board skin came with it — the ink report hero, the progress rows and the step
bar. What is *not* built is §5.4's "the tabs are hidden while a form is open": the form's Previous/Next
is its pinned footer and the global tab bar stays. Recorded in `docs/plans/43-responder-capture-form.md`
§11, which is now the record for these screens.

**Slice 4 — Send, More, Regions. Done.** Send's QR plate takes the board's caption, the caption on
the white plate is now fixed ink (the old theme colour was unreadable on white in dark mode), and the
on-device privacy note is in. More gains an "On this phone" card, a glacier count badge on the report
queue, and a version footer. Regions' downloading pack becomes the board's hero: a contour corner, a
hi-vis progress bar, and `x / y MB · %` rather than a bare percentage.

**Slice 5 — the inheritance pass. Done, and smaller than planned.** Only **Where I am** needed work:
its OS grid reference moves onto the board's ink card, with the coordinates as a light row beneath it.
**Compass, Scan and About already read correctly** — they were built on the slice-3 type roles and
surfaces, so their `machine` readouts and cards needed no change. Recorded rather than pretending
otherwise.

**Slice 6 — verification. Mechanical only.** The four checks and the bundle are green. **Not run, and
it needs hardware:** every Maestro flow (no device or simulator here, and no network to fetch one).
The selectors the flows consume are preserved — `aed-screen`, `aed-map`, `aed-settings`, `aed-flag-0`,
`act-send`, `call-beacon`, `tab-*`; new selectors are additive (`aed-bearing`, `map-bearing-link`,
`settings-regions`, `settings-scan`, `settings-about`, `settings-version`, `cpr-elapsed`, `cpr-stop`,
`act-where`, `act-map`). Also not done: 320px screenshots, both themes, the icon at 40px, and CPR with
Reduce Motion — all of which §7 requires and none of which a type-check or a bundle can stand in for.

**Also worth doing before this is done:** the umbrella plan still reads "draft — awaiting approval"
although slices 0–3 shipped against it (§1), and issues #39 and #41 look landed but are still open.


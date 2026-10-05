# Design directions — session handoff

**Status: the beacon direction is built and merged; the design is the open question.** This file
exists so a fresh session can pick this up without the conversation. Read `AGENTS.md`, `README.md`
and `docs/plans/fieldkit-v1.md` first — this is a supplement to those, not a replacement.

**Where this actually is, as of the latest merge:**

- **#35 → PR #36, merged.** Tab navigation, Locate's in-page sub-tabs, the beacon palette and the
  emergency dock. The plan is `docs/plans/35-beacon-tab-navigation.md`; its §12 is the record of
  where the build departed from the plan, including three bugs that only running the app found.
- **#37, merged.** `docs/design/design-steer.html` — reference apps, the 999-in-the-tab-bar
  proposal, and the capture form re-examined against long-form research.
- **#38, open and awaiting review.** `docs/design/type-and-surface.html` — why the app reads as a
  wireframe, and the typeface decision, with the candidates embedded as real font files.
- **#39, filed, plan written, not built.** `docs/plans/39-emergency-action-in-the-tab-bar.md` —
  remove the dock, put the emergency action in the tab bar as a distinct red item.
- **The capture form** is specified in `docs/design/responder-capture-options.html` and re-worked in
  the steer board. It needs a decision and its own plan; it is the largest outstanding piece.

**The three things blocking further design work:** which typeface (#38), whether to take the 999
tab bar (#39), and the form's structure. Everything else is mechanical.

Sections 1 to 8 below were written before #36 was built. They are kept because the reasoning still
holds, but where they describe the state of the work they are history, not instruction.


---

## 1. What this session did

The task was: work on the design and app structure, check what comparable apps look like, and come
back with three HTML prototypes.

Five self-contained HTML files were written to `docs/design/`, and one plan to `docs/plans/`. **No
application code was changed. Nothing was committed. No dependency was added.** The prototypes are
**design boards** — phone frames laid out on a page to be looked at and argued with — **not wired
into the app in any way**.

| File | What it is |
| --- | --- |
| `docs/design/direction-merged-beacon-tabs.html` | **The chosen direction.** Beacon style + tab shell. Read this one. |
| `docs/design/direction-comparison.html` | Side-by-side matrix and brief-coverage table across the three original options |
| `docs/design/direction-1-field-manual.html` | Option 1 — evolve the current built look |
| `docs/design/direction-2-beacon.html` | Option 2 — dark-first, high-vis, persistent action dock |
| `docs/design/direction-3-workbench.html` | Option 3 — tabbed shell, map-first Locate |
| `docs/plans/beacon-tab-navigation.md` | **The implementation plan — awaiting approval** |

Every direction file shows the same jobs so they compare like for like: Act, CPR, the defibrillator
list, where I am, responder capture, send — in both themes, with a structure diagram. All open by
double-clicking; no server, no CDN, no build step.

Pre-existing artefacts in the same folder, still current: `guided-flow-options.html` (the 3-vs-4-screen
decision) and `app-map.html` (the whole app, and what maps to the original brief).

---

## 2. The three original options, in one line each

Kept because the comparison still refers to them.

1. **Field Manual.** Warm graphite + hi-vis amber, flat and type-driven, red used once. One root
   screen with three doors and a back button home. This was the palette and structure already built
   in the app.
2. **Beacon.** Dark by default, big type, hi-vis amber. The structural bet is a red Call 999 dock
   pinned to the bottom of **every** screen.
3. **Workbench.** Cool graphite + surveying lime, four tabs (Act · Locate · Field · More), map-first
   Locate, with the Responder depth adding a **tab**.

---

## 3. The decision, and how it departs from the recommendation

**Decided by the owner** (via the remote-control channel): **Beacon's idea, carried on Workbench's
bottom tab navigation and sub-tabs**, with the visual style explicitly still open.

This deliberately departs from the recommendation recorded in `direction-comparison.html`, which was
to take Workbench's Locate tab but **reject its tab bar**. The owner wants the tab bar. That is their
call, and it is a reasonable one — the tab bar is what gives the AED map and the capture forms a home.

**The conflict the decision created, and how it was resolved.** Beacon's promise is that Call 999
never leaves the screen; a four-item tab bar also wants the bottom. Two stacked bars on every screen
would put two red things on Act and spend ~100px of the thumb zone. The resolution, in the merged
prototype:

> The **tab bar is always present**; the **red Call 999 dock appears directly above it on every
> screen except Act**, where the primary body button is already that action. So there is exactly one
> red thing on any screen, always.

The accepted cost is ~106px of bottom chrome plus the safe area on non-Act tabs. If that proves too
much on a small screen, the recorded fallback is a red fifth tab — which demotes the emergency action
to a peer of "More", and which we are not building.

---

## 4. What is locked regardless

Load-bearing, and the merged direction respects all of them. Do not quietly change them; flag it
explicitly if anything seems to require it.

- **Depth is not a mode.** The emergency path is identical for everyone; the Responder depth only
  adds. In the merged direction it adds a tab, and the test asserts the order of the others.
- **Red does one job.** It appears once, on the emergency action, and nowhere else.
- **Clinical content is reproduced, never authored**, and every record carries source, review date
  and edition (`assertCited`). Currently North West Ambulance Service, verbatim, under the Open
  Government Licence; Resuscitation Council UK is the intended authority later.
- **The app never diagnoses.** It records observations and presents cited guidance.
- **Offline is the default path.** Anything needing network degrades visibly and never gates a core
  flow.
- **Nothing stale is presented as authoritative.** In particular, what3words is never shown as your
  current position.

---

## 5. The chosen palette, exactly

This supersedes the palettes in options 2 and 3. It is the one to implement, authored in OKLCH.
**React Native cannot parse `oklch()`**, so it needs the same sRGB-equivalent treatment the existing
tokens use in `src/constants/theme.ts`, with the OKLCH kept in a comment. Match that file's shape.

The important change from option 2: the base moved from **warm** graphite to a **cool** near-black,
and the signal is a **hotter, more fluorescent** amber. That is what stops it being Field Manual at
night — the signal reads as emitted light rather than a warm paper accent.

**Dark — the default**

```
--base        oklch(14% 0.008 250)    --signal      oklch(80% 0.19 72)
--panel       oklch(19% 0.010 250)    --signal-ink  oklch(20% 0.05 72)
--panel2      oklch(24% 0.012 250)    --rescue      oklch(63% 0.24 27)
--line        oklch(30% 0.014 250)    --rescue-ink  oklch(100% 0 0)
--ink         oklch(97% 0.004 250)    --bezel       oklch(23% 0.010 250)
--soft        oklch(74% 0.012 250)
```

**Light — the variant**

```
--base        oklch(98% 0.004 250)    --signal      oklch(72% 0.17 72)
--panel       oklch(100% 0 0)         --signal-ink  oklch(20% 0.05 72)
--panel2      oklch(94% 0.008 250)    --rescue      oklch(52% 0.22 27)
--line        oklch(87% 0.010 250)    --bezel       oklch(89% 0.008 250)
--ink         oklch(16% 0.012 250)
--soft        oklch(45% 0.014 250)
```

**Map tokens** (dark / light): `water oklch(30% 0.045 240) / oklch(85% 0.045 240)`,
`green oklch(26% 0.035 150) / oklch(91% 0.040 150)`, `road oklch(38% 0.012 250) / oklch(99% 0.002 250)`,
`road2 oklch(33% 0.012 250) / oklch(96% 0.004 250)`, `mapink oklch(72% 0.02 250) / oklch(52% 0.02 250)`.

**Also fix in the same pass:** `app.json` splash `backgroundColor` is `#208AEF`, a blue belonging to
no direction, and the Android adaptive icon background is `#E6F4FE`. Both need the new base.

**Dark is the default**, so `src/hooks/use-theme.ts` currently falls back to `'light'` and must flip
to `'dark'`, or the app opens light on a device reporting `unspecified`.

---

## 6. Next steps, in order

1. **Get `docs/plans/beacon-tab-navigation.md` approved.** Per `AGENTS.md`, the plan is what gets
   reviewed, not the first code. No application code should be written before this.
2. File the GitHub issue for it (the next free number is **#35**; the last merged PR was #34), rename
   the plan to `docs/plans/35-beacon-tab-navigation.md`, and reference it from the branch and PR.
3. **The four style questions in the merged prototype need an answer first.** Three of them change
   layouts — in particular the type voice, which means bundling a font if a condensed grotesque is
   chosen, and the app has never bundled one. Do not let whoever implements slice 1 settle those
   alone.
4. Then build in the plan's four slices: theme and components → tab shell → depth-gated tab → Maestro
   and tests. Slice 1 is deliberately separable so the style can be judged on a running build.
5. Run the four checks (`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`) plus
   `npx expo export --platform ios`, and drive the changed screens with Maestro, looking at the
   screenshots — especially at 320px width, where the bottom chrome is most likely to break.
6. Update the plan's design-artefact list so the signed-off doc does not drift, and add the merged
   prototype to the list in `docs/plans/fieldkit-v1.md` §0.

---

## 7. Verified, and not

**Verified:** all five HTML files render without horizontal overflow at desktop and narrow widths;
the links in `direction-comparison.html` resolve to real files; light and dark both render correctly
in every frame. A real bug was found and fixed along the way — a forced-theme frame inherited the
page's computed `color`, so the large question text went invisible in the opposite theme; `.phone`
now re-declares `color: var(--ink)`.

**Not verified, and stated as such in the files:** nothing has run on a device or through Maestro;
the map is drawn in CSS purely so the composition can be judged, and is not a proposal for how
MapLibre should render; settings, region packs, scan and about appear as nodes in structure diagrams
rather than as frames; no motion is specified anywhere; and the bottom-chrome height on a real
320px-wide screen has been reasoned about but not measured.

---

## 8. Read first, in this order

1. `AGENTS.md` — how this repo works (plan first, human merges, guardrails).
2. `README.md` — what is actually built, and what is not.
3. `docs/plans/fieldkit-v1.md` — the approved v1 plan, §4.1 for the design rules that are not
   negotiable.
4. `docs/design/direction-merged-beacon-tabs.html` — the chosen direction.
5. `docs/plans/beacon-tab-navigation.md` — the plan awaiting approval.

# Field Kit — the violet register: redesign plan

**Ticket:** new issue (number TBD). **Art direction:** `docs/design/field-kit-redesign.html`
(screens, both themes), `docs/design/field-kit-brandkit.html` (mark, palette, type, material).

---

## 1. The decision this implements, and what it reverses

The owner has chosen a new register, referencing a first-aid learning app whose *feel* they liked:
violet brand, tinted neutrals, large radii, a floating bottom bar with a separate round emergency
button, gradient hero surfaces, pastel accents. **Light and dark, dark first.**

**This reverses a load-bearing decision and it is recorded here, not slipped in.** `theme.ts`
currently states the register is deliberately *not* the expected health-app look — cool near-black,
one fluorescent signal, red doing exactly one job. It also reverses the shipped bottom-chrome rule in
`docs/plans/35-beacon-tab-navigation.md` §2 (dock above the bar, absent on Act) and lifts its §9
exclusion of a red emergency element in the bar.

**What does not move, because it is safety rather than style:**

- Red remains the emergency action and nothing else. Every other red goes (the AED flag becomes a
  pink chip).
- Records stay on the device; offline stays the default path; the app still never diagnoses and still
  reproduces guidance rather than writing it.
- The scope boundary holds: **no gamification.** The reference is a *training* app; its courses,
  quizzes, certificates, streaks and dashboards are a different product and are not in this plan.

---

## 2. Decisions taken (so the build has one answer, not options)

| Question | Decision | Why |
| --- | --- | --- |
| Text face | **Nunito Sans**, replacing Overpass | Round enough for the register, still legible at 13px, which matters standing up. Poppins is the rounder alternative if this is vetoed. |
| Machine face | **IBM Plex Mono, unchanged** | "Words in one face, measured values in the other" is what stops it reading as a brochure. |
| Emergency action | **A round beacon inside the bottom bar, present on every screen including Act** | Same place always, never navigated away from, and it returns ~45px of thumb zone. |
| Act's body | **Loses its full-width red button** | Otherwise Act has two red things. This is the honest cost — see §6. |
| Icon | **Violet gradient field, four white modules, red centre dot** | Reads at 40px; the dot survives as the one red. |
| Splash | The four-module mark on the new dark canvas | The app's own canvas, not a second colour. |

---

## 3. The palette (both schemes)

Authored in OKLCH in the design boards, converted to sRGB here — the existing file's convention of
keeping the OKLCH figure in a comment stays. **Every value below is a proposal that the contrast gate
(§5) may adjust**, particularly on light.

| Role | Dark | Light |
| --- | --- | --- |
| canvas | `#0B0A12` | `#F3F4F9` |
| panel | `#16141F` | `#FFFFFF` |
| control | `#1E1B2A` | `#F1F2F8` |
| selected | `#272238` | `#E9E7F6` |
| line | `#312B45` | `#E3E2EE` |
| ink | `#F4F2FA` | `#14121C` |
| soft | `#A8A2BE` | `#6B6880` |
| brand / brand-2 / brand-deep | `#6D4BFF` / `#9A6BFF` / `#3A14D6` | `#4B21F0` / `#7C4DFF` / `#3A14D6` |
| pink · teal · amber (accents) | `#FF3E7F` · `#2FD9A8` · `#FFC24B` | `#DE2468` · `#0FAE83` · `#B97F00` |
| rescue (999 only) | `#FF2D46` | `#E11D38` |

Neutrals are **tinted violet, not grey** — the single change that does most of the work. Radii rise
(`sm 12 · md 18 · lg 22 · xl 26 · pill`), and every shadow carries the brand hue rather than black.

---

## 4. Slices

Each is separately reviewable, in this order. Slice 1 is the foundation; 2 is independent of 1 and
could ship first if the assets are wanted immediately.

### Slice 1 — the register (no layout change)

| File | Change |
| --- | --- |
| `src/constants/theme.ts` | The new palette both schemes; `Surfaces`, `Bevel`, `Elevation` re-tuned, shadows brand-hued; radii. |
| `src/constants/surface.ts` | Compositions updated: raised panel gains a gradient hairline and a tinted shadow; new `brandSurface` for the violet hero; `signalSurface` retuned. |
| `src/constants/type.ts` | `FontFamily` → Nunito Sans + IBM Plex Mono; roles re-scaled (display 27, label 10.5/`.18em`). |
| `scripts/build-fonts.sh` | Fetch `NunitoSans[YTLC,opsz,wdth,wght].ttf` and **instance all four axes** (`wght=400/600 opsz=12 wdth=100 YTLC=500`), subset, replace the Overpass pair. Keep IBM Plex Mono. |
| `assets/fonts/` | The three new TTFs; Overpass removed. |
| `src/constants/fonts.ts`, `src/app/_layout.tsx` | New keys. |
| `src/app/_layout.tsx` chrome | Navigation theme colours follow the new palette. |
| tests | `type.test.ts` (names must match the registered keys), `surface.test.ts` (tokens). |

Ships with **no layout change**, so a regression is unambiguous — the same discipline slice 1 of the
type-and-surface work used.

### Slice 2 — the brand assets

| File | Change |
| --- | --- |
| `assets/brand/mark.svg` | The mark, one source: four 34×34 r12 modules at (31,1)(1,31)(61,31)(31,61) around a r9 dot, in a 96 box. |
| `scripts/build-brand-assets.mjs` | Rasterises the mark with **`jimp-compact`, already a dependency** — no new package, no Chrome, runs in CI. Supersampled 4× and downsampled for clean edges. |
| `assets/images/icon.png` | 1024², opaque: violet gradient field, white modules, red dot. |
| `assets/images/android-icon-{foreground,background,monochrome}.png` | Foreground with the adaptive safe zone; background the brand gradient; monochrome a white silhouette. |
| `assets/images/splash-icon.png` | The mark on the dark canvas. |
| `assets/images/favicon.png` | Small icon. |
| `assets/expo.icon/icon.json` + `Assets/` | Replace the Expo template fill and layers with the brand gradient and the mark; delete `expo-symbol 2.svg` and `grid.png`. |
| `app.json` | Splash `backgroundColor` → the new dark canvas. |

The script lives in the repo for the same reason `build-fonts.sh` and the AED pipeline do: a binary
nobody can trace is worse than a build step.

### Slice 3 — the chrome (the beacon)

| File | Change |
| --- | --- |
| **New** `src/components/tab-bar.tsx` | The floating nav pill plus a **separate** rounded container holding the round 999 button — the reference's split. Wired via `Tabs`' `tabBar` prop. |
| `src/app/(tabs)/_layout.tsx` | `tabBar={…}`; the native bar is replaced. **`TAB_TEST_IDS` must survive on the nav items** or TC-02 breaks. |
| `src/components/call-dock.tsx` | Becomes the round beacon; `testID` moves to `call-beacon`. |
| `src/components/screen.tsx` | Drops the dock (the bar owns the emergency action now); the footer becomes a floating surface; the bottom inset moves to the bar. |
| `src/app/(tabs)/index.tsx` (Act) | Removes the full-width red button; the two answer paths keep the width. |
| `.maestro/guided/TC-01-the-emergency-dock.yaml` | **Rewritten.** It asserts `call-dock` is absent on Act — now the beacon is present on Act, Locate *and* More, and the assertion becomes "exactly one, always". |
| `.maestro/guided/TC-02-…` | Should pass unchanged — but only if the `tab-*` ids survive, which is the point of the note above. |
| `docs/plans/35-beacon-tab-navigation.md` | A `§13` amendment recording the reversal, so the shipped record does not drift. |

### Slice 4 — the compositions

`Act` gains the violet hero carrying the wordmark and the question plus the two-fact tile row; `AED`
gains tiled rows and the pink flag chip; `Where I am` gains the violet primary readout and pill
sub-tabs; `Capture` gains pastel chips; `Send` gains pill channels. Settings, About, Regions and Scan
mostly inherit slice 1.

---

## 5. The contrast gate (new, and not optional)

The palette changed and light is effectively a new theme, so **every text-on-surface pair is measured
rather than assumed**: a new `scripts/contrast.ts` computes WCAG ratios for the pairs the app actually
renders in both schemes and fails below 4.5:1 (3:1 for large text), wired into `npm test`. The
earlier plan deferred this; it cannot be deferred now, because the previous values do not carry over.

---

## 6. Consequences and risks, stated plainly

1. **On Act the emergency action is no longer the largest thing on screen.** The alternative is to
   keep Act's body button and show the beacon everywhere *except* Act, which restores the old
   inconsistency. Flagged for a decision at approval rather than buried.
2. **The `tab-*` testIDs are load-bearing.** A custom bar can silently drop them, and TC-02's order
   assertions are the only thing that would notice — that is what they were written for.
3. **The dock's absence is a real loss of reach.** ~52px of full-width red becomes a 54px circle.
   That is the trade the earlier plan's open question 3 named, answered the other way.
4. **Nunito Sans is a four-axis variable font.** Instancing must pin every axis or React Native gets a
   partial variable font, which is the failure the font pipeline already documents for Overpass.
5. **Light theme is now designed, so it has to be looked at** — outdoors, in daylight, which is the
   case the dark-first decision was least sure about.

---

## 7. Verification

**Mechanical:** `npm run typecheck`, `scripts` typecheck, `lint`, `format:check`, `test` (now including
the contrast gate), and `npx expo export --platform ios`. `tsc` is the checklist for the font-key and
token churn.

**On a device, by looking at it:** screenshots at **320px on iOS *and* Android**, both themes, on Act,
AED, Where I am, Capture and Send; the floating bar's bottom inset and the beacon's target size; and
the **Maestro** suite with TC-01 rewritten and TC-02 proving the tabs did not move. The icon and
splash get looked at on a home screen and a cold launch, not just in a file listing.

**Honest gaps to state at the end:** whether the beacon still reads as the loudest thing on Act, and
the light theme's daylight contrast, are judgement calls that need a real device and daylight.

---

## 8. Out of scope

- Any learning or gamification feature from the reference (courses, quizzes, certificates, streaks,
  dashboards) — a product decision, not a style one.
- Clinical content, offline rules, consent, the data model.
- Region packs and the map style beyond inheriting the palette.

---

## 9. Landing

One issue for the re-register, four slices, each its own PR off `main`, titled `[ai-assisted]`,
referencing this plan and the art-direction boards, each with an "As built" section for any departure
and a `Manually reviewed by <name>` line. A human merges. Slices 1 and 3 are the ones that change
behaviour; 2 and 4 are additive and can land in any order after 1.

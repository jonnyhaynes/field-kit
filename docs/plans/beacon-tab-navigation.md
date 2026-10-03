# Beacon tab navigation — implementation plan

**Status: draft — awaiting approval.** No application code has been changed. Per `AGENTS.md`, this
plan is what gets reviewed, not the first code, and a human approves it before any of it is built.

**Ticket:** to be filed. The next free number is **#35** (the last merged PR was #34). Rename this
file to `docs/plans/35-beacon-tab-navigation.md` once the issue exists, and reference the issue in
the branch name and the PR body.

**Design source:** `docs/design/direction-merged-beacon-tabs.html`. Read that first — it is the
structural answer and the style pass this plan implements.

**Every factual claim below was checked against the code**, not taken from an exploration summary;
§7 lists what was checked. One count in an earlier draft was wrong (the route count), which is the
reason for the check.

---

## 1. The decision this implements

From the owner: **Beacon's idea** (dark, high-vis, the emergency action never leaving the screen),
carried on **Workbench's navigation** (a bottom tab bar, with sub-tabs inside a tab), with the visual
style explicitly still open.

This plan therefore covers the **structural** change. It does not attempt to close the four style
questions recorded in the design file; those need an answer before the visual layer is finished, and
three of them change layouts, so they should be settled before or during slice 1 rather than after.

---

## 2. The one design problem this plan has to solve

A persistent Call 999 dock **and** a four-item tab bar both want the bottom of the screen. Stacking
both bars on every screen costs ~100px of the thumb zone to restate an action that is already on
screen, and puts two red things on Act.

**The rule, from the design file:** the tab bar is always present; the red Call 999 dock appears
directly above it on every screen **except Act**, where the primary body button is that action.

**How it lands in code:** the tab bar is rendered by the tab layout, outside the screen. The dock is
rendered by the shared `Screen` shell as the last thing inside a screen, so it naturally sits above
the tab bar. Act is the one screen that opts out.

```
┌────────────── screen content (scrolls) ──────────────┐
│                                                       │
├────────────── contextual actions (optional) ──────────┤   ← Screen's existing `actions`
├────────────── Call 999 dock (unless dock={false}) ────┤   ← new, part of Screen
├────────────── tab bar (from the tab layout) ──────────┤
```

---

## 3. Route restructure

The app is currently one flat `Stack` in `src/app/_layout.tsx` with **12 sibling routes** — confirmed
by counting the `Stack.Screen` entries, not inferred. It becomes a `Tabs` navigator with a nested
stack per tab.

The nesting is not cosmetic: CPR and the defibrillator list must keep the tab bar visible **with Act
lit**, because they are Act territory rather than places of their own. A screen pushed as a sibling of
the tabs would cover the tab bar, which contradicts the design.

```
src/app/
  _layout.tsx                     root Stack; headerShown false for the (tabs) group
  (tabs)/
    _layout.tsx                   Tabs: Act · Locate · [Field] · More
    (act)/
      _layout.tsx                 Stack, headerShown false (custom headers stay)
      index.tsx                   Act            ← was src/app/index.tsx
      cpr.tsx                     ← was src/app/cpr.tsx
      aed.tsx                     ← was src/app/aed.tsx
    (locate)/
      _layout.tsx                 Stack + sub-tab segment header
      index.tsx                   Map            ← was src/app/map.tsx
      where.tsx                   Where I am     ← was src/app/position.tsx
      compass.tsx                 ← was src/app/compass.tsx
      regions.tsx                 ← was src/app/regions.tsx
    (field)/
      _layout.tsx                 Stack + sub-tab segment header (depth-gated)
      index.tsx                   Capture        ← was src/app/record.tsx
      report.tsx                  Send           ← was src/app/send.tsx
      scan.tsx                    ← was src/app/scan.tsx
    more.tsx                      More           ← was src/app/settings.tsx + about.tsx
```

All twelve existing routes are accounted for in that tree. `about.tsx` folds into the More tab as a
section rather than a route, since it is reachable from three places and is a destination rather than
a place.

**Route paths change, and that has consequences.** `/cpr` becomes `/act/cpr` (and so on). This is the
bulk of the diff: **15 `router.push` call sites across 8 files**, counted rather than estimated
(`index` ×4, `map` ×3, plus `aed` ×2, `record`, `regions`, `send` ×2, `cpr`, `position`).

**The churn is compiler-enforced, which is the good news.** `app.json` sets
`experiments.typedRoutes: true`, so `router.push('/cpr')` is a typed call — moving the route makes
`tsc --noEmit` fail at every affected call site. The route change therefore cannot be silently
half-done, and `npm run typecheck` is the checklist. **Maestro selectors are the part the compiler
cannot see**, which is why they need their own slice and their own care.

**Sub-tabs use `replace`, not `push`.** Switching Map → Where I am → Compass replaces the top of the
stack, so the back stack does not grow one entry per sub-tab tap and back leaves the tab.

### The alternative, and why I am not recommending it

Keep every route flat and drive a **custom tab bar** component from the current pathname. No route
churn, so all Maestro flows, deep links and `router.push` calls keep working, and the diff is much
smaller. What it gives up: real back behaviour per tab, per-tab navigation state, platform tab-bar
semantics, and a native way to express the depth-gated tab — all of which would be hand-rolled.
I think the route churn is worth paying once, but this is a genuine fork and the cheaper option is
defensible.

---

## 4. Depth-gating the Field tab

The Responder depth must **add** a tab and never move the others. Enforced by a pure function with a
test, not by inspection:

```ts
// src/navigation/tabs.ts
export function visibleTabs(depth: Depth): TabId[] {
  return depth === 'responder'
    ? ['act', 'locate', 'field', 'more']
    : ['act', 'locate', 'more'];
}
```

`(tabs)/_layout.tsx` renders `Tabs.Screen` from that list and nothing else. The test asserts both the
member and the **order** of the non-Field tabs, which is the mechanical form of "depth adds, never
moves" — the same principle as the existing `responderForms` type test.

One state transition needs handling explicitly: **turning the depth off while standing on the Field
tab** must navigate to Act (or Locate) rather than leaving the user on a tab that no longer exists.
The settings screen knows the previous depth, so this is a redirect in the toggle's handler.

---

## 5. Theme

`src/constants/theme.ts` is the single source of truth. The merged palette is authored in OKLCH and
**must be converted to sRGB equivalents with the OKLCH kept in a comment**, because React Native
cannot parse `oklch()`. The existing file already follows that convention — match it exactly.

**Dark-first is not one change: the scheme is decided in two places today, and both must flip.**
`src/app/_layout.tsx` calls React Native's `useColorScheme()` directly and maps anything that is not
`'dark'` to `'light'`; `src/hooks/use-theme.ts` calls the app's own `@/hooks/use-color-scheme` and
maps `'unspecified'` to `'light'`. So the navigation chrome and the component colours already derive
from two separate calls, and a device reporting neither will open light on both. Flip both to default
to dark, and **collapse them onto one source while you are in there** — two answers to "what theme is
this?" is how chrome and content drift apart, and this change is exactly when that would start to
show.

Two more inconsistencies to fix in the same pass, since they are palette work:

- `app.json` splash `backgroundColor` is `#208AEF` — a blue that belongs to no direction. Replace with
  the new base.
- Android adaptive icon background is `#E6F4FE` — same problem.

`app.json` also sets `userInterfaceStyle: "automatic"`, which stays; dark-first is achieved in our own
default, not by forcing the platform.

`--signal` needs an accessible partner token for text on the signal fill. The prototype uses
`signal-ink`; the theme already has this pattern (`accentInk`, `rescueInk`).

---

## 6. Components

- **`src/components/screen.tsx`** — gains a `dock?: boolean` prop (default `true`). Renders the dock
  above the screen's bottom edge. Act passes `dock={false}`. It also needs its safe-area `edges` to
  **drop `'bottom'`** once a tab bar exists: today every screen pads for the home indicator itself via
  `SafeAreaView`'s full edge set, and leaving that would double-pad above the tab bar. The tab bar
  should own the bottom inset instead.
- **New `src/components/call-dock.tsx`** — the red Call 999 dock. It is a `Pressable`, not a `View`,
  and it opens the same confirmation sheet the Act action already uses, so the dock cannot dial by
  itself. This is not optional: a red call button permanently under the thumb is the main risk this
  direction takes, and the confirmation sheet is the mitigation.
- **New `src/components/tab-bar.tsx`** only if the native tab bar cannot be styled to the design; try
  `Tabs` `screenOptions` first.
- **New `src/components/sub-tabs.tsx`** — the segmented control used by Locate and Field. Two
  instances, so it earns extraction.
- **`src/components/action-button.tsx`** — add the `signal` variant, and consolidate the accent-filled
  buttons that several screens currently hand-roll inline.

`MinTarget` stays at 52; the prototype's 54 is not worth a token change.

---

## 7. Verification

**Checked against the code, not an exploration summary**

Twelve routes in one flat `Stack` with a matching `Stack.Screen` entry each (an earlier draft said
thirteen); fifteen `router.push` call sites across eight files; two separate colour-scheme sources;
`MinTarget` 52; `Spacing` and `Radius` as documented; splash `#208AEF` and Android icon `#E6F4FE`;
`typedRoutes` and `reactCompiler` both on; eight allow-listed Maestro areas, five of them written.

**Mechanical, as the repo already does it**

- `visibleTabs(depth)` returns the right set and order for both depths (new).
- Turning the depth off while on Field redirects (new).
- The existing suite must pass unchanged: content traceability and `assertCited`, the pace-in-range
  test, and the depth-gate type test.
- `tsc --noEmit` is the route-churn checklist, because typed routes make every stale path a type
  error. If this change lands with no type errors, it is because the routes were not actually moved.
- The four checks plus the bundle prove: `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm test`, `npx expo export --platform ios`.

**On a device, by looking at it**

- Maestro flows updated for the new routes. `.maestro/config.yaml` allow-lists eight areas; **five
  have flows today** (`map/`, `location/`, `settings/`, `capture/`, `transfer/` — 14 flows in total)
  and `smoke/`, `guided/` and `aed/` are allow-listed but unwritten. Only the five written areas are
  work in this slice, and the unwritten `guided/` area is the natural home for the two new assertions.
- Two new assertions that are the whole point of this change: **the dock is present on a non-Act
  screen and absent on Act**, and **turning the depth on adds exactly one tab in a stable order**.
- Screenshots at 320px width (iPhone SE) — the bottom chrome is the thing most likely to break on a
  small screen, and it is the cost this design accepts.

---

## 8. Slices

Tracked as separate units, in this order, each reviewable on its own:

| # | Slice | Contents |
| --- | --- | --- |
| 1 | Theme and components | Palette swap, the two scheme sources collapsed, `signal` variant, `CallDock`, `SubTabs`. No navigation change, so the app still works and can be looked at. |
| 2 | Tab shell | Route restructure, `Tabs` layout, dock wiring, Act opting out, safe-area bottom edge. The churn slice. |
| 3 | Depth-gated tab | `visibleTabs`, conditional tab, the off-Field redirect. |
| 4 | Maestro and tests | Flow route updates, the two new assertions, small-screen screenshots. |

Slice 1 is deliberately separable so the style questions can be answered against a running build
rather than a prototype.

---

## 9. Out of scope

- **Final visual polish.** The four open questions in the design file are unanswered, and the type
  voice one changes every layout if a font gets bundled. Bundling a font is itself out of scope here.
- **Any change to clinical content, the offline rules, the consent rules, or the data model.** This
  plan moves screens; it does not touch what they say.
- **A red fifth tab as an alternative to the dock.** Recorded in the design file as the fallback if
  the bottom-chrome cost turns out to be too high; not built.

---

## 10. Risks

- **Maestro selectors breaking on the route change.** The largest mechanical risk now that the
  compiler covers the TypeScript side. Mitigated by doing it as its own slice with the flows updated
  in the same slice.
- **The bottom chrome on a small screen.** ~106px plus the safe area is a sixth of an iPhone SE. This
  is the accepted cost; it needs to be looked at on the smallest supported width, not assumed.
- **A visible dock is a visible target.** Mitigated by the confirmation sheet, which must be in slice
  2 rather than deferred.
- **Dark-first changes the daytime case,** which is arguably the common one. Worth re-checking the
  light theme against real outdoor contrast rather than on a monitor.
- **Safe-area double padding.** Called out in §6 because it is the kind of thing that looks like a
  spacing bug and gets "fixed" by shrinking a padding token, making it worse.

---

## 11. What approval means

Approving this plan approves the structural direction — tabs, sub-tabs, the dock rule, and the route
restructure. It does not approve the visual style, which stays open, and it does not authorise the
style questions to be settled by whoever implements slice 1 without an answer from the owner.

The PR will be titled `[ai-assisted]`, reference this doc, and end with a `Manually reviewed by
<name>` line. A human merges once CI is green.

---

## 12. As built — where the diff departs from this plan

Recorded here rather than left in the diff, per the repo's convention.

1. **The send screen lives in Act's stack, not Field's.** This plan put it in Field, and the
   prototype showed Field as Capture | Report. That was wrong: §1 says *both* depths send a report,
   and Field only exists at the responder depth — so a guided user's "Send a report" link would have
   navigated to a tab that is not there. Send is at `/send` in the Act stack, which is where it
   already was for a guided user. Field is the capture workspace, with scan pushed from it.
2. **Therefore Field has no sub-tabs.** The sub-tab control is demonstrated by Locate (Map · Where I
   am · Compass), which is three peers and genuinely could not be a stack. A two-item control in
   Field would have been a pattern looking for a use.
3. **There is no confirmation sheet, and the plan was wrong to require one.** `callEmergencyServices`
   deliberately has none: `tel:` hands off to the dialler, which is itself the confirmation, and
   `emergency/dial` records that an in-app sheet would cost a tap where taps matter most. The dock
   calls the same function as Act's button, so the two cannot behave differently under the same
   label. The residual risk is a mis-tap opening the dialler with 999 ready, not a placed call.
4. **The route churn was smaller than predicted.** Act is served from a route *group*, `(act)`, which
   does not appear in the URL — so `/` and `/cpr` did not move, and `/aed` did not either. Only the
   locate, field and more routes changed. Seven `router.push` call sites were edited, not fifteen.
5. **`about` stayed a pushed screen** inside More rather than being folded into Settings as a
   section. It is long, and the ODbL wants the attribution reachable rather than merely present,
   which a back button satisfies. The plan's "folds into More as a section" was an over-simplification.
6. **The theme decision was duplicated in five places, not two** — the root layout, `use-theme`, the
   map screen, and both platform scheme hooks. All of them now call one `resolveScheme`.
7. **The Android adaptive icon was left alone.** Its background is still `create-expo-app` template
   artwork — a pale-blue construction grid with the Expo default mark — so changing the background
   colour would have half-fixed a placeholder and possibly made it worse. A real app icon is a
   release task. The splash background *was* changed, because the splash icon is white and the old
   `#208AEF` belonged to no direction.
8. **Palette values are in-gamut and two were measured rather than copied.** The design's signal
   chroma exceeds sRGB, so it is set to the most sRGB can hold at that lightness and hue. Rescue sits
   at L58 rather than the design's L63 because white-on-red measured 3.93 there.


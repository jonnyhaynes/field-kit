# The emergency action in the tab bar — implementation plan

**Status: approved, with one interaction decision outstanding.** The structure is approved; the open
question is whether the emergency action responds to a tap or a hold, and §2 sets out the case for
the tap. No application code has been changed yet.

**Ticket:** #39. **Design:** `docs/design/design-steer.html`, section "The 999 action in the tab bar".

**Depends on nothing.** This is structural. The surface and type system proposed in
`docs/design/type-and-surface.html` is still unapproved (PR #38), so the *styling* of the new item
will be revisited when that lands. The structure below does not change either way.

---

## 1. The decision this implements

The dock — a red Call 999 bar pinned above the tab bar — was the weakest part of the navigation that
shipped in #35. It cost roughly **60px of pinned chrome on every screen that was not Act**, and it
forced an asymmetry: Act had no dock, because its primary button already was that action, and
everywhere else did. That is a rule a person has to remember rather than a thing they can see.

From the owner: put the emergency action **in the tab bar**, in red. Confirmed as the better shape
here because it gives **one bar and one rule**, and returns the 60px to every screen.

---

## 2. How the action gets into the bar — the one real technical question

A tab bar item normally *navigates*. This one must **dial**. Two ways to do that:

### Option A — keep the platform tab bar, intercept the press

Add a `Tabs.Screen` whose `listeners.tabPress` calls `event.preventDefault()` and then invokes the
dialler. React Navigation supports this directly.

**Problem:** a `Tabs.Screen` needs a route to exist, so this requires a `emergency.tsx` that renders
nothing — a route reachable by deep link that shows a blank screen unless it is separately guarded.
That is a piece of dead surface kept alive so a button can exist.

### Option B — render our own tab bar — **recommended**

`Tabs` takes a `tabBar` prop. Our bar renders the four real tabs plus the emergency action as a
plain `Pressable`. No dummy route, and the divider and filled pill that make the action read as
*not-a-tab* are ours to draw — the platform bar offers no way to separate one item like that.

We already render custom glyphs (`TabGlyph`), we already decide which tabs exist (`visibleTabs`), and
we already know the bar's palette. This is not a step away from the platform; it is closing a gap we
had already opened.

**What it costs, honestly:** we own the platform behaviours the default bar gave us — iPad sidebar
adaptation, long-press menus, and the accessibility semantics of a real tab list. The default bar
gives those free, and a custom one has to be written correctly rather than inherited.

**The accessibility obligation that follows, stated so it is not missed.** The four destinations must
be `accessibilityRole="tab"` with `accessibilityState={{ selected }}`, inside a container marked as a
tab list. **The emergency action must not be** — it does not select anything, it places a call.
Announcing it as a tab would tell a screen-reader user that tapping it changes screen. It is a
`button`, and it should say what it does.

### Tap or hold — a proposal from the owner, and my recommendation

**Proposed:** make the emergency action a long press rather than a tap, so that brushing the most-
tapped strip of the phone cannot trigger it. That is a real concern, and the precedent is real —
Apple's Emergency SOS and most panic buttons do use a deliberate gesture.

**I would not do it, for three reasons.**

1. **It solves a cost that `tel:` already absorbs.** A mis-tap opens the dialler with 999 ready and
   places no call. The recoverable cost is a couple of seconds and a moment of confusion. The
   deliberate gesture is being asked to protect against something already cheap.
2. **The precedent does not transfer.** Emergency SOS and panic buttons hold because they *summon
   responders* — a false alarm dispatches somebody. Here nothing is dispatched until the user
   presses call in the dialler, and **that press is already the deliberate step**. Moving
   deliberation forward would put it in front of the user twice.
3. **It makes the action harder under exactly the conditions it exists for.** A hold needs a steady
   press. Someone shaking, or holding a phone one-handed over a casualty, is the person least able
   to give one — and nothing on screen would say a hold was needed, so a tap that does nothing reads
   as a broken button rather than as a gesture to retry.

**What I recommend instead:** keep the tap, and make the target deliberate by *separation* — the
divider and the filled pill — rather than by gesture. If testing shows real mis-taps, take the
red-Act-tab fallback in §7 rather than a hold: it removes the mis-tap surface entirely, without
making the emergency action harder to reach.

**If the hold is still wanted after that,** it must be visible rather than hidden: a filling ring, a
short hold (about 600 ms), and wording that says so. A hidden hold on an emergency action is the
worst of both — undiscoverable *and* harder.

**This is the one open decision in this plan.** Everything else is ready to build.

---

## 3. What changes

| Area | Change |
| --- | --- |
| `src/components/call-dock.tsx` | Deleted. Its handler moves to the new bar item. |
| New `src/components/app-tab-bar.tsx` | The bar: four tabs from `visibleTabs`, then the divider and the emergency action. |
| `src/app/(tabs)/_layout.tsx` | Passes `tabBar` instead of relying on `screenOptions.tabBarStyle`. |
| `src/components/screen.tsx` | Loses its `dock` prop and the dock branch. The footer holds `actions` only. |
| `src/app/(tabs)/(act)/index.tsx` | Loses `dock={false}` — there is nothing to opt out of. |
| `src/navigation/tabs.ts` | Unchanged. `visibleTabs` stays the only source of truth for which tabs exist. |

The emergency item calls the same `callEmergencyServices()` that Act's button calls. There is
deliberately still **no confirmation sheet**: `tel:` hands off to the dialler, which is itself the
confirmation, and `emergency/dial` records why.

---

## 4. The thing that will actually bite — the flows

Removing 60px of pinned chrome **moves content back up the screen**, and six Maestro flows were
retuned to work around the taller footer. This is the inverse of the problem that cost a long
debugging session in #35, and it is worth naming before it is discovered again:

- `settings/TC-01` and `TC-02` swipe before tapping `aed-flag-0`, because it had fallen under the
  pinned footer. With the footer shorter it may now be genuinely visible, and their swipe may
  **overshoot** — carrying it under the navigation header, where the tap does nothing and the AED is
  never flagged. That failure looks exactly like a broken reporting feature.
- `location/TC-01/02/03` and `map/TC-03` swipe before tapping the map's link rows, for the same
  reason and with the same overshoot risk.
- `guided/TC-01-the-emergency-dock` asserts `call-dock`, which will no longer exist. Its *meaning*
  also changes: from "the dock is on every screen but Act" to "the action is in the bar on every
  screen", and it should assert that the action does **not** navigate.

So the flow work is not a rename of one selector. **Every swipe that was added in #35 has to be
re-earned** — checked against the screen as it now is, and removed if the element is visible without
it. A swipe that is no longer needed is worse than none, because it fails silently in the other
direction.

---

## 5. Slices

| # | Slice | Contents |
| --- | --- | --- |
| 1 | The bar | `AppTabBar`, the action, the dock deleted, `Screen` simplified, Act's opt-out removed. |
| 2 | Accessibility | Roles and states on the tabs and the action; verified with a screen reader, not by inspection. |
| 3 | Flows and verification | `guided/TC-01` rewritten to the new target, every #35 swipe re-earned, the suite re-run on iOS and Android. |

Slice 1 and 2 are separated deliberately: the bar will *look* right before it *reads* right, and the
second is the one that gets skipped.

---

## 6. Verification

**Mechanical.** `visibleTabs` still returns three tabs at guided and four at responder, in the same
order — the existing test already asserts this and must keep passing unchanged. The four checks plus
the bundle export.

**On a device, by looking at it.** The full Maestro suite on iOS *and* Android, because the bar is
exactly where the two platforms differ — safe-area insets, tab-bar height and the bottom gesture bar
are all platform behaviours we now own. Specifically:

- the action is reachable in one tap from every tab, and reaches the dialler rather than a screen;
- tapping it does **not** change which tab is selected;
- no screen shows two pinned bars;
- the flows that used to need a swipe are checked both with and without it.

---

## 7. Risks

- **Mis-tap.** A tab bar is the most-tapped strip on the phone, so this is a larger mis-tap surface
  than the dock was. `tel:` opening the dialler rather than placing a call is what keeps it
  acceptable. **Fallback, recorded:** a red **Act** tab — same meaning, no new mis-tap surface, one
  tap worse. If testing suggests the pill is hit by accident, take the fallback rather than adding a
  confirmation, which would cost a tap in the situation where taps matter most.
- **Accessibility regressions**, because a custom bar inherits nothing. Mitigated by slice 2 being
  its own reviewed slice rather than a footnote to slice 1.
- **The flows**, as set out in §4 — the most likely place for this change to look broken when it is
  not, and vice versa.

---

## 8. Out of scope

- **The surface and type system.** `docs/design/type-and-surface.html` (PR #38) is awaiting a
  typeface decision. The new bar's final visual treatment follows that, not this.
- **Any change to what the action does.** Still `tel:`, still no in-app confirmation, still the
  dialler's own prompt as the confirmation.
- **The capture form.** Separate decision, separate plan.

---

## 9. What approval means

Approving this approves the structure: the dock removed, the emergency action in the bar as a
distinct non-navigating item, a custom tab bar to draw it, and the flow work that follows. It does
not approve the visual treatment, which waits on the type and surface decision.

The PR will be titled `[ai-assisted]`, reference this doc and #39, and end with a
`Manually reviewed by <name>` line. A human merges once CI is green.

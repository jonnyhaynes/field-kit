# The responder capture form — implementation plan

**Status: draft — awaiting approval.** No application code has been changed.

**Ticket:** #43. **Design:** `docs/design/responder-capture-options.html` (the options) and
`docs/design/design-steer.html` §"The capture form" (the research that revised them).

**Decided by the owner:** the direction — an index of four, with the review step and the disclosure.

---

## 1. What is wrong, measured

The Field tab renders all four mnemonics as cards in one scroll:

| Form | Describes | Fields |
| --- | --- | --- |
| SAMPLER | the casualty | 8 |
| ABCDE | the casualty | 21 |
| ETHANE | the scene | 8 |
| ASHICE | the casualty | 10 |

**47 fields, no index, no position indicator.** ABCDE alone is 45% of the form and taller than two
screens, so a responder who wants ASHICE scrolls past all of it, and one who is inside ABCDE cannot
see how much is left.

The deeper problem: **the four are not alternatives to each other in any way the screen admits.**
Three describe a casualty and one describes a scene — the app already knows this and shows it as a
tag. That distinction is the beginning of a menu, not a detail on a card.

---

## 2. The structure

**The tab becomes an index of four.** Each row: the mnemonic, one line on what it describes, and its
progress (`3/21`). Tapping opens it.

**Opening one gives it the screen** — a pushed route with its own header, a back affordance, and the
send action where it belongs. The rules that follow from the research:

- **Split only at real seams, and group by meaning.** The four mnemonics *are* four nameable ideas,
  which is why an index of four is the right split rather than an arbitrary one. Nothing inside a
  form gets its own step: a form is one idea.
- **Named steps beat a bare number.** Inside ABCDE, A-B-C-D-E is a named stepper. It is the
  mnemonic's own structure, and it turns 21 loose fields into five stages of four or five.
- **Progress is honest and visible while deciding**, not only while scrolling.
- **Back is lossless, and the flow survives interruption.** The report already persists on the
  device — this is about saying so and honouring it, not building storage.

**Within a step**, 2–5 fields is the guidance, single column, 44–48px targets, primary action in the
sticky footer. ABCDE's stages are already close to that size, which is a good sign rather than a
coincidence: the mnemonic was designed to be worked through.

---

## 3. Progressive disclosure

Eighteen fields across the four forms are marked `needsEquipment` and say **"Needs equipment you may
not have."** They sit inside the step they belong to, behind a disclosure — **"4 fields that need
equipment"** — closed by default.

Two rules that follow, and both matter more than the detail:

- **A disclosed field that has been answered stays visible.** Collapsing something a person has
  already recorded would hide their own work, which is the opposite of the point.
- **The disclosure must not be a second, quieter form.** It is a handful of fields, not a section.

This is the one part of the plan that changes what is on screen without changing the data, so it is
its own slice.

---

## 4. The review step

Send is the irreversible action, and every source on long-form design agrees it should be preceded by
a look at the whole picture. The existing send screen already carries the payload and the QR; this
makes it explicitly a **review**: one row per form that has anything in it, with its progress and an
**Edit** link back to the form that owns it, then the position and the times, then Send.

A report that has nothing in it still cannot be sent — that behaviour already exists and does not
change.

---

## 5. Routes and the things that hang off them

```
src/app/(tabs)/field/
  index.tsx            the index of four          ← was the whole capture screen
  [form].tsx           one form, as a focused route
  review.tsx           review and send
  scan.tsx             unchanged
```

The form id is a route parameter rather than four near-identical files, because the forms are already
data (`src/capture/forms.ts`) and §4.4's whole point is that a field change is a reviewable diff.

**What this breaks, and it is worth being blunt about:** the existing capture flows select by
`record-mnemonic-<id>` and `record-input-<id>`, and they assume all four forms are on one page. Every
one of them has to change, and the `scrollUntilVisible` calls that were needed to *reach* ETHANE and
ASHICE become unnecessary — which is exactly the kind of no-longer-needed step that fails silently in
the other direction. Same lesson as #36, in the opposite direction.

---

## 6. Slices

| # | Slice | Contents |
| --- | --- | --- |
| 1 | The index | The tab becomes four rows with progress; tapping opens a form. No form internals change. |
| 2 | The focused form | The A-B-C-D-E stepper inside ABCDE, the sticky action, lossless back. |
| 3 | Disclosure | Equipment-dependent fields behind a closed-by-default disclosure, with the answered-stays-visible rule. |
| 4 | Review and send | The review as a real step, with per-form edit links. |
| 5 | Flows | Every capture flow rewritten for the new structure, and the now-unnecessary scrolls removed. |

Slices 1 and 2 already remove the complaint; 3 and 4 are the parts the research added, and either
could ship separately if you want the structural fix sooner.

---

## 7. Verification

**Mechanical.** The depth gate still refuses capture at the guided depth — the existing type test
must keep passing unchanged. The forms-as-data tests are unaffected. The four checks plus the bundle.

**On a device, by looking at it.** The capture, transfer and settings areas on iOS **and** Android,
and specifically:

- an observation entered in a form survives navigating back to the index and into another form;
- an answered equipment field is still visible with the disclosure closed;
- a report survives the app being closed and reopened mid-capture;
- the index shows real progress, not a count that lags.

---

## 8. Risks

- **Loss on navigation.** The largest risk, and the reason the "answered stays visible" rule and the
  resume check are acceptance criteria rather than nice-to-haves.
- **The review step could become a second form.** It must summarise and link, never ask.
- **Flow churn**, as set out in §5 — the biggest mechanical cost, and the place a passing suite can
  hide a real regression.
- **The equipment disclosure could hide something clinically salient.** It only ever hides fields
  that were already marked as needing kit; a clinician's read before release would be worth having
  here specifically.

---

## 9. Out of scope

- **What the forms ask.** No field is added, removed or reworded. This is structure and presentation
  only — a field change is a content review, not a refactor.
- **The visual treatment.** The surface and type system (#41) applies to these screens once it
  exists; this plan is about structure.
- **The send payload and the QR.** Unchanged.

---

## 10. What approval means

Approving this approves the index, the focused form with a named stepper, the equipment disclosure
and the review step, and the route changes that follow. It does not approve any change to what a form
asks, which stays exactly as it is.

The PR will be titled `[ai-assisted]`, reference this doc and #43, and end with a
`Manually reviewed by <name>` line.

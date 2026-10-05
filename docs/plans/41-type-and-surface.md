# Type and surface — implementation plan

**Status: draft — awaiting approval.** No application code has been changed.

**Ticket:** #41. **Design:** `docs/design/type-and-surface.html`, which carries the diagnosis and the
three typeface specimens set in the real fonts.

**Decided by the owner:** the typeface. Overpass for anything a person reads; IBM Plex Mono only for
machine strings.

---

## 1. What this fixes, in one line

The app reads as a wireframe because a border is doing the job of a surface, nothing has elevation,
one accent is used only as fill, and the type has no voice. This plan gives it surfaces and a voice,
and changes nothing about how it works.

---

## 2. A correction to the board, first

The board quotes **96 KB for four latin cuts**. That is the **woff2** size, which is what a web page
downloads. **React Native needs TTF or OTF**, and static TTFs are substantially larger.

So the real cost is not yet known, and it gets measured before the font is wired in — because it is
the kind of number that decides whether a variable font or a subset is needed, and this project has a
standing rule about measuring rather than estimating. Two things to try in order:

1. **The variable font.** Overpass ships as a variable TTF, so one file may cover every weight rather
   than two static cuts.
2. **Subsetting.** If the whole face is too large, `pyftsubset` to Latin plus the punctuation the app
   actually uses.

Record the measured size in this plan once it is known, the way the map `maxzoom` decision was
recorded.

---

## 3. The token layer

Four surfaces and three elevations replace "one panel colour and a hairline".

**Surfaces** — a ramp with a little chroma in it, so adjacent steps read as different materials rather
than different opacities:

| Token | Job |
| --- | --- |
| `canvas` | the screen behind everything |
| `panel` | a raised card |
| `control` | something tappable on a panel |
| `selected` | a chosen or active control |

**Elevation** — one stack, applied at every raised level, and the thing that actually stops a
rectangle reading as a wireframe box:

```
hairline stroke      present, but no longer the shape
lit top edge         1px inset highlight at ~7% white (12% on controls)
graduated fill       panel colour, slightly darker at the bottom
soft drop shadow     0 2px 6px at 30% black; deeper on the emergency action only
```

**Type roles** — five, named by job rather than by size:

| Role | Face | Used for |
| --- | --- | --- |
| `display` | Overpass 600 | screen headings |
| `title` | Overpass 600 | card and row headings |
| `body` | Overpass 400 | prose |
| `label` | Overpass 700, uppercase, letterspaced | field labels, section markers |
| `machine` | IBM Plex Mono, tabular numerals | grid references, coordinates, distances, bearings, the metronome, what3words |

The `machine` role is the one that carries meaning: **words in one face, measured values in the
other.** It is what makes the app read as equipment rather than as a document, and it is also the
role that must be applied consistently — a distance set in Overpass would break the distinction the
whole choice rests on.

---

## 4. Components

| File | Change |
| --- | --- |
| `src/constants/theme.ts` | The surfaces, the elevation stack and the five type roles. |
| New `src/constants/type.ts` (or a `Text` wrapper) | The roles, so a screen asks for `label` rather than restating size and weight. |
| `src/app/_layout.tsx` | `useFonts` for the bundled faces, with the splash held until they load. |
| `src/components/screen.tsx` | Canvas surface; the footer becomes a raised level. |
| `src/components/action-button.tsx` | The elevation stack on all three variants; the signal variant stops being a flat fill. |
| `src/components/*` (cards, slots, notes) | Panel surface, `label` role for their small caps. |
| Every screen | Readouts move to the `machine` role. |

**Layout does not change.** No spacing, ordering, route or copy changes. If a layout has to move to
fit the new face, that is a finding for this plan rather than a silent edit.

---

## 5. Accessibility

- **Contrast is re-measured for every text-on-surface pair**, with a script, the way the current
  palette was. New surfaces mean new pairs, and the previous results do not carry over.
- **The signal becomes a state, not only a fill** — the active tab, progress, focus. It must still
  never be the *only* signal: an active tab needs more than a colour change.
- **Font scaling.** Dynamic Type at its largest sizes with a wider face is a real risk to the 52px
  targets and the tab bar, so it is tested rather than assumed.
- The `machine` role must not be used for prose, because tabular mono is worse to read in sentences.

---

## 6. Slices

| # | Slice | Contents |
| --- | --- | --- |
| 1 | Fonts and tokens | Measure the font, bundle it, load it, and add the token layer. **No visual change yet**, so a regression here is unambiguous. |
| 2 | Surfaces | The elevation stack applied across the components. |
| 3 | Type roles and contrast | The five roles applied screen by screen, and every pair re-measured. |

Slice 1 shipping with no visual change is deliberate: if the app looks different afterwards, that is
a bug in the plumbing rather than an intended restyle.

---

## 7. Verification

**Mechanical.** The four checks plus the bundle export; the contrast script over every pair; the
existing test suite unchanged.

**On a device, by looking at it.** Screenshots at 320px on iOS **and** Android — the tab bar, safe
areas and text truncation are exactly where a wider face shows up. The Maestro suite on both, because
a font change can move anything a flow taps.

---

## 8. Risks

- **Overpass is wider than the system font.** Every tight row and fixed width needs re-checking:
  tab labels, button hints, AED rows, the tab bar. This is the most likely source of breakage and it
  will not appear in a type-check.
- **Font scaling**, as above.
- **A font is a build change**, not a style change — `expo-font`, the asset pipeline, the splash
  hold, and the measured bundle size.
- **The board's size figure was wrong** and is corrected in §2; the plan should not be approved on
  the assumption that this is a 96 KB change.

---

## 9. Out of scope

- **The 999 tab bar** (#39), which will be styled by this system once it exists. Build this first.
- **The capture form's structure.** Separate decision, separate plan.
- Any change to navigation, routes, copy or the clinical content.

---

## 10. What approval means

Approving this approves bundling the two typefaces and replacing the flat surface model with the
elevation stack above. It does not approve a layout change — if the new face forces one, that comes
back as a finding.

The PR will be titled `[ai-assisted]`, reference this doc and #41, and end with a
`Manually reviewed by <name>` line.

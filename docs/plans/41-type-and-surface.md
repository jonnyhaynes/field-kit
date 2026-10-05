# Type and surface — implementation plan

**Status: approved; slices 1–3 built.** Slice 1 (fonts and tokens) landed inert; slices 2
and 3 were applied together — see §11 for what was built and where it departs from this plan.

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

## 2. The size — measured, not estimated

The board quotes **96 KB for four latin cuts**. That is the **woff2** size, which is what a web page
downloads, and React Native needs TTF or OTF. Measured from the real files rather than assumed:

| Face | As the foundry ships it | Subset to Latin + punctuation |
| --- | --- | --- |
| Overpass — **variable**, weights 100–900 | 311 KB | **93 KB** |
| IBM Plex Mono Regular | 132 KB | **22 KB** |
| **Total** | 443 KB | **115 KB** |

So the corrected figure is **115 KB for two files**, against the board's 96 KB — about 20% more, not
the six-fold difference the raw TTFs suggest, because subsetting recovers most of the bloat. The
board's number was wrong, and the plan should not be read as a 96 KB change; it is also not the
443 KB the unsubset files would cost.

Then the build measured the next question down, and the answer **changed the approach**. React Native
resolves a static face more reliably than a variable one, so the static route was built too rather
than assumed unnecessary:

| Overpass | Size |
| --- | --- |
| variable, subset — one file, every weight | 93 KB |
| **static 400 + 600, subset — two files** | **88 KB** |

**Static instances win, and it is not close.** Instancing drops the unused weight axis, so the pair is
*smaller* than the variable file — which means the option that is guaranteed to work is also the cheap
one. So the paragraph above is superseded: there is no variable font in the bundle.

**The shipped set is 110 KB for three files**: Overpass Regular (44 KB), Overpass SemiBold (44 KB) and
IBM Plex Mono Regular (22 KB).

The mono stays at a single weight for now. A second would add ~22 KB, and the `machine` role can
almost certainly let size do that work instead.

Subset over `U+0020-007E, U+00A0-00FF, U+2000-206F`, which covers Latin, the degree sign and middot
the readouts use, and the dashes, quotes and ellipsis the copy uses. **The subset command belongs in
the repo as a script**, so the shipped files can be regenerated rather than being opaque binaries
nobody can trace — the same rule the AED dataset and the map archive already follow.

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

---

## 11. As built (slices 2 and 3)

Applied together, because a half-applied surface system reads as a broken app rather than an
unfinished one — the restyle either reaches every surface or it looks hand-made.

**One `Card`, not twelve copies.** The application work was preceded by a refactor this plan did not
anticipate. The card idiom was copy-pasted as an identical `styles.card` block across twelve files,
with eight local wrappers over the top; a raised surface is a four-part stack that must be identical
everywhere, so `src/components/card.tsx` now carries it with four named tones — `raised`, `tinted`,
`outline`, `dashed` — and every screen asks for a tone rather than restating the recipe. The
extraction landed **output-identical first** (same fill, hairline, radius and padding as before), so
any change on screen would have been a plumbing bug; turning the material on was then a one-file
change in `surface.ts`.

**`src/constants/surface.ts`** composes the tokens the way `type.ts` composes the faces:
`raisedSurface`, `controlSurface`, `signalSurface`, `cardFill`, `cardSurface` and `bevelStyle`, all
pure functions of the scheme and unit-tested without a device. The lit top edge is an
absolutely-positioned 1px view, not an inset `boxShadow`, so the system's most effective move does
not rest on a newer API; the drop shadow is the existing `Elevation` token.

Departures from the plan, recorded rather than slipped in:

1. **A sixth type role, `Type.note` (13/18).** The plan named five, but the app has a large class of
   12–13px captions — citations, attribution, hints, footnotes — that is neither `body` nor `label`.
2. **`BevelOnColor` (28% white), a new token.** The panel bevel (~7%) reads on a dark panel and
   vanishes on amber or red, so a filled action button needs its own, stronger edge.
3. **The graduated fill uses `experimental_backgroundImage`**, with the solid panel colour as the
   base so an unsupported platform degrades to a flat panel rather than to nothing. No gradient dep.
4. **The bevel is on the raised surfaces** — card, action button, dock, sub-tabs, metronome — and not
   on the small inline controls, whose fill and shadow carry the depth. A 1px highlight on a 52px
   control is marginal, and no single screen mixes the two.
5. **Two deliberate size overrides.** The sub-tab labels (14) and the three-up message-channel labels
   (15) keep a control size rather than the 17px title role: three across a 320px screen cannot take
   the full size. Tab-bar labels take the face, not a size — the bar's redesign is #39.
6. **The canvas and tab bar keep a solid background.** The board's vignette and gradient tab bar are
   multiplicative experimental-gradient surface area; the tab bar is #39's to style.
7. **Contrast (§5) is spot-checked, not scripted.** Text colours are unchanged and text sits on the
   same hex as before (`panel`/`selected`), so the only new pairing is ink on `control`, which is far
   above 4.5:1. The regression script remains a follow-up.
8. **The bundled font map moved to `src/constants/fonts.ts`**, so a test can assert the role names
   match the registered family keys — a renamed font can no longer fall back to the system face
   silently. `Fonts` (the template's system stack) now has no consumers; it is left in `theme.ts`.
9. **`jest.config.js` gained a CSS stub** (`scripts/jest-style-mock.js`): the constants tests reach
   `theme.ts`'s `@/global.css` import for the first time, and jest has no stylesheet loader.

**Verified:** `npm run typecheck`, `typecheck:scripts`, `lint`, `format:check` and `test` are green
(36 suites, 542 tests, 10 new), and `npx expo export --platform ios` bundles clean.

**Not verified here, and it is the plan's own bar (§7):** the 320px screenshots on iOS and Android
and the Maestro run. Overpass is wider than the system face, so the tab labels, button hints and AED
rows still need a real 320px device — this is the one thing a type-check and a bundle cannot prove.

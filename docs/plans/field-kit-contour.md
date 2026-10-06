# Field Kit — Contour: identity plan

**Ticket:** new issue (number TBD). **Art direction:** the Contour canvas (Design artifact, "Contour"
page: *System*, *Emergency path*, *Field and settings*), to be exported into `docs/design/` as part of
slice 0 so the boards live in the repo beside the earlier ones.

**Status: draft — awaiting approval.** No code until a human approves this plan.

---

## 1. The decision this implements, and what it reverses

The violet register (`field-kit-violet-register.md`, shipped in #49 and #50) took the *feel* of a
first-aid learning app the owner liked — and in doing so took most of its recognisable surface too:
violet-to-magenta gradients, a round friendly face, pastel accents, a black nav pill beside a red
circle. The owner wants a stronger, ownable identity that keeps the feel without reading as a copy.

**Contour** keeps what was liked — soft large radii, confident colour, a floating bar, a friendly
tone — and replaces the three things that made it look borrowed:

| Borrowed | Contour |
| --- | --- |
| Violet brand, magenta gradients | **Hi-vis** `#D7F94A` on **pine** `#0F1A16` — from mountain-rescue kit, not health apps |
| 3D clay illustrations | **Contour lines** — from the OS map, the app's own subject |
| Round face (Nunito Sans) | **Bricolage Grotesque** for display, **Figtree** for text |

**This reverses the violet register**, which itself reversed the earlier cool near-black register.
It is recorded here, not slipped in. `theme.ts`'s header comment and `field-kit-violet-register.md`
both get a pointer to this plan — and the header's mention of `scripts/contrast.ts` goes with the
rewrite, since the gate is `src/constants/__tests__/contrast.test.ts` and no such script exists.

**What does not move, because it is safety rather than style:**

- **Red is the emergency action and nothing else.** The pink AED accent goes; AEDs move to glacier blue.
- **IBM Plex Mono stays the machine face** — measured values only.
- Records stay on the device, offline is the default path, the app never diagnoses, guidance is
  reproduced not written. No new copy in this plan instructs anyone clinically.
- **No gamification** — unchanged from the violet plan.

---

## 2. Decisions taken

| Question | Decision | Why |
| --- | --- | --- |
| Brand / action colour | **Hi-vis `#D7F94A`, fill only, ink on it** | Highest-contrast fill in the set (ink on it 14.9:1); reads outdoors |
| Hi-vis as text on light | **`#4B6B0E`** | `#D7F94A` on stone fails; the olive measures 5.35:1 |
| AED / data accent | **Glacier `#8ED8F8`** (dark), **`#0B6E99`** (light text) | Takes over from pink, which sat too close to rescue red |
| Display face | **Bricolage Grotesque 800**, optical size pinned | Characterful at 26–32px, still legible standing up |
| Text face | **Figtree 400/600/700** | Plain, open, not Inter/Roboto, single static weights available |
| Machine face | **IBM Plex Mono, add Medium (500)** | Readouts in the boards use 500; Regular stays for small values |
| Mark | **The cross as three nested contour rings, red point at the centre** | Replaces the four violet modules; still one red dot |
| Bottom bar | **One pill: four tabs, then 999 as a red capsule at the thumb end, labelled "999"** | Replaces pill-plus-separate-circle (the reference's split). A word beats an icon under stress |
| Light theme | **Stone `#F1EFE8`**, ink bar in light too | Warm paper rather than lavender-white |
| Neutrals | **Tinted green (hue ~155)**, not violet | The single change that makes surfaces read as one family with pine |

---

## 3. The palette

Measured with the WCAG formula, not eyeballed. Every pair below is one the boards actually render.

| Role | Dark | Light |
| --- | --- | --- |
| canvas | `#0F1A16` | `#F1EFE8` |
| panel | `#17261F` | `#FFFFFF` |
| raised (chips, inputs, selected) | `#1E3229` | `#E2DED2` |
| line | `#24382F` | `#DDD8CB` |
| text / textSecondary | `#F1EFE8` / `#A9BDB3` | `#10201A` / `#4A5A52` |
| brand (fill) / brandInk | `#D7F94A` / `#0F1A16` | `#D7F94A` / `#0F1A16` |
| brandText | `#D7F94A` | `#4B6B0E` |
| glacier (fill) / glacierText | `#8ED8F8` / `#8ED8F8` | `#8ED8F8` / `#0B6E99` |
| rescue / rescueInk | `#E5192B` / `#FFFFFF` | `#E5192B` / `#FFFFFF` |
| bar (bottom pill) | `#070D0B` | `#10201A` |

| Pair | Ratio |
| --- | --- |
| text on canvas (dark / light) | 15.47 / 14.68 |
| textSecondary on panel (dark) · on canvas (light) | 7.96 · 6.35 |
| muted `#8FA69A` on panel (dark, labels) | 6.07 |
| ink on hi-vis | 14.87 |
| ink on glacier | 11.30 |
| brandText `#4B6B0E` on stone | 5.35 |
| glacierText `#0B6E99` on stone | 4.93 |
| **white on rescue `#E5192B`** | **4.66** — the violet gate had already taken red from the planned 3.67 to 4.60, so Contour's real move is 4.60 → 4.66; the 999 label passes as body text |
| tab label on the bar's ink (dark · light) | 17.04 · 14.68 |
| secondary tab label on the bar's ink (dark · light) | 9.91 · 8.54 |

The bar is ink in **both** schemes, so its labels take the dark-scheme `text`/`textSecondary` values even under light — the two bar pairs above go into the gate below, or the app's loudest control is the one pair nobody measures.

`src/constants/__tests__/contrast.test.ts` is updated with these pairs and must stay green.

Removed tokens: `brand2`, `brandDeep`, `pink`, `amber`, `teal`. Added: `brandText`, `glacier`,
`glacierText`, `bar`. Shadows go back to near-black on dark — the violet plan's tinted shadow made
sense against violet; on pine, depth comes from the surface ramp, not glow. Only the 999 keeps a
coloured shadow (iOS only, as before).

---

## 4. Slices

Each its own PR off `main`, in this order. Slice 1 is the foundation and ships with **no layout
change**, so a regression is unambiguous.

### Slice 0 — the boards into the repo

**Done:** `docs/design/field-kit-contour.html` (system, emergency path, field and settings),
`docs/design/field-kit-identity-directions.html` (the three directions, as the record of the choice)
and `docs/design/contour-mark.svg` (the proposed mark; `assets/brand/mark.svg` changes in slice 2). Mark
`field-kit-redesign.html` and `field-kit-brandkit.html` as superseded in their headers (don't delete
them — they're the record of the reversal).

### Slice 1 — the register

| File | Change |
| --- | --- |
| `src/constants/theme.ts` | Palette above, both schemes; header comment rewritten; `Elevation` re-tuned; `Bevel` kept |
| `src/constants/surface.ts` | `brandSurface` becomes a flat hi-vis fill (no gradient); `raisedSurface` loses the tinted shadow |
| `src/constants/type.ts` | `FontFamily`: `display`/`displayStrong` (Bricolage 700/800 — two instances, so two keys, following the existing `text`/`textStrong` pattern), `text`/`textStrong` (Figtree), `machine`/`machineStrong` (Plex Mono). `display` 32/1.02 in 800, `title` 20 in 700, `label` 10.5 caps +0.16em |
| `scripts/build-fonts.sh` | Fetch Bricolage Grotesque (variable: `opsz`, `wdth`, `wght`) and **instance every axis** (`opsz=32 wdth=100 wght=800`, and `wght=700` for `title`); Figtree 400/600/700; Plex Mono Medium. Subset all. Remove Nunito Sans |
| `assets/fonts/` | New TTFs; Nunito Sans removed |
| `src/constants/fonts.ts`, `src/app/_layout.tsx` | New keys; navigation theme colours |
| tests | `type.test.ts`, `surface.test.ts`, `contrast.test.ts` |

Every screen that reads a removed token fails `tsc` — that's the checklist for the token churn, not
a problem. `aed.tsx` is the known one (`theme.pink`).

### Slice 2 — the mark and brand assets

| File | Change |
| --- | --- |
| `assets/brand/mark.svg` | Three nested plus outlines, `(a,b)` = `(46,18)`, `(33,11)`, `(20,4)` around `(48,48)`, stroke 3.5, opacities .45/.75/1, red point r 5.5, in a 96 box |
| `scripts/build-brand-assets.mjs` | Rasterises **strokes**, not filled rects: replace `insideRoundRect` with a distance-to-outline test. Still `jimp-compact`, still supersampled 3× (as the script is today) |
| `assets/images/*` | Icon: pine field, hi-vis rings, red point. Adaptive foreground with safe zone; background pine; monochrome stone silhouette. Splash: mark on pine |
| `assets/expo.icon/` | Layers updated |
| `app.json` | Splash `backgroundColor` → `#0F1A16` |

**Check at 40px on a real home screen.** The inner ring is the thin point — if it fills in, drop to
two rings at icon sizes and keep three in-app.

### Slice 3 — the bar and the contour component

| File | Change |
| --- | --- |
| `src/components/tab-bar.tsx` | One pill, not two objects. Four tabs at 52px; 999 as a 56px-high red capsule, right end, with the phone glyph and "999" in Plex Mono 600 21px. Active tab = hi-vis disc |
| **New** `src/components/contour.tsx` | The contour field: one irregular closed path drawn at stepped scales with `react-native-svg` (already a dependency). Props: `variant: 'hill' | 'summit'`, `corner`, `tone`. Opacity steps `.16 .26 .45 .70`, stroke 1.2–1.4 non-scaling. Rendered `pointerEvents="none"` and hidden from accessibility |
| `src/components/metronome.tsx` | The rings scale/brighten on each beat (Reanimated, already used). **Respects Reduce Motion** — falls back to the beat dots only |

`TAB_TEST_IDS` and `call-beacon` **must survive** — TC-02 (`the-depth-adds-one-tab`) and TC-01
(`the-emergency-beacon`) are what notice if they don't. TC-01's assertion ("exactly one, on every
screen") is unchanged by design.

### Slice 4 — the compositions

Screens follow the boards. Most is surface and type; the list below is the part that changes
structure.

| Screen | Change |
| --- | --- |
| Act | Hero panel with a hill contour; question in `display`; primary is the hi-vis "They're not breathing / Start compressions"; AED row; two readout tiles |
| CPR | Summit contour around the hi-vis rate disc; elapsed time as a readout; AED button promoted above Stop while running |
| AED | Unverified banner in glacier (**shipped wording stays** — the board's text is a placeholder); numbered glacier badges; "Flag as inaccurate" as a quiet text button |
| Map | Glacier numbered markers; bottom sheet for the selected AED |
| Where I am | Ink readout card with grid reference; light rows for lat/long/bearing |
| Field | Report card in ink; the four forms as rows with progress |
| Capture form | A–E step bar; bar becomes Previous / Next with 999 still at the end |
| More, Regions, Send, Scan, About | Inherit slices 1 and 3; Regions gets the contour download card |

---

## 5. Things in the boards that are *not* just styling — decide at approval

The boards were drawn against the whole app and a few elements go beyond re-skinning. Each is listed
so it is approved or cut on purpose, not built by accident.

1. **"Walk on a bearing"** on the AED list and map sheet — links the selected AED to the compass.
   The compass already computes bearings to the nearest AEDs; this is a new entry point to it.
2. **Elapsed time on CPR** — if the metronome doesn't already track it, it's a small new state.
3. **Progress counts on Field's form rows** (`4/6`) — derived from fields filled, no new data, but new
   logic. Must not read as a score.
4. **Capture form's bottom bar becomes Previous / Next** — the tabs are hidden while a form is open.
   999 stays. Changes navigation inside capture; TC-03 (`observations-stick`) needs a look.
5. **"999" as a word in the bar**, not only a glyph — a copy change on the most important control.

Cut any of these and the boards still hold; they're additive.

---

## 6. Consequences and risks

1. **This is the third register in a few weeks.** The token layer (#48) is what makes it cheap; the
   risk is churn fatigue in review, not in code. Slice 1 ships with no layout change for that reason.
2. **Hi-vis is loud.** It is the action colour, so it must stay rare: one hi-vis fill per screen
   plus the active tab. If a screen wants two, one of them is wrong.
3. **Glacier and hi-vis must be told apart by lightness as well as hue** for colour-blind users. They
   are close in lightness; the AED meaning is also carried by the numbered badge and the word
   "Unverified", never colour alone.
4. **Bricolage is a three-axis variable font.** Same failure mode the font pipeline already
   documents: pin every axis or RN gets a partial variable font.
5. **Contour lines are decoration on an emergency app.** They stay in corners, never under body
   text, and are hidden from screen readers. Reduce Motion stops the CPR pulse.
6. **Light theme is warm, not white** — needs the same daylight check the violet plan flagged.

---

## 7. Verification

**Mechanical:** `npm run typecheck`, `lint`, `format:check`, `test` (with the updated contrast
pairs), and `npx expo export --platform ios`.

**On a device, by looking:** 320px on iOS *and* Android, both themes, on Act, CPR, AED, Map, Where I
am, Field, a capture form and Send; the bar's inset and the 999 target; icon at 40px on a home
screen; cold-launch splash; CPR with Reduce Motion on; the Maestro suite with TC-01 and TC-02
unchanged and passing.

**Honest gaps to state at the end:** hi-vis legibility in direct sun on the light theme, and
whether the 999 capsule reads as loudest on Act now that the primary action is also bright.

---

## 8. Out of scope

- Anything from §5 that isn't approved.
- Clinical content, offline rules, consent, the data model.
- The map *style* beyond inheriting the palette (contour lines on the real map come from the tiles,
  not this component).
- Learning or gamification features — unchanged.

---

## 9. Landing

One issue, slices 0–4, each its own PR titled `[ai-assisted]`, referencing this plan and
`docs/design/field-kit-contour.html`, each with an "As built" section for any departure and a
`Manually reviewed by <name>` line. A human merges. Slices 1 and 3 change behaviour; 0, 2 and 4 can
land in any order after 1.

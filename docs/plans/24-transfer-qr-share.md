# Phase 4b (#24) — getting the report off the phone

Field Kit · issue [#24](https://github.com/jonnyhaynes/field-kit/issues/24) · plan of record `docs/plans/fieldkit-v1.md` §4.2, §1, §6

## What this builds

A report that cannot leave the device is not a report. This slice is the transfer surface: **QR first**
(no network on either side, no entitlement, no physical tag), then the OS share sheet, then `sms:`,
`mailto:` and `whatsapp://`. Both depths can send — Guided sends a short one, Responder the capture —
and a report can be *received* by scanning someone else's code.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| The QR payload | **The ETHANE fields, the position and the times** — not the full report | §4.2 and the issue both name that subset, because a full capture can exceed one code's capacity. A version-40 code holds ~2.9 KB and is 177 modules across, which is hard to scan off a phone screen; the budget below keeps it far smaller. |
| The size budget | **1024 bytes**, and beyond it there is no code | A documented number rather than "until it breaks". It keeps the code well under version 40, and it makes "does this fit" a pure function with a test. |
| Overflow | **Plain text plus the share sheet**, and the screen says why | The issue's own fallback. Shrinking the code until it cannot be read would be worse than not drawing one. |
| Compression | **None** | §4.2 says "compressed", and this is a deliberate departure: compressing ~600 bytes costs a dependency and a base64 round trip, and buys nothing when the content already fits. QR's own error correction covers the channel. |
| The receiving side | **Strict refusal, never a half-read** | A scanned code is untrusted input from another device. The repo's two parses of untrusted data — `aed/geojson.ts` and `aed/overpass.ts` — throw rather than parse to nothing. A scan therefore returns a reason, and the screen names it. |
| A scanned position | **A `RecordedLocation`, with its sample time** | §4.1 rule 1, enforced by the type rather than by care: the receiving screen builds it with `recordedFrom`, so it cannot be rendered in a current-position slot. A received report is **never merged into the user's own** — that would be inventing data. |
| what3words in the payload | **Carried, alongside the coordinates** | The product owner's decision, taken against this plan's recommendation. See `## Record`. |
| The share sheet | **React Native's own `Share`** | No dependency. `expo-sharing` is for sharing *files*; this shares text. |
| The scheme links | Built as **pure URL functions**, launched with `Linking.openURL` | The `src/emergency/dial.ts` precedent, and the escaping is the fiddly part — so it is a tested function rather than a string built inline. |
| Rendering the code | **`react-native-qrcode-svg`** (+ `react-native-svg`) | The plan of record names it. Rendering a QR as a grid of `View`s would avoid both packages, but the camera dependency means a native rebuild either way. |
| Scanning | **`expo-camera`'s built-in barcode reader** | The camera is needed regardless; a second decoder library is not. |
| Both depths | Guided screens send too, reached by a link on Act that is **present for everybody** | §1 says depth *adds* tools rather than moving them, so a link that appeared only in Guided would mean turning the Responder depth on *removed* it. The screen adapts instead. |

## Changes

**New: `src/transfer/handover.ts`** — pure, and the heart of the slice: the format marker and version,
`compactHandover`, `responderDraft` / `guidedDraft`, `serialiseHandover`, `parseHandover` (returning a
reason), `describeHandover`, `handoverLines`, `fitsInCode`, `utf8Length` and `REFUSAL_TEXT`.

**New: `src/transfer/channels.ts`** — `smsUrl`, `mailtoUrl`, `whatsappUrl`, `messageChannels`. Pure
string builders, tested for escaping.

**New: `src/transfer/use-handover.ts`** — binds the two drafts to `useCurrentReport`, `useDepth` and
the current position.

**New: `src/capabilities/can-qr.ts`** — the probe the plan of record names.

**New: `src/app/send.tsx`** and **`src/app/scan.tsx`** — the two screens.

**Changed:** `src/app/index.tsx` (the Act link, for both depths), `src/app/record.tsx` (the pinned Send
action, only once a report exists), `src/app/_layout.tsx` (two routes), `app.json` (the camera plugin
and its permission prose), `package.json` (three dependencies).

## Dependencies, and the rebuild

`expo-camera`, `react-native-qrcode-svg` and `react-native-svg` — all native, so `npx expo prebuild`
and a dev-build rebuild were required, and the camera permission string had to be generated rather
than assumed.

**And `npx expo install` pruned every devDependency.** `NODE_ENV=production` was set in the shell, so
npm omitted devDependencies and `package.json` looked untouched while jest, eslint, prettier and tsx
were gone from `node_modules`. This is the trap `AGENTS.md` documents, it happened exactly as
described, and `npm install --include=dev` put it back. Worth noting that the note earned its keep.

## Verification

- **The round trip**, including the case the issue names: a full ETHANE set with a note and a
  what3words location survives serialise → parse unchanged, and an oversized payload still does.
- **Refusals, each with its own reason and its own sentence:** another app's code, a newer version,
  malformed JSON, and coordinates that are not on Earth.
- **The subset is exactly the subset:** ETHANE answers only, and empty fields left out.
- **The receiving side cannot be fooled about time:** the scanned location is a `RecordedLocation`,
  with a `@ts-expect-error` call site proving it cannot reach a current-position slot.
- **URL builders:** a body containing `&`, `?`, `#` and a newline survives every scheme.
- **502 tests**, typecheck, typecheck:scripts, lint, format:check, `expo export`.
- **Maestro: 14/14 flows pass**, including three new ones in `.maestro/transfer/`.

## As built

Where the diff departs from the plan, for a reviewer checking one against the other:

- **`handoverLines` and `handoverTitle` exist** so the screen and the text rendering share one set of
  lines, rather than the screen re-deriving labels the payload already knows.
- **`REFUSAL_TEXT` is in the handover module**, next to the reasons, with a test that drives all four
  refusal paths — so a new reason cannot be added without words to show for it.
- **The Act link is for both depths, not Guided alone.** The plan said Guided reaches it by a quiet
  link; on writing it, that would have meant the Responder depth *removing* a destination from Act,
  which §1 forbids. It is quieter than a button and always present.
- **The record screen's Send action appears only when a report exists** — a Send button over an empty
  report is a promise the next screen cannot keep.
- **`hideKeyboard` does not work on a multiline field**, and the first version of the responder flow
  failed intermittently because of it. The flows now type, relaunch, and reach the send screen through
  the Act link, which avoids the keyboard entirely and proves the report was written down.
- **The code is drawn white-on-black regardless of theme.** A code in the app's dark palette is a code
  no camera can read, and scannability is not a place this screen can compromise.

## Verified, and not

Stated plainly, because the difference matters more than the total.

**Verified on the device:** the code renders for a responder report and for a Guided one, with the
payload's own lines beside it; the Act link opens the send screen in both depths; the scan screen
opens and reports its camera state honestly; the camera permission string is in the built app; and
every existing flow still passes after the native rebuild.

**Not verified, and it is the important one: that the drawn code can be read.** The code renders
crisply — pure black on white, three finder patterns and an alignment pattern all in place, at the
720 px its 240 pt box implies — and its *content* is sound by construction (the summary beside it is
rendered from the same payload object that is handed to the code, and the serialise → parse round trip
is unit-tested). But an attempt to decode the rendered pixels failed.

That attempt is worth recording rather than hiding: a JS decoder in the scratchpad (**not** added to
the project) reads a known-good 720 px code generated by the same encoder, and would not read the
app's, across an exact crop, added quiet zones, hard binarisation, pixel averaging at five scales, and
1188 sliding windows. So this is not simply "the decoder is broken" — but no rendering defect was
found either, and the crop was confirmed correct by measuring the code's own bounds (720 × 709 px at
(243, 1354)).

**What that means:** whether a phone camera can read the drawn code is unproven. The plan always had
this as a two-device check — one phone shows the code, another scans it — because a simulator has no
camera, and it is now the first thing to do on hardware rather than a formality.

## Risks and open items

1. **The drawn code is not proved scannable** (§ above). Everything else about the slice is verified;
   this one claim is not, and it is the claim the feature rests on.
2. **Scanning is unverified end to end** for the same reason: no camera in a simulator means
   `onBarcodeScanned` never fires. The parse boundary is unit-tested and the screen's honest states
   are on the device, but nothing here has read a real code.
3. **1024 bytes is a judgement, not a measurement.** How small the code must be to scan reliably off a
   phone screen at arm's length is a two-device question.
4. **External apps in a flow are fragile**, so the `sms:` / `mailto:` / `whatsapp://` launches are
   covered by unit tests on the URL builders and left as a hand check. The `sms:` body separator
   differs by platform and is a parameter for that reason.
5. **A received report is read-only** — never merged, corrected or replied to. Deliberate, and the
   obvious next question.
6. **A pinned action sits behind the keyboard** while a multiline field has focus, on the send screen
   and the record screen alike. Standard iOS behaviour — tapping a non-interactive area dismisses it —
   and left alone rather than growing a `KeyboardAvoidingView` across a dozen screens late in the
   slice.
7. **The what3words clause is now live in the payload**, by decision. See `## Record`.

## Record

**The what3words decision, settled as the issue required, before building.** A report payload may
carry a resolved what3words location *and* its coordinates. This is the pairing clause 6.3(b)
describes, and the second half of that clause — sharing it with a third party — is precisely what a
report does. The decision is the product owner's, taken with the clause quoted in front of it. It does
not change the display question on "Where I am", which remains open with the licensor.

In practice nothing populates it: resolution answers `402` on the current plan, so `words` is absent
and the payload carries coordinates alone. The exposure is latent, which also means it will be
forgotten until a plan is bought — worth revisiting then.

# Phase 4c (#25) — NFC tags

Field Kit · issue [#25](https://github.com/jonnyhaynes/field-kit/issues/25) · plan of record `docs/plans/fieldkit-v1.md` §4.2, §2.5

## What this builds

Writing a report to an NDEF tag and reading it back. Phone-to-phone NFC is no longer available to
third-party apps, so tags are the only shape worth building (§4.2).

**The format is not new.** A tag carries exactly what a QR code carries — `serialiseHandover`'s
payload — so both paths write the same bytes and `parseHandover` reads both, with the same refusals.
That is criterion 1, and it is why this slice is small.

## The platform question, settled first

**The controls are offered only where they can work.** iOS needs the NFC reader-session entitlement,
which needs an Apple Developer account — still open in §2.5 — so iOS gets no tag controls at all,
rather than a button that can only fail. Android needs no account and works.

This is a deliberate departure from the project's usual "show it and say why", recorded rather than
implied (see `## Record`). **It is a current state, not a permanent one:** when the account exists the
entitlement goes in the provisioning profile, `platformAllowsNfc` falls through to the hardware check,
and the controls appear on iOS.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| The format on the tag | **One MIME record** — `application/vnd.field-kit.handover+json` — carrying the QR path's payload | NDEF exists to say what the data *is*, and a MIME type is how it says it, so a tag holding someone else's data is recognised as foreign rather than guessed at. `parseHandover` refuses it too, so both defences agree. |
| Reading | **`parseHandover`, unchanged** | A tag is untrusted input from a physical object somebody handed you, exactly like a scanned code: same refusals, same `RecordedLocation` for the position, never merged into the reader's own record. |
| The size check | **Before writing, against the tag's own capacity** | A 48-byte tag cannot hold a report, and failing half-way through a write is worse than not starting one. |
| The IO | **An injected seam** (`TagIo`), with the radio required lazily behind the platform gate | The mapping, the byte encoding, the size rule and every refusal are unit-tested; the device only ever proves the honest states. And a lazy `require` means an iOS build with no NFC module linked cannot be taken down on import — the lesson Phase 2d learned with MapLibre. |
| The platform gate | **`platformAllowsNfc`** — Android only, for now | One place to change when the entitlement exists, with the reason attached rather than in somebody's memory. |
| Where the controls live | **"Write to a tag" on Send**, **"Read a tag" on the receiving screen**, which is retitled *Open a report* | The design mock already puts writing on the send screen, and receiving is one job with two techniques — a code or a tag — so it stays one screen with the same read-only display. |
| Overwriting | **Said plainly, before the write** | Writing destroys whatever was on the tag. That is a fact about a physical object, and only the user can know whether it mattered. |

## Changes

**New: `src/nfc/tag.ts`** — pure: the MIME type, `utf8Bytes`/`utf8Text` by hand (so the encoding is
testable and needs no `TextEncoder`), `toTagRecord`/`fromTagRecord` built on `serialiseHandover` and
`parseHandover`, `fitsOnTag`, `tagSizeOf`, and `TAG_FAILURE_TEXT` with one sentence per failure.

**New: `src/nfc/tag-io.ts`** — the seam and the device adaptor, with the lazy require and the
per-operation `try/finally` that releases the radio.

**New: `src/nfc/use-tag.ts`**, **`src/capabilities/can-nfc.ts`**, **`src/components/tag-controls.tsx`**
(the two controls, which render **nothing** when the capability is false — that is where the iOS
decision shows).

**Changed:** `src/app/send.tsx` and `src/app/scan.tsx` (one control each), `src/app/_layout.tsx` (the
retitle), `package.json` and `app.json` (`react-native-nfc-manager`, whose config plugin Expo added).

**New flow:** `.maestro/transfer/TC-04-tags-are-hidden.yaml`.

## Verification

- **522 tests**, typecheck, lint, format:check and `expo export`.
- **The same bytes in both directions:** a payload survives `toTagRecord` → `fromTagRecord` unchanged,
  and the record's bytes *are* `serialiseHandover`'s output — asserted directly, so a second format
  cannot creep in.
- **A foreign tag is refused:** another MIME type, and our own MIME type holding JSON that is not a
  handover, both come back refused by name.
- **Too small is caught before writing**, at the boundary, and a tag that does not report its capacity
  is written to rather than refused.
- **Every failure has its own words**, and the ones after a failed write promise the tag is intact —
  which is the only thing somebody needs to know at that moment.
- **The bytes are UTF-8**, including what a Welsh place name or an emoji costs, with a truncated
  sequence replaced rather than thrown.
- **On the device:** `TC-04` asserts that no tag control appears on either screen.
- **Not verified, and it cannot be here:** writing a report to a tag and reading it back. No simulator
  has an NFC reader, iOS cannot use one without the entitlement, and there is no device. **The entire
  tag path ships unverified** — the least proven thing in the project, said before the diff is read
  rather than after.

## Risks and open items

1. **Nothing about NFC is verified here.** The logic is unit-tested and the *absence* is on the device;
   whether a real tag round-trips is unknown until somebody with an Android phone tries it. That is a
   bigger gap than the QR slice's, where at least the code was visible.
2. **The library's exact NDEF surface is unconfirmed.** `react-native-nfc-manager` is installed and its
   types were read, but how it reports a locked tag and how it hands back a record's `type` differ
   between platforms, and the adaptor guesses at both. That is documented where it guesses, and it is
   the first thing hardware will correct.
3. **The iOS entitlement needs an Apple Developer account** (§2.5), so iOS cannot use this today. One
   flag enables it later.
4. **Writing is destructive and irreversible** on a physical object, which is why the UI says so first.
5. **Tag capacities vary from tens of bytes to kilobytes** — hence the check before the write, and a
   failure that names the numbers.

## Record

**Why iOS is hidden rather than explained.** The product owner's decision, taken against this plan's
recommendation. The project's rule is that a feature degrades visibly, never silently — but a button
that can only fail is not a degraded feature, it is an absent one, and the honest thing is not to offer
it. The counter-argument, which lost: an iOS user is now never told tags exist. What makes that
acceptable is that the absence is *recorded* — here, in the README, and in the plan of record — rather
than only in the UI, and that it lifts the moment the entitlement can be issued.

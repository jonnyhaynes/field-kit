# Phase 4a (#23) — the report model, the depth gate, and responder capture

Field Kit · issue [#23](https://github.com/jonnyhaynes/field-kit/issues/23) · plan of record `docs/plans/fieldkit-v1.md` §1, §4, §4.4

## What this builds

The foundation the rest of Phase 4 stands on: a report that exists and persists, a depth gate that
reveals responder tools without touching the emergency path, and the four capture forms.

§2.1 already settled that this is safe to build: *"The capture **forms** are built against the public
mnemonic structure. SAMPLER, ABCDE, ETHANE and ASHICE are standard pre-hospital practice, not anyone's
IP, so a form that asks the right questions is safe to build regardless."* It is the clinical
*guidance* that the licence gates, not the capture structure. `src/content/types.ts` and its
`assertCited` gate stay about guidance only.

## Two findings that shape the forms

**1. ETHANE is a report about the scene, not about the patient.** The research is unambiguous: ETHANE
is the JESIP **M/ETHANE** incident-reporting framework minus the M, describing location, hazards,
access and casualty *numbers*. Patient handover is **ASHICE** (and in NHS ambulance practice, ATMIST).
The design artefact already draws it that way — *"ETHANE — situation report, including exact
location"* against *"ASHICE — handover"* — so the approved plan's one-line list was loose, not wrong.
Each form says which it is, so a responder filling it in knows whether they are describing a scene or
a patient.

**2. These forms record observations, never treatment.** ABCDE and ASHICE as taught interleave
assessments with interventions — "give oxygen", "cannulate", "administer". §2.1 and the app's own
stance forbid that: this app records what the user observes and never recommends anything. So the
field sets take the observation half and drop the action half, and a test enforces it (below).

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| The depth gate | **A preference, and capture is unreachable when it is off** — enforced by a typed guard plus a runtime assert | §1: depth *adds* tools. The failure to prevent is an untrained user meeting a mnemonic form, so the gate is mechanical rather than a conditional render someone can remove. Mirrors the stale-position guard. |
| Where depth lives | A switch in the existing `src/app/settings.tsx`, beside the OpenStreetMap section | The design puts a "depth switch" in settings, and settings now exists. |
| The forms | **Four definitions as data, one renderer** | §4.4's "content as data": a form is data, so a field change is a reviewable diff and the renderer is written once. |
| Field kinds | **A small fixed vocabulary**: `boolean`, `choice`, `number` (+unit), `text`, `time` | Anything richer invites a form builder nobody asked for. |
| Which fields | **What a first aider can observe without equipment**, with the equipment-dependent ones optional and labelled | A blood pressure needs a cuff and a GCS needs training. **ACVPU stands in for GCS** — it is the first-responder alternative and needs no training. Recording things the user cannot measure would be inventing data. |
| The ETHANE/ASHICE split | **ETHANE is the situation report; ASHICE is the handover.** Neither pretends to be the other | The finding above. |
| Report storage | **expo-sqlite's key-value store**, as the flags and the notes queue use | One local store, one set of failure modes. Reports are small and few. |
| The position on a report | **The existing `RecordedLocation`**, with its `sampledAt` | §4.1 rule 1 already has the type that says a recorded position is not a current one. Reusing it is the point of having written it. |
| Entry point | **"Record incident" appears on the Act screen only when the depth is on** | Exactly what the design says: *"Revealed only when the Responder depth is on."* Act keeps its three destinations for everyone else. |

## Changes

**New: `src/capture/forms.ts`** — the four mnemonics as data, with a doc comment naming each
mnemonic's published structure and what was deliberately left out (the interventions).

- `CaptureForm = { id, mnemonic, purpose, whatItDescribes: 'patient' | 'scene', fields }`.
- `CaptureField` with `id`, `label`, `kind`, options for `choice`, an optional `unit`, and
  `needsEquipment` where that is true.

**New: `src/capture/depth.ts`** — the preference and the guard.

- `CaptureNotAllowedError`, `assertCaptureAllowed(depth)` — the mechanical gate.
- `createDepthPreference(store)` over the injected `KeyValueStore`.

**New: `src/report/report.ts`** — the model, pure.

- `Report = { id, openedAt, location?: RecordedLocation, observations: Observation[] }`, each
  observation carrying the form, field, value and the time it was recorded.
- `openReport`, `recordObservation`, `observationValue`, `isAnswered`.
- Serialisation to and from JSON, defensively parsed like every other store here.

**New: `src/report/store.ts`** — persistence over the same injected store, plus `src/report/use-reports.ts`
and `src/capture/use-depth.ts` to bind them.

**New: `src/app/record.tsx`** — "Record incident": the report so far, then one section per mnemonic,
each showing its purpose and whether it describes the patient or the scene, with its fields.

**Changed: `src/app/settings.tsx`** — a "Responder tools" section with the depth switch, saying plainly
that it adds capture and changes nothing on the emergency path.

**Changed: `src/app/index.tsx`** — "Record incident", rendered only when the depth is on.

**New flows:** `.maestro/capture/TC-01-capture-needs-the-depth.yaml` (with the depth off, the entry is
absent and the route refuses) and `.maestro/capture/TC-02-record-an-observation.yaml`. `capture/` is
already in Maestro's allow-list and empty.

**Docs:** §1 and §5 record the ETHANE correction and what 4a delivered; README's status and screen
table.

## Risks and open items

1. **No clinician has seen these fields.** The mnemonics are standard and the structures are public,
   but the *selection* — which observations, which options, ACVPU rather than GCS — is engineering
   judgement. The app presents them as a place to record, never as an assessment, which is the
   mitigation; a clinical read before release would still be better, and §2.5's "no clinician
   reviewer" is exactly this gap.
2. **§2.1 says the capture content is supplied** (by TORLEA, with the licence question open). Building
   forms now is explicitly sanctioned, but if that content arrives with its own field set, these
   definitions are replaced rather than merged. Keeping them as data is what makes that cheap.
3. **A responder form is the first screen with real density.** Everything so far is a handful of
   cards; four forms is dozens of fields, and I cannot see it render without a device.
4. **Storage growth is unbounded in principle.** Reports accumulate in a key-value store; a
   delete-all-records control is designed (§settings) and not built.

## Verification

- **The gate, mechanically:** `assertCaptureAllowed` throws when the depth is off, and a test asserts
  it; a `@ts-expect-error` call site proves the capture components cannot be reached by a
  non-responder depth type — the same trick as the stale-position guard, so widening the type fails
  `tsc --noEmit` in CI rather than needing a reviewer to notice.
- **No treatment, mechanically:** a test walks every field in every form and fails if a label or an
  option reads as an instruction rather than an observation (no "give", "administer", "dose", "treat",
  "should", "recommend"). This is the rule most likely to erode as fields are added, so it is worth
  enforcing rather than reviewing.
- **The forms are well-formed:** every field has a kind, every `choice` has at least two options, ids
  are unique across all four forms, and each form declares whether it describes a patient or a scene.
- **The report:** opens with a location, records an observation with a timestamp, round-trips through
  JSON, survives corrupt stored state, and a half-filled report is valid.
- **Persistence on the device:** record an observation, and it is still there after a relaunch.
- **The full check set:** typecheck, typecheck:scripts, lint, format:check, tests, `expo export`, and
  every existing flow, since `index.tsx` and `settings.tsx` change.

## As built

Deviations from the plan, for a reviewer checking the diff against it:

- **Names.** The guard is `assertResponderDepth` / `ResponderDepth` / `responderForms`, and the hook is
  `use-report.ts`, not `use-reports.ts`. The plan's `assertCaptureAllowed(depth)` became a type
  narrowing, which is what makes the `@ts-expect-error` call site possible: `responderForms` takes
  `ResponderDepth`, so an unrefined depth does not compile.
- **Three flows, not two.** The persistence claim (an observation survives a relaunch) is a separate
  flow from the switch, so a failure says which of the two broke.
- **The refusal is its own component.** `RecordScreen` branches to `RefusedCapture` or
  `ResponderCapture`, so the refused branch never mounts the position hook — otherwise a screen
  showing nothing would ask for location permission.
- **Every flow is self-contained.** Each sets its own simulated location and grants its own location
  permission, and the flows that clear state say why (see `.maestro/README.md`).
- **Field wording.** ETHANE's access field reads "Safe way in, and anything blocking it" so that no
  field label contains a word from the instruction-guard list.

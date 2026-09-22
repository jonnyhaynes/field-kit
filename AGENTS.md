# Agent context for Field Kit

This file orients coding agents (Command Code, Claude Code, and anything else that
reads `AGENTS.md`) on this repo. Keep it lean -- it points, it doesn't explain.
Substantive design and rationale live in `/docs`; read those before any non-trivial
change. A bloated AGENTS.md is a smell: if a section wants more than a few lines, move
it to its own doc under `/docs` and link it.

## What this is

Field Kit is a first aid reference app for remote and low-signal environments, built
with Expo as a **native iOS and Android app**. It has to work with no network at all:
the guidance, the defibrillator data and the position maths are all local.

Two depths in one app, and **depth is not a mode** -- the emergency path is identical
for everyone. A **Guided** flow for untrained users, capped at four screens, because it
may be read one-handed under stress. A **Responder** depth for trained users that *adds*
structured capture using the standard pre-hospital mnemonics (SAMPLER, ABCDE, ETHANE,
ASHICE). Both depths can send a report.

See `README.md` for status and `docs/dev-workflow.md` for how we build here.

## Stack

**Expo SDK 57 + React Native 0.86 + TypeScript 6, native iOS/Android.** Expo Router, with
the router at `src/app/` and `@/*` aliased to `./src/*`. **Dev builds, not Expo Go** --
MapLibre, NFC and the camera are native modules, so this runs on CNG (`expo prebuild`)
plus EAS Build, with `/android` and `/ios` generated and gitignored. **npm** -- commit
`package-lock.json`, don't mix package managers. Strict TypeScript (avoid `any`).
Function components with hooks.

End-to-end flows run through **Maestro** in `.maestro/`, grouped by area with shared
`subflows/`; see `.maestro/config.yaml` for the flow allow-list and the comment
explaining why it has to be an allow-list. Lint with ESLint, format with Prettier,
type-check with `tsc --noEmit`. Prefer `npx expo install` over `npm install` for
anything that links native code, so versions stay compatible with the SDK.

_(Unit tests are specified but not installed -- there is no `test` script yet, so the
test-guard hook is currently a no-op. Bundle identifiers are also unset in `app.json`.
Both are in the plan, §7.)_

_(Re-scaffolding note: `create-expo-app` now writes its own `AGENTS.md`, `CLAUDE.md` and
`.claude/settings.json`. Pass `--no-agents-md` or it overwrites this setup.)_

## Load-bearing principles

These shape the code. Don't change them without checking the relevant doc.

- **Clinical content is reproduced, never authored.** We do not write first aid
  instructions. Guidance comes from an authority we have permission to reproduce
  (Resuscitation Council UK is the intended route), is attributed, and is pinned to a
  named guideline edition. Every record carries its source and review date, so a
  content change reads as a review, not a refactor.
- **The app never diagnoses.** It presents cited guidance and records what the user
  observes. It does not interpret findings, triage, or give a prognosis. Framing stays
  at "reference guidance -- call 999", never "your casualty has X, so do Y".
- **Nothing stale is presented as authoritative.** A what3words address is a 3 m square,
  and an AED in the dataset may have been removed years ago. Current position is
  computed on-device; a stored position shows when it was sampled; AED results are
  labelled unverified and never imply an asset is present, accessible or working.
- **Offline is the default path, not the fallback.** Guidance, defibrillator data and
  position maths all work with no network. Anything that needs one must degrade
  visibly -- never silently, and never by blocking a core flow.
- **No accounts, no server-side storage, no analytics on lookups.** Reports are
  personal and special-category health data: they live in the OS app sandbox, are
  excluded from cloud backup, and leave the device only when the user explicitly shares
  them.

## Scope boundaries

What this project is **not**, and shouldn't drift towards. If a request would drift
here, push back before building.

- Not a diagnostic tool, symptom checker, or triage assistant.
- Not a clinical decision aid. The Responder forms capture structured observations;
  they don't interpret them or recommend a treatment.
- Not a replacement for emergency services or for certified first aid training.
- Not a system of record or a sync service. Reports are local and user-shared; there is
  no account, no backend, and nothing to reconcile.
- Not a TORLEA product. No TORLEA wording, layout or branding -- the mnemonics are
  standard practice, but their presentation isn't ours to use.

## How we work (the short version)

Full process: `docs/dev-workflow.md`. The non-negotiables:

- **Plan first.** For non-trivial work, produce an implementation plan saved to
  `docs/plans/<ticket>.md` and have a human approve it before writing code. The
  plan is what gets reviewed, not the first code.
- **A human reviews and merges every PR.** The agent opens the PR and gets CI green; a
  named person reviews the diff against the plan and merges. The agent never merges.
- **Never put secrets, credentials, or client data into the model.** If unsure,
  it's out of bounds until you've asked.
- **Mark AI-assisted work.** Prefix AI-assisted PR titles `[ai-assisted]`, reference
  the approved plan doc, and end the description with a `Manually reviewed by <name>`
  line. Keep the `Co-Authored-By` trailer on commits.
- **Guardrails live in the repo.** Permissions and hooks are committed, not left to
  memory: `.commandcode/settings.json` for Command Code, `.claude/settings.json` for
  Claude Code, and the hook scripts in `.commandcode/hooks/`. If a guardrail gets in
  the way for a good reason, change it in the open -- don't route around it silently.

## Documents

Source of truth lives in `/docs`. Read the relevant doc before responding:

- `docs/plans/fieldkit-v1.md` -- the approved v1 plan. Read it before starting work.
- `docs/dev-workflow.md` -- how we build (the loop + standing conventions)
- `docs/design/` -- the Guided flow options and the app map (HTML, open in a browser)
- _Add requirements, tech design, and policy docs here as they appear._

## Working style

- Push back where appropriate rather than agreeing reflexively.
- When changing a load-bearing principle or scope boundary, flag it explicitly
  rather than slipping it in.
- Prefer pointing at a doc section over reproducing its content here.

## Raising pull requests

This project uses **GitHub**. Raise PRs with the `gh` CLI (or the REST API):

- Repo: `jonnyhaynes/field-kit` · Target branch: `main`. (Not created yet, and the name
  is pending a trademark check -- see the plan, §7.)
- Push the branch (`git push -u origin <branch>`), then `gh pr create`.
- **Mark AI-assisted PRs:** prefix the title `[ai-assisted]` (or add an `ai-assisted`
  label), reference the approved plan doc (`docs/plans/<ticket>.md`) in the body, and
  end it with a `Manually reviewed by <name>` line confirming the diff was read.
- Keep the `Co-Authored-By` trailer on commits. **A human merges** once CI is green
  and the diff has been reviewed against the plan.

**Issue tracker: GitHub Issues.** One issue = one unit of work; acceptance criteria
are the test contract. Reference the issue in the branch name and PR, and close it from
the PR (`Closes #NN`) once merged.

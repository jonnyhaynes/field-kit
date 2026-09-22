# Field Kit Development Workflow

The repeatable process and standing conventions for building Field Kit. This
captures *how* we build; *what* to build lives in the source-of-truth docs under
`/docs`. Read the relevant sections before starting a piece of work, and flag any
change to a load-bearing decision explicitly rather than slipping it in.

---

## The loop (per ticket / unit of work)

1. **Orient** -- read the ticket, the relevant repo docs and the approved plan in
   `docs/plans/`. Work on an isolated branch so your work doesn't collide with others'.
   Native builds are heavy, so prefer one working tree with a simulator attached over
   several parallel worktrees.
2. **Plan** -- have the agent produce an implementation plan and save it to
   `docs/plans/<ticket>.md`. **A human reviews and approves the plan before any code
   is written.** This is the single biggest quality lever: the plan is diffable,
   referenceable, and decoupled from any one agent session.
3. **Backlog** -- break the approved plan into tracked work (issues / tickets), each
   item carrying its acceptance criteria as the test contract.
4. **Build** -- work the plan task by task, **test-first**: each acceptance criterion
   becomes a failing test before the implementation. Prefer a fresh agent session per
   task -- it keeps each unit focused and reviewable. Review between tasks: does it
   match the plan, and is the code good?
5. **Review** -- run a code review across the branch. **Vet the findings; don't
   blindly apply them.** Fix the real issues and strengthen any test that passed when
   it shouldn't have.
6. **Ship** -- run lint + format, type-check (`tsc --noEmit`), the unit suite
   (`npm test`) and the Maestro smoke flows green locally, and confirm the app boots on
   a device or simulator from a dev build. Then open a PR. CI must be green before
   review.
7. **Land** -- a human reviews the diff against the plan and merges. Then sync the
   main branch, delete the branch, and file any deferred follow-up work as tracked
   tickets.

Automation never moves the human gates: **plan approval (step 2) and the merge
(step 7) are always a person's decision.**

---

## Standing conventions

### Stack & tooling

- **Platform.** Native iOS and Android, built with Expo and shipped through the
  stores. Both are first-class targets from v1 -- this is not a web app with a native
  wrapper, and it is not a PWA.
- **Package manager.** Use the project's lockfile manager (npm / pnpm / yarn / bun)
  -- don't mix. Commit the lockfile.
- **Expo deps.** Add/upgrade native-linked packages with `npx expo install` (not raw
  `npm install`) so versions stay compatible with the installed SDK. Run
  `npx expo-doctor` when things look off before touching config.
- **TypeScript.** Strict mode; avoid `any`. Type-check with `tsc --noEmit` as a CI gate.
- **Components.** Function components + hooks. Isolate platform-specific code behind
  `Platform.select` / `.ios.tsx` / `.android.tsx`; don't branch on platform ad hoc
  throughout a component.
- **Offline.** Core guidance must render with no network at all (see `AGENTS.md`).
  Offline is the mode this app will actually be used in, so anything that only works
  online needs a deliberate, flagged decision -- and a way to be verified offline.
- **Testing.** Run unit and component tests via the project's `test` script (Jest +
  React Native Testing Library behind it). Test user-visible behaviour over
  implementation. A `PreToolUse` hook redirects direct `jest` calls to that script --
  but only when a `test` script exists, so it never blocks a fresh project.
- **End-to-end.** User journeys run through **Maestro** on a device or simulator, from
  `.maestro/`. Follow the existing conventions: flows grouped by area, shared steps in
  `subflows/`, testID selectors, and an explicit inclusion allow-list in
  `.maestro/config.yaml` -- the comment in that file explains why a `!subflows/**`
  negation silently does nothing.
- **Dev build.** Confirm the app boots on a device or simulator from a dev build
  before opening a PR that touches config, native modules, routing or rendering. This
  is not Expo Go: MapLibre, NFC and the camera all require a dev build.
- **Lint & format.** ESLint + Prettier; run green before opening a PR.

### Guardrails (`.commandcode/` + `.claude/`)

Two agent tools are used on this repo, so the guardrails are committed for both rather
than depending on everyone remembering them:

- `.commandcode/settings.json` (Command Code) and `.claude/settings.json` (Claude Code)
  carry the same policy in each tool's own rule syntax: the same allow-list, the same
  `ask` on `git push` / `git pull`, and the same deny-list for secrets, `.git/`,
  force-pushes, history rewrites and `gh pr merge`. **They're meant to stay
  equivalent** -- change one, change the other.
- One `PreToolUse` hook, `.commandcode/hooks/guard-test-command.sh`, is wired into
  both settings files. It reads `COMMANDCODE_PROJECT_DIR` or `CLAUDE_PROJECT_DIR`,
  whichever the running tool exports, so there's a single script rather than two
  copies that drift apart.
- The hook routes test runs through the project's `test` script so agents and humans
  stay on the same path. It fails open (no `test` script, or any parse failure) and is
  removable -- delete the file and the `PreToolUse` block in both settings files.
- `gh pr merge` is deny-listed: the merge is a human step, so the guardrail enforces
  it rather than trusting everyone to remember.
- Sensitive paths are deny-listed and secrets never go in the repo or the model
  (`.env`, keys, client data). Anything touching sensitive data needs an explicit OK.
- If a guardrail gets in the way for a legitimate reason, **change it in the open**
  -- don't route around it silently.

### Git & pull requests

This project uses **GitHub**. Raise PRs with the `gh` CLI (or the REST API):

- Repo: `jonnyhaynes/field-kit` · Target branch: `main`.
- Push the branch (`git push -u origin <branch>`), then `gh pr create`.
- **Mark AI-assisted PRs:** prefix the title `[ai-assisted]` (or add an `ai-assisted`
  label), reference the approved plan doc (`docs/plans/<ticket>.md`) in the body, and
  end it with a `Manually reviewed by <name>` line confirming the diff was read.
- Keep the `Co-Authored-By` trailer on commits. **A human merges** once CI is green
  and the diff has been reviewed against the plan.

**Issue tracker: GitHub Issues.** One issue = one unit of work; acceptance criteria
are the test contract. Reference the issue in the branch name and PR, and close it from
the PR (`Closes #NN`) once merged.

---

*This doc is the standing process. Update it when a convention genuinely changes
(and say so), rather than re-deciding per ticket.*

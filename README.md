# Field Kit

First aid reference for remote and low-signal environments. Native iOS and Android, built with
Expo. It has to work with no network at all: the guidance, the defibrillator data and the position
maths are all local.

**Status: scaffolded, no features yet.**

- The approved implementation plan is [`docs/plans/fieldkit-v1.md`](docs/plans/fieldkit-v1.md).
  Read that before starting any work.
- How we build is in [`docs/dev-workflow.md`](docs/dev-workflow.md).
- Agent context is in [`AGENTS.md`](AGENTS.md).

## Run

```sh
npm install
npx expo start
```

MapLibre, NFC and the camera are native modules, so this needs a **dev build**, not Expo Go:

```sh
npx expo run:ios     # or run:android
```

## Not yet in place

- **No clinical content.** Guidance is never authored here; it is reproduced from a cited source.
  See the plan, §2.1, including the outstanding permission.
- **No test script yet.** Jest and Maestro are specified in the plan but not installed, so the
  test-guard hook in `.commandcode/hooks/` is currently a no-op.
- **No AED data or offline map packs.** Those are Phase 2.

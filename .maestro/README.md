# E2E flows (Maestro)

End-to-end flows for Field Kit, run on a device or simulator. Conventions follow the other Expo
apps: flows grouped by feature area, shared steps in `subflows/`, `testID` selectors, and an
explicit inclusion allow-list in `config.yaml`.

## Run

```sh
maestro test .maestro/                       # everything in the allow-list
maestro test .maestro/ --include-tags smoke  # one area
```

Maestro is a CLI, not a project dependency — install it separately (`brew tap mobile-dev-inc/tap &&
brew install maestro`). The app must be built and installed on the target device first
(`npx expo run:ios` / `run:android`), because MapLibre, NFC and the camera rule out Expo Go.

## Current state

**There are no flows yet.** `config.yaml` lists the areas that will hold them; the first flow lands
with Phase 1 (the offline skeleton). Until then `maestro test .maestro/` has nothing to collect.

Two things block the first flow:

1. **Bundle identifiers are unset.** `app.json` has no `ios.bundleIdentifier` or `android.package`,
   and a flow's `appId` has to match the installed app. Those identifiers need a real domain, so
   they're a decision rather than a detail.
2. **Nothing is testable yet.** The scaffold is the Expo starter template, not Field Kit's screens.

## Conventions

- One directory per area, named for what it exercises, not for the milestone.
- Flow files are named `TC-NN — description`, with `tags:` carrying the area and the ticket.
- Shared setup (launch, reset, onboarding) lives in `subflows/` and is pulled in with `runFlow:`.
- Select by `testID`, not by visible text, wherever a `testID` exists.
- Anything a flow needs to explain goes in a comment at the top of the flow, not in a commit
  message — the next person reads the flow.

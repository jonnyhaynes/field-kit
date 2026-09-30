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

**Eleven flows, all passing, across five areas.** Every flow is **self-contained**: it sets the
position and permissions it needs, so the suite passes in any order on a device in any state, and a
single flow can be run on its own.

| Area | Flows |
| --- | --- |
| `map/` | the offline map renders; outside the UK it says so instead of going blank; the region-pack catalogue, and what a download attempt leaves behind |
| `location/` | a grid reference in Great Britain; the refusal in Dublin; the compass's honest state |
| `settings/` | a report cannot be sent without the opt-in; with it on, the report is readable and editable |
| `capture/` | capture is off by default; the depth switch opens it and persists; an observation survives a relaunch |

The `smoke/`, `guided/`, `aed/` and `transfer/` areas are still conventions only — `config.yaml`
lists them so the first flow that lands there runs, and `capture/` was the last to be filled.

## Conventions

- One directory per area, named for what it exercises, not for the milestone.
- Flow files are named `TC-NN — description`, with `tags:` carrying the area and the ticket.
- Shared setup (launch, reset, onboarding) lives in `subflows/` and is pulled in with `runFlow:`.
- Select by `testID`, not by visible text, wherever a `testID` exists.
- Anything a flow needs to explain goes in a comment at the top of the flow, not in a commit
  message — the next person reads the flow.

## Four things the device taught us

Learned by running these, each after a failure that looked like a product bug and was a test bug.

1. **Maestro does not order flows predictably.** Not alphabetically, not by modification time — the
   filesystem decides, and in practice it runs `TC-02` *before* `TC-01`. Two flows where one depends
   on the other's leftovers fail at random. **Every flow now creates its own state**, and
   `.maestro/settings/` was fixed from a dependent pair into two independent ones.
2. **`assertVisible` only counts what is on screen.** Everything on a `Screen` is inside one
   `ScrollView`, so an element below the fold is rendered, present in the hierarchy, and *not
   visible*. `scrollUntilVisible` is the answer — and it wants the element **fully** on screen, so
   scroll to a form's *heading*, never its container: a container taller than the phone can never
   satisfy it, and the search runs until it gives up with "no visible element found".
3. **`clearState: true` takes the permission grants with it.** A flow that clears state and does not
   put them back breaks whichever flow next needs a position, and the failure appears *there*, with
   nothing on screen to connect it to the cause. Flows that clear state now grant what they need:
   `launchApp: { clearState: true, permissions: { location: inuse } }`. `inuse` is Apple's word for
   when-in-use; `allow` is rejected.
4. **Flows can place the device.** `setLocation` removes the manual
   `xcrun simctl location booted set …` step between runs, which mattered here because two pairs of
   flows had *mutually exclusive* prerequisites — the map and the position screen must be tested
   inside the UK and outside it — so the suite could never pass in a single run without it.

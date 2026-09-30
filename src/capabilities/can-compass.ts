/**
 * Can this device tell which way it is pointing?
 *
 * There is no API that answers this, so the probe is empirical: subscribe and wait for a first
 * reading, with a timeout. Both platforms need that, for different reasons.
 *
 * - **iOS** rejects `watchHeadingAsync` outright when there is no magnetometer — the Simulator, for
 *   one — so the promise tells us.
 * - **Android** resolves and then never emits, because the failure of `registerListener` is ignored
 *   upstream. Nothing rejects, so only a timeout catches it.
 *
 * A capability probe is why the UI can branch on what the device can do rather than on `Platform`.
 */

import * as Location from 'expo-location';

/** Long enough for a sensor to respond, short enough not to hang a screen. */
export const COMPASS_PROBE_TIMEOUT_MS = 1_500;

export async function canCompass(timeoutMs: number = COMPASS_PROBE_TIMEOUT_MS): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let subscription: Location.LocationSubscription | undefined;

    const finish = (answer: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve(answer);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);

    void Location.watchHeadingAsync(
      () => finish(true),
      () => finish(false),
    )
      .then((value) => {
        subscription = value;
        // The first reading can arrive while we were awaiting the subscription, in which case it has
        // already been removed and this would leak a live sensor.
        if (settled) value.remove();
      })
      .catch(() => finish(false));
  });
}

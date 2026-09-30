/**
 * Can this device scan a report?
 *
 * The plan of record names this probe, and unlike the compass there is no timeout ritual to perform:
 * `CameraView.isAvailableAsync()` answers the question directly rather than being inferred from
 * whether frames arrive.
 *
 * **The honest gap is the simulator.** An iOS simulator reports a camera and then never delivers a
 * frame, so `true` from here promises a camera exists, not that a scan will happen. Only a device can
 * prove the scanning path — the same position the compass is in, and for the same reason: no sensor.
 */

import { CameraView } from 'expo-camera';

/** The device read, injected so the decision can be tested without a camera. */
export type CameraAvailability = () => Promise<boolean>;

export async function canQr(
  isAvailable: CameraAvailability = () => CameraView.isAvailableAsync(),
): Promise<boolean> {
  try {
    return await isAvailable();
  } catch {
    // A device that cannot answer has no camera worth pointing at anything.
    return false;
  }
}

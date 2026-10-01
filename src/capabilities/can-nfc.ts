/**
 * Can this device read or write a tag?
 *
 * The plan of record names this probe, and it is the gate the whole slice hangs on: **iOS cannot use
 * NFC without the reader-session entitlement**, which needs an Apple Developer account that this
 * project does not have yet (§2.5). Rather than offer a control that can only fail, iOS offers none —
 * and this is the one place that decides it.
 *
 * When the account exists: add the entitlement to the provisioning profile, and let the iOS branch
 * fall through to the same hardware check Android uses. Nothing else changes.
 */

import { Platform } from 'react-native';

/** The device read, injected so the decision is testable without a radio. */
export type NfcAvailability = () => Promise<boolean>;

/**
 * Whether the *platform* permits NFC at all, before asking about hardware.
 *
 * Deliberately not a probe: an iOS build without the entitlement cannot read a tag however good its
 * radio is, and no API answers "is my entitlement present?" — so this is a statement of the current
 * state, with the reason attached, rather than a guess dressed up as detection.
 */
export function platformAllowsNfc(platform: string = Platform.OS): boolean {
  return platform === 'android';
}

export async function canNfc(
  isAvailable: NfcAvailability = deviceNfcAvailable,
  platform: string = Platform.OS,
): Promise<boolean> {
  if (!platformAllowsNfc(platform)) return false;

  try {
    return await isAvailable();
  } catch {
    return false;
  }
}

/**
 * Ask the module — **lazily, and only once the platform gate has passed**.
 *
 * The `require` is inside the function for a reason: an iOS build has no NFC native module linked, and
 * a top-level import of a library that reaches for it with `getEnforcing` would take the app down on
 * a screen that never touches NFC. Phase 2d learned that the hard way with MapLibre.
 */
async function deviceNfcAvailable(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: NfcManager } = require('react-native-nfc-manager') as {
    default: { isSupported: () => Promise<boolean> };
  };

  return Boolean(await NfcManager.isSupported());
}

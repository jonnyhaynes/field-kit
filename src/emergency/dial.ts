import { Linking } from 'react-native';

/**
 * UK 999. 112 also works on UK networks and across the EU, so it is the safer string if
 * this ever expands beyond the UK — see the plan on geography.
 */
export const EMERGENCY_NUMBER = '999';

/** What to put on the button. Kept next to the number so they cannot drift apart. */
export const EMERGENCY_LABEL = `Call ${EMERGENCY_NUMBER}`;

/**
 * Opens the system dialler with the number ready.
 *
 * There is deliberately no in-app confirmation step. `tel:` does not place a call — it
 * hands off to the dialler with the number filled in, so the operating system already
 * provides the final confirmation. Adding our own sheet in front of that would cost a
 * tap in the situation where taps matter most.
 */
export async function callEmergencyServices(): Promise<void> {
  const url = `tel:${EMERGENCY_NUMBER}`;
  try {
    await Linking.openURL(url);
  } catch {
    // A device with no dialler (some tablets, most simulators) throws rather than
    // failing silently. The caller surfaces this; we do not swallow it into a no-op.
    throw new Error(`Could not open the dialler for ${EMERGENCY_NUMBER}.`);
  }
}

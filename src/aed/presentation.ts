/**
 * Turning records into something a person can read at a glance, one-handed.
 *
 * Kept pure and separate from the screen so the wording rules are testable: distances are
 * deliberately coarse, and nothing here is allowed to sound like a promise that a
 * defibrillator exists or works.
 */

import type { Verification } from './types';

/**
 * A mapped AED is a point someone surveyed, not a surveyed instrument, so metre-level
 * precision would be false precision. Under a kilometre we round to 10 m.
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) {
    throw new RangeError(`distance must be a non-negative number, received ${String(meters)}`);
  }

  if (meters < 1_000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1_000).toFixed(1)} km`;
}

/**
 * What we can honestly say about the record's position.
 *
 * This describes the *mapping*, not the defibrillator: a check_date says someone looked at
 * the location once, and says nothing about whether the box is still there.
 */
export function describeVerification(verification: Verification): string {
  return verification.status === 'verified'
    ? `Position checked ${verification.on}`
    : 'Position never checked';
}

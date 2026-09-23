/**
 * Compression pace, as a pure function so it can be tested without a device, a renderer
 * or a beat actually running.
 */

/** Milliseconds between beats for a given pace. */
export function beatIntervalMs(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new RangeError(`bpm must be a positive number, received ${String(bpm)}`);
  }
  return 60_000 / bpm;
}

/** Beats in a minute, for the readout. Rounded, because the interval is what matters. */
export function beatsPerMinute(bpm: number): number {
  return Math.round(60_000 / beatIntervalMs(bpm));
}

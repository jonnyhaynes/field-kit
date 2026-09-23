import { assertCited, type GuidanceRecord } from './types';

/**
 * Ids the Guided screens ask for. They exist independently of the corpus so a screen
 * can render a slot for guidance that is not licensed in yet.
 */
export const GUIDANCE_IDS = {
  cprCompressionRate: 'guided.cpr.compression-rate',
  cprCompressions: 'guided.cpr.compressions',
  aedUse: 'guided.aed.use',
} as const;

export type GuidanceId = (typeof GUIDANCE_IDS)[keyof typeof GUIDANCE_IDS];

/**
 * The shipped corpus.
 *
 * EMPTY ON PURPOSE, and that is the point rather than an oversight. Every clinical
 * value in this app is a reproduction of licensed material and the licence is not in
 * place yet (see docs/plans/fieldkit-v1.md §2.1), so there is nothing here to show.
 * The screens render empty slots instead of unattributed instructions.
 *
 * Adding a record means adding its citation. `assertCited` below runs at import time,
 * so a record without one fails immediately rather than shipping quietly.
 */
export const GUIDANCE: readonly GuidanceRecord[] = [];

assertCited(GUIDANCE);

/** Look up licensed guidance. Returns undefined when it is not in this build. */
export function getGuidance(id: GuidanceId | string): GuidanceRecord | undefined {
  return GUIDANCE.find((record) => record.id === id);
}

/**
 * The licensed compression pace, if that record is present and carries one.
 *
 * Undefined is the honest answer today, and the CPR screen renders an empty slot for it
 * rather than a number we chose ourselves.
 */
export function compressionPaceBpm(): number | undefined {
  return getGuidance(GUIDANCE_IDS.cprCompressionRate)?.bpm;
}

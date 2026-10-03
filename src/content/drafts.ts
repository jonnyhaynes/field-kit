/**
 * Draft clinical content, for designing against — and for a clinician to review.
 *
 * **This is the one place in the project that does not reproduce guidance**, so it is built to be
 * impossible to mistake for the real thing:
 *
 * - it is **off unless `EXPO_PUBLIC_PROTOTYPE_CONTENT=1`**, which no release build sets;
 * - it lives in its own corpus, so `assertCited` and the `GUIDANCE` tripwire keep guarding the
 *   shipped path exactly as before;
 * - every card and banner that shows it says **draft**, and says why;
 * - and its bodies are deliberately *shaped* like guidance without being instructions — enough for
 *   the layout, the length and the rhythm of a screen to be designed and reviewed, and not a single
 *   step a person could follow.
 *
 * One figure is real and attributed, because the metronome needs a pace to exist at all. The *rate*
 * is RCUK's published number; the wording is ours. Keeping those two claims apart is the whole point
 * of this module, and `sourceFigure` is where that separation is recorded.
 *
 * When RCUK's permission lands, these records are **deleted** and cited ones take their place under
 * the same ids — so no screen changes when the real wording arrives.
 */

import { GUIDANCE_IDS, type GuidanceId } from './guidance';

export type DraftRecord = {
  id: GuidanceId;
  title: string;
  /** Wording written for design review. Not approved, and not a reproduction of anything. */
  body: string;
  /** Machine-readable companion, where showing the design needs one. */
  bpm?: number;
  /** ISO-8601: when this wording was drafted. */
  draftedOn: string;
  /** Where a figure came from, when the figure is somebody else's and the wording is ours. */
  sourceFigure?: string;
};

/**
 * The three slots the app has today, filled enough to design against.
 *
 * The prose deliberately describes *what belongs here* rather than telling anyone what to do. That
 * is not diffidence: a draft that read like an instruction is the one artefact this project exists
 * not to produce, and a card the right length with the right rhythm designs a screen just as well.
 */
export const DRAFTS: readonly DraftRecord[] = [
  {
    id: GUIDANCE_IDS.cprCompressionRate,
    title: 'Compression pace',
    body: 'The pace to work at, and the range it sits in. The figure below is RCUK’s published rate; the sentence around it is ours and not yet approved.',
    bpm: 110,
    draftedOn: '2026-10-03',
    sourceFigure: 'Resuscitation Council UK, published compression rate (100–120 per minute)',
  },
  {
    id: GUIDANCE_IDS.cprCompressions,
    title: 'How to do compressions',
    body: 'This is where the hand position, the depth and the point at which to stop go. The wording will be RCUK’s, reproduced under permission. It has not been written yet, and this card exists so the screen can be designed and reviewed.',
    draftedOn: '2026-10-03',
  },
  {
    id: GUIDANCE_IDS.aedUse,
    title: 'How to use an AED',
    body: 'This is where the pads, the prompts and the point at which to stand clear go. The wording will be RCUK’s, reproduced under permission. It has not been written yet.',
    draftedOn: '2026-10-03',
  },
];

/**
 * The sentence every draft card carries.
 *
 * One constant, because it is the claim that keeps the tier honest and it should not drift between
 * two screens — and because a clinician reviewing this needs to read the same words everywhere.
 */
export const DRAFT_DISCLAIMER =
  'Draft wording for design review — not approved, and not for use. Field Kit reproduces first aid guidance from a licensed source rather than writing its own.';

export class DraftContentError extends Error {
  constructor(problems: readonly string[]) {
    super(`Unusable draft content:\n${problems.join('\n')}`);
    this.name = 'DraftContentError';
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function draftProblems(records: readonly DraftRecord[]): string[] {
  return records.flatMap((record) => {
    const problems: string[] = [];

    if (!record.id?.trim()) problems.push('id is empty');
    if (!record.title?.trim()) problems.push('title is empty');
    if (!record.body?.trim()) problems.push('body is empty');
    if (!ISO_DATE.test(record.draftedOn ?? '')) {
      problems.push(`draftedOn is not an ISO date: ${String(record.draftedOn)}`);
    }
    if (record.bpm !== undefined && (!Number.isFinite(record.bpm) || record.bpm <= 0)) {
      problems.push(`bpm must be a positive number, received ${String(record.bpm)}`);
    }
    // A figure that is somebody else's has to say so, or the draft card implies we chose it.
    if (record.bpm !== undefined && !record.sourceFigure?.trim()) {
      problems.push('a draft carrying a figure must record where the figure came from');
    }

    return problems.map((problem) => `${record.id || '<no id>'}: ${problem}`);
  });
}

/**
 * Whether this build shows draft wording.
 *
 * The flag is a **parameter defaulting to the environment**, rather than a bare `process.env` read,
 * for the same reason the what3words key is passed in: `EXPO_PUBLIC_*` is inlined at build time, so
 * the value cannot be changed while running and a test cannot flip it. Taking it as an argument keeps
 * the decision testable while the default stays the build-time value.
 */
export function draftContentEnabled(
  flag: string | undefined = process.env.EXPO_PUBLIC_PROTOTYPE_CONTENT,
): boolean {
  return flag === '1';
}

/** A draft, if this build shows them and one exists for that slot. */
export function getDraft(
  id: string,
  enabled: boolean = draftContentEnabled(),
): DraftRecord | undefined {
  if (!enabled) return undefined;

  return DRAFTS.find((record) => record.id === id);
}

/** The pace a draft would beat at, if this build shows drafts. */
export function draftCompressionPaceBpm(
  enabled: boolean = draftContentEnabled(),
): number | undefined {
  return getDraft(GUIDANCE_IDS.cprCompressionRate, enabled)?.bpm;
}

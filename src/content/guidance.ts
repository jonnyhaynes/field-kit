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
 * Where this wording comes from, and on what basis it may be used.
 *
 * North West Ambulance Service is an NHS ambulance trust, and NHS material is published under the
 * **Open Government Licence** — which permits copying, adaptation and commercial use, provided the
 * source is attributed. That is what makes this reproduction lawful without a permission
 * conversation, and it is why the app can ship real guidance rather than an empty slot.
 *
 * Every record below is **verbatim** from that source. Nothing has been reworded, shortened or
 * interpreted: transcribing clinical wording is a hazard of its own, and the citation is what makes
 * a mistake in it checkable.
 *
 * **The Resuscitation Council UK remains the intended authority** (§2.1) and their wording will
 * replace this under the same ids once their permission is in hand. Someone should confirm the
 * trust page's own terms before release — the OGL is the basis relied on here.
 */
export const GUIDANCE_SOURCE_URL =
  'https://www.nwas.nhs.uk/ambulance-academy/resources-for-adults/how-to-do-cpr/';

const CITATION = {
  publisher: 'North West Ambulance Service (NHS)',
  edition: `How to do CPR, ${GUIDANCE_SOURCE_URL} — retrieved 2026-10-03`,
  reviewedOn: '2026-10-03',
} as const;

/**
 * The shipped corpus.
 *
 * Reproduced, not written: every record is the source's own wording, carries its publisher and the
 * date it was checked, and `assertCited` runs below at import time so a record without provenance
 * fails immediately rather than shipping quietly.
 */
export const GUIDANCE: readonly GuidanceRecord[] = [
  {
    id: GUIDANCE_IDS.cprCompressionRate,
    depth: 'guided',
    title: 'Compression pace',
    body: 'Repeat these compressions at a rate of 100 to 120 times a minute (approx. two per second).',
    /**
     * The metronome beats at **110**, the middle of the range above. The range is the source's; the
     * single number is this app's reading of it, and it is written down here rather than buried,
     * because a pace is a clinical figure and choosing one is not the same as quoting one.
     */
    bpm: 110,
    citation: CITATION,
  },
  {
    id: GUIDANCE_IDS.cprCompressions,
    depth: 'guided',
    title: 'How to do compressions',
    body: [
      'Kneel next to the person and place the heel of your hand in the centre of their chest. Place the palm of your other hand on top of the hand that’s on their chest and interlock your fingers.',
      'Position yourself so your shoulders are directly above your hands.',
      'Using your body weight (not just your arms), press straight down by five to 6 centimetres (two to two and a half inches) on their chest, approximately a third of the depth of the patient’s chest.',
      'Keeping your hands on their chest, release the compression and allow their chest to return to its original position.',
      'Repeat these compressions at a rate of 100 to 120 times a minute (approx. two per second) until an ambulance arrives or for as long as you can, if someone else is with you ask if they can swap with you.',
    ].join('\n\n'),
    citation: CITATION,
  },
  {
    id: GUIDANCE_IDS.aedUse,
    depth: 'guided',
    title: 'How to use an AED',
    body: 'If there is an automated external defibrillator (AED) nearby send someone to get it. You do not need prior knowledge of how to use one as it will give clear instructions. It could save someone’s life.',
    citation: CITATION,
  },
];

assertCited(GUIDANCE);

/** Look up licensed guidance. Returns undefined when it is not in this build. */
export function getGuidance(id: GuidanceId | string): GuidanceRecord | undefined {
  return GUIDANCE.find((record) => record.id === id);
}

/**
 * The licensed compression pace.
 *
 * Now present, so the metronome runs: 110, taken from the source's 100–120 range and recorded as
 * such in the record above.
 */
export function compressionPaceBpm(): number | undefined {
  return getGuidance(GUIDANCE_IDS.cprCompressionRate)?.bpm;
}

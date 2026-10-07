/**
 * The responder capture forms, as data.
 *
 * Four standard pre-hospital mnemonics, recorded as structures rather than screens so a field change
 * is a reviewable diff and the renderer is written once (§4.4, "content as data").
 *
 * **These are questions to record answers to, not clinical guidance**, which is why they are safe to
 * write before the content licence lands (§2.1). Two rules hold them honest:
 *
 * 1. **Observations, never treatment.** ABCDE and ASHICE as taught interleave assessment with
 *    intervention — give oxygen, cannulate, administer. This app records what someone observes and
 *    recommends nothing, so the action half of each mnemonic is deliberately absent. A test enforces
 *    it, because that is the rule most likely to erode as fields are added.
 * 2. **Only what a first aider can actually observe.** A blood pressure needs a cuff; a Glasgow Coma
 *    Scale needs training. Where a field would need equipment it is marked, and where a first-responder
 *    alternative exists it is used — ACVPU rather than GCS. Recording things the user cannot measure
 *    would be inventing data.
 *
 * Structures follow the widely-published expansions: SAMPLE/SAMPLER and ABCDE as taught in ATLS/EMS
 * and by Resuscitation Council UK, ETHANE from the JESIP M/ETHANE incident-reporting framework, and
 * ASHICE from UK/Ireland pre-alert practice. Note that ETHANE describes a **scene** and ASHICE a
 * **patient** — they are different tools, not variants, and each form says which it is.
 */

export type CaptureFieldKind = 'boolean' | 'choice' | 'number' | 'text' | 'time';

export type CaptureField = {
  id: string;
  /** What to ask. Phrased as something to record, never something to do. */
  label: string;
  kind: CaptureFieldKind;
  /** Required when `kind` is `choice`. */
  options?: readonly string[];
  /** Required when `kind` is `number`. */
  unit?: string;
  /** True when observation needs a device the user may not have. */
  needsEquipment?: boolean;
};

/**
 * One named stage of a form — the mnemonic's own letter.
 *
 * A form is one idea; a step is a part of it (`A` is Airway). The steps are data rather than a
 * grouping invented in the renderer, so a field moving between stages is a reviewable diff, and a
 * test asserts every field belongs to exactly one step.
 */
export type CaptureStep = {
  /** The letter this step is named for. Not unique on its own — ETHANE has two `E`s. */
  letter: string;
  /** What the stage is, e.g. `Airway`. */
  label: string;
  /** The fields asked in this stage, in order. */
  fieldIds: readonly string[];
};

export type CaptureForm = {
  id: string;
  mnemonic: string;
  /** One line on what the form is for. */
  purpose: string;
  /** Two or three words for the index row, where a full sentence would truncate. */
  summary: string;
  /** Whether this records the scene or the casualty. They are not interchangeable. */
  whatItDescribes: 'patient' | 'scene';
  fields: readonly CaptureField[];
  /** The mnemonic's own named stages, so the form is worked through in the order it is taught. */
  steps: readonly CaptureStep[];
};

const LEVEL_OF_CONSCIOUSNESS = [
  'Alert',
  'New confusion',
  'Responds to voice',
  'Responds to pain',
  'Unresponsive',
] as const;

/**
 * SAMPLER — history from a casualty who can answer.
 *
 * The ATLS/EMS core is SAMPLE; SAMPLER adds an R that no single body standardises, so it is fixed
 * here as "risk factors" and that choice is recorded rather than assumed.
 */
const SAMPLER: CaptureForm = {
  id: 'sampler',
  mnemonic: 'SAMPLER',
  purpose: 'History from a casualty who is alert enough to answer.',
  summary: 'History',
  whatItDescribes: 'patient',
  fields: [
    {
      id: 'sampler.signsAndSymptoms',
      label: 'Signs and symptoms, in their own words',
      kind: 'text',
    },
    { id: 'sampler.allergies', label: 'Allergies, and what happened', kind: 'text' },
    {
      id: 'sampler.medications',
      label: 'Medications, including inhalers and anything else',
      kind: 'text',
    },
    {
      id: 'sampler.pastHistory',
      label: 'Past medical history, and previous episodes',
      kind: 'text',
    },
    { id: 'sampler.lastIntake', label: 'Last food or drink, and when', kind: 'text' },
    { id: 'sampler.events', label: 'What happened leading up to this', kind: 'text' },
    { id: 'sampler.riskFactors', label: 'Risk factors', kind: 'text' },
  ],
  steps: [
    { letter: 'S', label: 'Signs and symptoms', fieldIds: ['sampler.signsAndSymptoms'] },
    { letter: 'A', label: 'Allergies', fieldIds: ['sampler.allergies'] },
    { letter: 'M', label: 'Medications', fieldIds: ['sampler.medications'] },
    { letter: 'P', label: 'Past history', fieldIds: ['sampler.pastHistory'] },
    { letter: 'L', label: 'Last intake', fieldIds: ['sampler.lastIntake'] },
    { letter: 'E', label: 'Events', fieldIds: ['sampler.events'] },
    { letter: 'R', label: 'Risk factors', fieldIds: ['sampler.riskFactors'] },
  ],
};

/** ABCDE — the primary survey, recorded as observations rather than interventions. */
const ABCDE: CaptureForm = {
  id: 'abcde',
  mnemonic: 'ABCDE',
  purpose: 'Primary survey: what you can see, hear and feel, in order.',
  summary: 'Primary survey',
  whatItDescribes: 'patient',
  fields: [
    {
      id: 'abcde.airwaySound',
      label: 'Breathing sound at the mouth',
      kind: 'choice',
      options: ['Clear', 'Snoring', 'Gurgling', 'Stridor'],
    },
    {
      id: 'abcde.airwayObstruction',
      label: 'Anything visible blocking the airway',
      kind: 'boolean',
    },
    {
      id: 'abcde.speaking',
      label: 'How they are speaking',
      kind: 'choice',
      options: ['Full sentences', 'Short phrases', 'Single words', 'Unable to speak'],
    },
    {
      id: 'abcde.breathingRate',
      label: 'Breaths per minute',
      kind: 'number',
      unit: 'breaths per minute',
    },
    {
      id: 'abcde.breathingEffort',
      label: 'Effort of breathing',
      kind: 'choice',
      options: ['Normal', 'More effort than usual', 'Gasping', 'Not breathing'],
    },
    {
      id: 'abcde.chestMovement',
      label: 'Chest movement',
      kind: 'choice',
      options: ['Both sides equal', 'One side moves less', 'Not moving'],
    },
    {
      id: 'abcde.breathSounds',
      label: 'Breath sounds',
      kind: 'choice',
      options: ['Normal', 'Wheeze', 'Crackles', 'Silent'],
    },
    {
      id: 'abcde.oxygenSaturation',
      label: 'Oxygen saturation',
      kind: 'number',
      unit: '%',
      needsEquipment: true,
    },
    { id: 'abcde.pulseRate', label: 'Pulse rate', kind: 'number', unit: 'beats per minute' },
    {
      id: 'abcde.pulseCharacter',
      label: 'Pulse',
      kind: 'choice',
      options: ['Regular and easy to feel', 'Irregular', 'Weak or thready', 'Cannot find a pulse'],
    },
    {
      id: 'abcde.skinColour',
      label: 'Skin colour',
      kind: 'choice',
      options: ['Normal', 'Pale', 'Blue or grey', 'Mottled'],
    },
    {
      id: 'abcde.skinTemperature',
      label: 'Skin temperature',
      kind: 'choice',
      options: ['Warm', 'Cool', 'Cold and clammy'],
    },
    {
      id: 'abcde.capillaryRefill',
      label: 'Capillary refill after pressing a fingertip',
      kind: 'choice',
      options: ['Under 2 seconds', 'Over 2 seconds', 'Not checked'],
    },
    { id: 'abcde.bleeding', label: 'Bleeding you can see', kind: 'boolean' },
    { id: 'abcde.bleedingWhere', label: 'Where the bleeding is', kind: 'text' },
    {
      id: 'abcde.consciousness',
      label: 'Level of consciousness',
      kind: 'choice',
      options: LEVEL_OF_CONSCIOUSNESS,
    },
    {
      id: 'abcde.pupils',
      label: 'Pupils',
      kind: 'choice',
      options: ['Equal and reacting', 'Unequal', 'Not reacting', 'Not checked'],
    },
    {
      id: 'abcde.bloodGlucose',
      label: 'Blood glucose',
      kind: 'number',
      unit: 'mmol/L',
      needsEquipment: true,
    },
    { id: 'abcde.injuries', label: 'Injuries found, head to toe', kind: 'text' },
    {
      id: 'abcde.temperature',
      label: 'Temperature',
      kind: 'number',
      unit: '°C',
      needsEquipment: true,
    },
  ],
  steps: [
    {
      letter: 'A',
      label: 'Airway',
      fieldIds: ['abcde.airwaySound', 'abcde.airwayObstruction', 'abcde.speaking'],
    },
    {
      letter: 'B',
      label: 'Breathing',
      fieldIds: [
        'abcde.breathingRate',
        'abcde.breathingEffort',
        'abcde.chestMovement',
        'abcde.breathSounds',
        'abcde.oxygenSaturation',
      ],
    },
    {
      letter: 'C',
      label: 'Circulation',
      fieldIds: [
        'abcde.pulseRate',
        'abcde.pulseCharacter',
        'abcde.skinColour',
        'abcde.skinTemperature',
        'abcde.capillaryRefill',
        'abcde.bleeding',
        'abcde.bleedingWhere',
      ],
    },
    {
      letter: 'D',
      label: 'Disability',
      fieldIds: ['abcde.consciousness', 'abcde.pupils', 'abcde.bloodGlucose'],
    },
    {
      letter: 'E',
      label: 'Exposure',
      fieldIds: ['abcde.injuries', 'abcde.temperature'],
    },
  ],
};

/**
 * ETHANE — a report about the **scene**, not a casualty.
 *
 * From the JESIP incident-reporting framework, which is why it carries location, hazards, access and
 * casualty *numbers* rather than anything clinical. ASHICE is the patient handover; this is not it.
 */
const ETHANE: CaptureForm = {
  id: 'ethane',
  mnemonic: 'ETHANE',
  purpose: 'Situation report about the scene, for a control room or a second crew.',
  summary: 'The scene',
  whatItDescribes: 'scene',
  fields: [
    {
      id: 'ethane.exactLocation',
      label: 'Exact location — address, grid reference or what3words',
      kind: 'text',
    },
    { id: 'ethane.incidentType', label: 'Type of incident', kind: 'text' },
    { id: 'ethane.hazards', label: 'Hazards present or suspected', kind: 'text' },
    { id: 'ethane.access', label: 'Safe way in, and anything blocking it', kind: 'text' },
    { id: 'ethane.casualties', label: 'Number of casualties', kind: 'number', unit: 'casualties' },
    { id: 'ethane.worstInjury', label: 'Most serious injury seen', kind: 'text' },
    { id: 'ethane.servicesNeeded', label: 'Which emergency services are needed', kind: 'text' },
  ],
  steps: [
    { letter: 'E', label: 'Exact location', fieldIds: ['ethane.exactLocation'] },
    { letter: 'T', label: 'Type of incident', fieldIds: ['ethane.incidentType'] },
    { letter: 'H', label: 'Hazards', fieldIds: ['ethane.hazards'] },
    { letter: 'A', label: 'Access', fieldIds: ['ethane.access'] },
    {
      letter: 'N',
      label: 'Number of casualties',
      fieldIds: ['ethane.casualties', 'ethane.worstInjury'],
    },
    { letter: 'E', label: 'Emergency services', fieldIds: ['ethane.servicesNeeded'] },
  ],
};

/** ASHICE — the **patient** handover, as UK and Ireland pre-alert practice uses it. */
const ASHICE: CaptureForm = {
  id: 'ashice',
  mnemonic: 'ASHICE',
  purpose: 'Handover about one casualty, to the crew that takes over.',
  summary: 'Handing over',
  whatItDescribes: 'patient',
  fields: [
    { id: 'ashice.age', label: 'Age', kind: 'number', unit: 'years' },
    {
      id: 'ashice.sex',
      label: 'Sex',
      kind: 'choice',
      options: ['Female', 'Male', 'Other, or not stated'],
    },
    { id: 'ashice.history', label: 'What happened', kind: 'text' },
    { id: 'ashice.injuries', label: 'Injuries or illness found', kind: 'text' },
    {
      id: 'ashice.causeForConcern',
      label: 'Cause for concern — what worries you most',
      kind: 'text',
    },
    {
      id: 'ashice.consciousness',
      label: 'Level of consciousness',
      kind: 'choice',
      options: LEVEL_OF_CONSCIOUSNESS,
    },
    {
      id: 'ashice.breathingRate',
      label: 'Breaths per minute',
      kind: 'number',
      unit: 'breaths per minute',
    },
    { id: 'ashice.pulseRate', label: 'Pulse rate', kind: 'number', unit: 'beats per minute' },
    { id: 'ashice.eta', label: 'Estimated time of arrival, if known', kind: 'time' },
  ],
  steps: [
    { letter: 'A', label: 'Age', fieldIds: ['ashice.age'] },
    { letter: 'S', label: 'Sex', fieldIds: ['ashice.sex'] },
    { letter: 'H', label: 'History', fieldIds: ['ashice.history', 'ashice.injuries'] },
    { letter: 'I', label: 'Illness or injury', fieldIds: ['ashice.causeForConcern'] },
    {
      letter: 'C',
      label: 'Condition',
      fieldIds: ['ashice.consciousness', 'ashice.breathingRate', 'ashice.pulseRate'],
    },
    { letter: 'E', label: 'ETA', fieldIds: ['ashice.eta'] },
  ],
};

export const CAPTURE_FORMS: readonly CaptureForm[] = [SAMPLER, ABCDE, ETHANE, ASHICE];

export function findCaptureForm(id: string): CaptureForm | undefined {
  return CAPTURE_FORMS.find((form) => form.id === id);
}

export function findCaptureField(fieldId: string): CaptureField | undefined {
  return CAPTURE_FORMS.flatMap((form) => form.fields).find((field) => field.id === fieldId);
}

/** Which form a field belongs to, so a stored observation can name both. */
export function formForField(fieldId: string): CaptureForm | undefined {
  return CAPTURE_FORMS.find((form) => form.fields.some((field) => field.id === fieldId));
}

/**
 * A step's fields, resolved against its form.
 *
 * Unknown ids are dropped rather than throwing, so a typo shows as a missing field — which the
 * step-coverage test catches — instead of taking the form down at render time.
 */
export function stepFields(form: CaptureForm, step: CaptureStep): CaptureField[] {
  return step.fieldIds
    .map((fieldId) => form.fields.find((field) => field.id === fieldId))
    .filter((field): field is CaptureField => field !== undefined);
}

import { describe, expect, it } from '@jest/globals';

import {
  CAPTURE_FORMS,
  findCaptureField,
  findCaptureForm,
  formForField,
  stepFields,
} from '../forms';

describe('the capture forms', () => {
  it('covers the four mnemonics the plan names', () => {
    expect(CAPTURE_FORMS.map((form) => form.mnemonic)).toEqual([
      'SAMPLER',
      'ABCDE',
      'ETHANE',
      'ASHICE',
    ]);
  });

  it('says whether each form describes the scene or a casualty', () => {
    // ETHANE and ASHICE are different tools, not variants: one reports the scene, the other a person.
    expect(findCaptureForm('ethane')?.whatItDescribes).toBe('scene');
    for (const id of ['sampler', 'abcde', 'ashice']) {
      expect(findCaptureForm(id)?.whatItDescribes).toBe('patient');
    }
  });

  it('gives every form a short summary, for the index row where a sentence truncates', () => {
    for (const form of CAPTURE_FORMS) {
      expect(form.summary.trim()).not.toBe('');
      expect(form.summary.length).toBeLessThanOrEqual(16);
      expect(form.summary.endsWith('.')).toBe(false);
    }
  });

  it('gives every form a purpose, so a responder knows which one they are in', () => {
    for (const form of CAPTURE_FORMS) {
      expect(form.purpose.trim()).not.toBe('');
    }
  });

  it('names every field and gives it a kind', () => {
    for (const field of CAPTURE_FORMS.flatMap((form) => form.fields)) {
      expect(field.id.trim()).not.toBe('');
      expect(field.label.trim()).not.toBe('');
      expect(field.kind).toBeTruthy();
    }
  });

  it('gives every choice at least two options, and no options to anything else', () => {
    for (const field of CAPTURE_FORMS.flatMap((form) => form.fields)) {
      if (field.kind === 'choice') {
        expect(field.options?.length ?? 0).toBeGreaterThanOrEqual(2);
      } else {
        expect(field.options).toBeUndefined();
      }
    }
  });

  it('gives every number a unit, because a number without one is not an observation', () => {
    for (const field of CAPTURE_FORMS.flatMap((form) => form.fields)) {
      if (field.kind === 'number') expect(field.unit?.trim()).toBeTruthy();
    }
  });

  it('keeps field ids unique across all four forms', () => {
    const ids = CAPTURE_FORMS.flatMap((form) => form.fields.map((field) => field.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks the fields that need equipment the user may not have', () => {
    expect(findCaptureField('abcde.oxygenSaturation')?.needsEquipment).toBe(true);
    expect(findCaptureField('abcde.bloodGlucose')?.needsEquipment).toBe(true);
    expect(findCaptureField('abcde.pulseRate')?.needsEquipment).toBeUndefined();
  });

  it('uses ACVPU rather than a Glasgow Coma Scale', () => {
    // A GCS needs training; ACVPU is the first-responder alternative and needs none.
    const consciousness = findCaptureField('abcde.consciousness');
    expect(consciousness?.options).toContain('Unresponsive');
    expect(JSON.stringify(CAPTURE_FORMS)).not.toMatch(/glasgow|GCS/i);
  });

  it('finds the form a field belongs to', () => {
    expect(formForField('ashice.age')?.id).toBe('ashice');
  });
});

/**
 * The rule most likely to erode as fields are added, so it is enforced rather than reviewed.
 *
 * ABCDE and ASHICE as taught interleave assessment with intervention — give oxygen, cannulate,
 * administer. This app records what someone observes and recommends nothing (§2.1), so a label or an
 * option that reads as an instruction is a defect, not a wording preference.
 */
describe('the line between recording and advising', () => {
  const INSTRUCTION =
    /\b(give|administer|dose|treat|treatment|should|must|recommend|ensure|avoid|apply|monitor|assess|maintain)\b/i;

  const wordings = () =>
    CAPTURE_FORMS.flatMap((form) => [
      ...form.fields.flatMap((field) => [field.label, ...(field.options ?? [])]),
      form.purpose,
    ]);

  it.each(['give', 'administer', 'dose', 'treat', 'recommend', 'ensure', 'monitor'])(
    'would catch %s if a field ever said it',
    (word) => {
      expect(INSTRUCTION.test(`You should ${word} it`)).toBe(true);
    },
  );

  it.each([
    ['labels', () => CAPTURE_FORMS.flatMap((form) => form.fields.map((field) => field.label))],
    [
      'options',
      () => CAPTURE_FORMS.flatMap((form) => form.fields.flatMap((field) => field.options ?? [])),
    ],
    ['purposes', () => CAPTURE_FORMS.map((form) => form.purpose)],
  ])('has no instruction hiding in the %s', (_label, collect) => {
    const offending = collect().filter((text) => INSTRUCTION.test(text));
    expect(offending).toEqual([]);
  });

  it('has a guard that would notice, so the check above is not vacuous', () => {
    expect(wordings().length).toBeGreaterThan(20);
  });
});

/**
 * The steps are the form's own structure, so a field that falls out of every step is one the
 * renderer can never show, and a field listed twice is one asked twice.
 */
describe('the named steps', () => {
  it('puts every field in exactly one step, and invents none', () => {
    for (const form of CAPTURE_FORMS) {
      const listed = form.steps.flatMap((step) => step.fieldIds);
      const fieldIds = form.fields.map((field) => field.id);

      expect(new Set(listed).size).toBe(listed.length);
      expect([...listed].sort()).toEqual([...fieldIds].sort());
    }
  });

  it('resolves every step to real fields', () => {
    for (const form of CAPTURE_FORMS) {
      for (const step of form.steps) {
        expect(stepFields(form, step).length).toBe(step.fieldIds.length);
      }
    }
  });

  it('names every step with a letter and a label', () => {
    for (const form of CAPTURE_FORMS) {
      for (const step of form.steps) {
        expect(step.letter.trim()).not.toBe('');
        expect(step.label.trim()).not.toBe('');
      }
    }
  });
});

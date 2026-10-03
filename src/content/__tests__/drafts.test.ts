import { describe, expect, it } from '@jest/globals';

import { GUIDANCE, GUIDANCE_IDS, getGuidance } from '../guidance';
import {
  DRAFTS,
  draftCompressionPaceBpm,
  draftContentEnabled,
  draftProblems,
  getDraft,
  type DraftRecord,
} from '../drafts';

describe('whether drafts are shown at all', () => {
  it('is off unless the build asks for it', () => {
    // The whole safety property: a build that does not set the variable cannot show drafts, and no
    // release build sets it.
    expect(draftContentEnabled(undefined)).toBe(false);
  });

  it('hands out no drafts when it is off', () => {
    for (const record of DRAFTS) {
      expect(getDraft(record.id, false)).toBeUndefined();
    }
    expect(draftCompressionPaceBpm(false)).toBeUndefined();
  });

  it('is on when the build asks for it', () => {
    expect(draftContentEnabled('1')).toBe(true);
    expect(getDraft(GUIDANCE_IDS.cprCompressions, true)?.title).toBe('How to do compressions');
  });

  it('treats any other value as off, so a stray string cannot turn it on', () => {
    for (const value of ['true', 'yes', '0', '', undefined]) {
      expect(draftContentEnabled(value)).toBe(false);
    }
  });
});

describe('the draft corpus', () => {
  it('fills every slot the app has, so nothing is left half-designed', () => {
    expect(DRAFTS.map((record) => record.id).sort()).toEqual(
      [GUIDANCE_IDS.cprCompressionRate, GUIDANCE_IDS.cprCompressions, GUIDANCE_IDS.aedUse].sort(),
    );
  });

  it('is well formed', () => {
    expect(draftProblems(DRAFTS)).toEqual([]);
  });

  it('never tells anyone what to do', () => {
    // An instruction is an *imperative*, so the guard looks for one at the start of a sentence — not
    // for a topic word anywhere in the prose. The first version flagged "stand clear", which a draft
    // legitimately names when saying what the wording will cover; and an earlier one flagged "push"
    // in the rate draft, which was a real slip. The narrower check keeps both.
    const imperative = /(^|[.!?]\s+)(push|press|place|give|use|stand|keep|check|do|take|call)\b/i;

    for (const record of DRAFTS) {
      expect(imperative.test(record.body)).toBe(false);
    }
  });

  it('says in its own words that it is not the real thing', () => {
    // The label has to live in the content too, not only on the card: a body copied out of the app
    // into a message should still read as unapproved.
    const selfDescribing =
      /not yet approved|has not been written|not been written|for design|draft/i;

    for (const record of DRAFTS) {
      expect(selfDescribing.test(record.body)).toBe(true);
    }
  });

  it('says where a figure came from, wherever it carries one', () => {
    for (const record of DRAFTS) {
      if (record.bpm !== undefined) expect(record.sourceFigure).toBeTruthy();
    }
  });

  it('catches a draft with no provenance for its figure', () => {
    const orphaned: DraftRecord = { ...DRAFTS[0]!, sourceFigure: undefined };
    expect(draftProblems([orphaned]).join(' ')).toMatch(/record where the figure came from/);
  });

  it('catches an unusable date and an empty body', () => {
    expect(draftProblems([{ ...DRAFTS[0]!, draftedOn: '3 October' }]).length).toBeGreaterThan(0);
    expect(draftProblems([{ ...DRAFTS[0]!, body: '  ' }]).length).toBeGreaterThan(0);
  });
});

describe('the shipped corpus is untouched by any of this', () => {
  it('stays empty, so the licence tripwire keeps its job', () => {
    expect(GUIDANCE).toHaveLength(0);
  });

  it('is still the only thing the screens look in for guidance, drafts on or off', () => {
    expect(getGuidance(GUIDANCE_IDS.cprCompressions)).toBeUndefined();
    expect(getDraft(GUIDANCE_IDS.cprCompressions, true)).toBeDefined();
  });
});

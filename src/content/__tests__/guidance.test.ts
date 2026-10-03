import { describe, expect, it } from '@jest/globals';

import {
  compressionPaceBpm,
  getGuidance,
  GUIDANCE,
  GUIDANCE_IDS,
  GUIDANCE_SOURCE_URL,
} from '../guidance';
import { assertCited } from '../types';

describe('the shipped corpus', () => {
  it('is traceable', () => {
    expect(() => assertCited(GUIDANCE)).not.toThrow();
  });

  /**
   * This test used to assert `GUIDANCE` was **empty**, as a tripwire: adding the first record failed
   * it, and that was the moment to confirm where the wording came from. The wording is now in, from
   * an NHS ambulance service under the Open Government Licence, so the tripwire becomes the rule it
   * was guarding: every record names a publisher and a date it was checked.
   */
  it('names a publisher and a review date for every record', () => {
    expect(GUIDANCE.length).toBeGreaterThan(0);

    for (const record of GUIDANCE) {
      expect(record.citation.publisher.trim()).not.toBe('');
      expect(record.citation.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // The licence rests on the source being named and reachable, so it travels with the content.
      expect(record.citation.edition).toContain(GUIDANCE_SOURCE_URL);
    }
  });

  it('fills every slot the Guided screens ask for', () => {
    for (const id of Object.values(GUIDANCE_IDS)) {
      expect(getGuidance(id)).toBeDefined();
    }
  });

  it('returns undefined for guidance that is not in this build', () => {
    expect(getGuidance('guided.does.not.exist')).toBeUndefined();
  });

  it('reports a compression pace, taken from the source rather than chosen freely', () => {
    const bpm = compressionPaceBpm();

    expect(bpm).toBeDefined();
    // The metronome beats at one number; the source publishes a range. This is the test that the
    // number sits inside it, so a later edit cannot quietly move the app off its source.
    expect(bpm).toBeGreaterThanOrEqual(100);
    expect(bpm).toBeLessThanOrEqual(120);
  });
});

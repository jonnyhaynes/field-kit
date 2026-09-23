import { describe, expect, it } from '@jest/globals';

import { compressionPaceBpm, getGuidance, GUIDANCE, GUIDANCE_IDS } from '../guidance';
import { assertCited } from '../types';

describe('the shipped corpus', () => {
  it('is traceable', () => {
    expect(() => assertCited(GUIDANCE)).not.toThrow();
  });

  /**
   * A deliberate tripwire, not a bug. The corpus is empty because no clinical content is
   * licensed in yet (plan §2.1). When someone adds the first record, this fails and they
   * have to come here — which is the moment to confirm the licence, not after.
   */
  it('is empty until a licence is in place', () => {
    expect(GUIDANCE).toHaveLength(0);
  });

  it('returns undefined for guidance that is not licensed in', () => {
    expect(getGuidance(GUIDANCE_IDS.cprCompressionRate)).toBeUndefined();
    expect(getGuidance('guided.does.not.exist')).toBeUndefined();
  });

  it('reports no compression pace rather than inventing one', () => {
    expect(compressionPaceBpm()).toBeUndefined();
  });
});

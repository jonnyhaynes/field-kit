import { describe, expect, it } from '@jest/globals';

import {
  assertCited,
  citationProblems,
  ContentTraceabilityError,
  type GuidanceRecord,
} from '../types';

const cited: GuidanceRecord = {
  id: 'guided.test.example',
  depth: 'guided',
  title: 'An example record',
  body: 'Wording reproduced from a licensed source.',
  citation: {
    publisher: 'Example Publisher',
    edition: '2025 edition',
    reviewedOn: '2025-01-01',
  },
};

/** Test fixtures get to be malformed; that is the whole point of them. */
const asRecord = (partial: Record<string, unknown>): GuidanceRecord =>
  partial as unknown as GuidanceRecord;

describe('citationProblems', () => {
  it('passes a fully cited record', () => {
    expect(citationProblems(cited)).toEqual([]);
  });

  it('catches a record with no citation at all', () => {
    expect(citationProblems(asRecord({ ...cited, citation: undefined }))).not.toEqual([]);
  });

  it.each([
    ['an empty publisher', { ...cited.citation, publisher: '   ' }],
    ['an empty edition', { ...cited.citation, edition: '' }],
    ['a missing review date', { ...cited.citation, reviewedOn: '' }],
    ['a review date that is not ISO-8601', { ...cited.citation, reviewedOn: '01/01/2025' }],
    ['a review date that is not a real date', { ...cited.citation, reviewedOn: '2025-13-45' }],
  ])('catches %s', (_label, citation) => {
    expect(citationProblems(asRecord({ ...cited, citation }))).not.toEqual([]);
  });

  it('catches a missing body', () => {
    expect(citationProblems(asRecord({ ...cited, body: '  ' }))).not.toEqual([]);
  });

  it('catches a pace that is not a positive number', () => {
    expect(citationProblems(asRecord({ ...cited, bpm: 0 }))).not.toEqual([]);
    expect(citationProblems(asRecord({ ...cited, bpm: -10 }))).not.toEqual([]);
  });

  it('accepts a record that carries a pace', () => {
    expect(citationProblems(asRecord({ ...cited, bpm: 110 }))).toEqual([]);
  });

  it('names the offending record', () => {
    const problems = citationProblems(asRecord({ ...cited, id: 'guided.x', body: '' }));
    expect(problems.join(' ')).toContain('guided.x');
  });
});

describe('assertCited', () => {
  it('accepts a corpus where everything is cited', () => {
    expect(() => assertCited([cited])).not.toThrow();
    expect(() => assertCited([])).not.toThrow();
  });

  it('rejects the whole corpus when one record is uncited', () => {
    const uncited = asRecord({ ...cited, id: 'guided.uncited', citation: undefined });
    expect(() => assertCited([cited, uncited])).toThrow(ContentTraceabilityError);
  });
});

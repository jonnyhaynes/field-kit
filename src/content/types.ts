/**
 * The shape of clinical content, and the gate that keeps it honest.
 *
 * Every instruction this app presents is a *reproduction* of licensed material. We do
 * not author first aid guidance, so a record without a citation is not a record we are
 * allowed to show. `assertCited` is that rule, executable.
 */

export type Depth = 'guided' | 'responder';

export type Citation = {
  /** Who the wording comes from. Internal: this is not necessarily the UI attribution. */
  publisher: string;
  /** The named guideline edition the wording was taken from. */
  edition: string;
  /** ISO-8601 date (YYYY-MM-DD) the content was last checked against the source. */
  reviewedOn: string;
};

export type GuidanceRecord = {
  id: string;
  depth: Depth;
  title: string;
  body: string;
  /**
   * Machine-readable companion to `body`, for records that drive a tool rather than
   * being read — today, the compression pace the metronome beats at. It is covered by
   * the same citation as the prose: the number is clinical content too.
   */
  bpm?: number;
  citation: Citation;
};

export class ContentTraceabilityError extends Error {
  constructor(problems: readonly string[]) {
    super(`Uncited clinical content:\n${problems.join('\n')}`);
    this.name = 'ContentTraceabilityError';
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Everything wrong with a record's provenance. Empty array means it passes. */
export function citationProblems(record: GuidanceRecord): string[] {
  const problems: string[] = [];

  if (!record.id?.trim()) problems.push('id is empty');
  if (!record.title?.trim()) problems.push('title is empty');
  if (!record.body?.trim()) problems.push('body is empty');

  if (record.bpm !== undefined && (!Number.isFinite(record.bpm) || record.bpm <= 0)) {
    problems.push(`bpm must be a positive number, received ${String(record.bpm)}`);
  }

  const citation = record.citation;
  if (!citation) {
    problems.push('citation is missing');
    return problems.map((p) => `${record.id || '<no id>'}: ${p}`);
  }

  if (!citation.publisher?.trim()) problems.push('citation.publisher is empty');
  if (!citation.edition?.trim()) problems.push('citation.edition is empty');

  if (!citation.reviewedOn?.trim()) {
    problems.push('citation.reviewedOn is missing');
  } else if (!ISO_DATE.test(citation.reviewedOn) || Number.isNaN(Date.parse(citation.reviewedOn))) {
    problems.push(`citation.reviewedOn is not an ISO date: ${citation.reviewedOn}`);
  }

  if (!(record.depth === 'guided' || record.depth === 'responder')) {
    problems.push(`depth is not guided or responder: ${String(record.depth)}`);
  }

  return problems.map((p) => `${record.id || '<no id>'}: ${p}`);
}

/**
 * Fails loudly if any record is missing its provenance. Call this at module load so a
 * bad content change cannot reach a build, and in tests so it cannot reach a release.
 */
export function assertCited(records: readonly GuidanceRecord[]): void {
  const problems = records.flatMap(citationProblems);
  if (problems.length > 0) throw new ContentTraceabilityError(problems);
}

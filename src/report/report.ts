/**
 * The report: what a responder records, kept on the device.
 *
 * Deliberately thin. A report holds a **recorded location** — the type from `src/incident/` that
 * carries the time it was sampled, because §4.1 rule 1 says a recorded position is not a current one
 * — and a list of observations, each naming the form and field it answers and when it was taken.
 *
 * Nothing here interprets anything. An observation is a value the user entered; the report has no
 * notion of a normal range, a score, or a conclusion, and it must not grow one (§2.1).
 */

import type { RecordedLocation } from '@/incident/recorded-location';

export type ObservationValue = string | number | boolean;

export type Observation = {
  formId: string;
  fieldId: string;
  value: ObservationValue;
  /** ISO-8601, when the user recorded it. */
  recordedAt: string;
};

export type Report = {
  id: string;
  openedAt: string;
  /** Where the incident was, with the time it was sampled. Absent until a position is taken. */
  location?: RecordedLocation;
  observations: Observation[];
};

export function openReport(id: string, openedAt: string, location?: RecordedLocation): Report {
  return { id, openedAt, location, observations: [] };
}

/**
 * Records an observation, replacing any earlier answer for the same field.
 *
 * Replacing rather than appending means a field has one current value, and a correction is not a
 * second contradictory entry that a reader has to reconcile.
 */
export function recordObservation(report: Report, observation: Observation): Report {
  return {
    ...report,
    observations: [
      ...report.observations.filter((entry) => entry.fieldId !== observation.fieldId),
      observation,
    ],
  };
}

export function observationFor(report: Report, fieldId: string): Observation | undefined {
  return report.observations.find((entry) => entry.fieldId === fieldId);
}

export function isAnswered(report: Report, fieldId: string): boolean {
  const observation = observationFor(report, fieldId);
  if (!observation) return false;

  // An empty string or a cleared field is not an answer.
  return typeof observation.value === 'string' ? observation.value.trim() !== '' : true;
}

/** How many of a form's fields have an answer. A half-filled report is a valid report. */
export function answeredCount(report: Report, fieldIds: readonly string[]): number {
  return fieldIds.filter((fieldId) => isAnswered(report, fieldId)).length;
}

function isObservation(value: unknown): value is Observation {
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as Partial<Observation>;
  const valueType = typeof candidate.value;
  return (
    typeof candidate.formId === 'string' &&
    typeof candidate.fieldId === 'string' &&
    typeof candidate.recordedAt === 'string' &&
    (valueType === 'string' || valueType === 'number' || valueType === 'boolean')
  );
}

function isReport(value: unknown): value is Report {
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as Partial<Report>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.openedAt === 'string' &&
    Array.isArray(candidate.observations) &&
    candidate.observations.every(isObservation)
  );
}

/** Unreadable state becomes an empty list rather than an exception, as every store here does. */
export function parseReports(raw: string | null | undefined): Report[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isReport) : [];
  } catch {
    return [];
  }
}

export function serialiseReports(reports: readonly Report[]): string {
  return JSON.stringify(reports);
}

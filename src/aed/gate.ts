/**
 * The quality gate: which OpenStreetMap nodes are fit to become a shipped record.
 *
 * The dataset will contain wrong entries — AEDs get removed, moved and locked away — so
 * the gate is the one place that decides what enters the app. It drops a node only for
 * a reason it can name and justify; everything else is kept and labelled.
 */

import type { AedNode, AedRecord } from './types';

/** OSM values that mark a node as a defibrillator. */
const DEFIBRILLATOR_EMERGENCY_VALUES = new Set(['defibrillator', 'aed']);

/**
 * Access values that say the public is excluded.
 *
 * This is a deny-list rather than an allow-list on purpose. `access` is an optional tag, and
 * in OSM an absent value means "no restriction recorded", not "no access" — 46% of UK
 * defibrillator nodes carry no access tag at all, and almost all of those are ordinary public
 * ones. Requiring a positive value threw away half the country's mapped defibrillators to
 * catch the small fraction that are genuinely restricted. Everything not listed here is kept
 * and shown as unverified, which is the app's default posture anyway.
 *
 * A borderline value worth naming: `access=restricted` (13 nodes nationally) is kept, because
 * it usually describes opening hours rather than exclusion, and the unverified label covers it.
 */
const RESTRICTED_ACCESS_VALUES = new Set(['no', 'private', 'customers', 'employees', 'staff']);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type GateRejectionReason = 'not-a-defibrillator' | 'not-publicly-accessible' | 'stale';

export type GatePolicy = {
  /**
   * Drop records whose *explicit* `check_date` is older than this many years. Unset by
   * default, on purpose: a missing or unreadable date is never a reason to drop, and the
   * threshold itself is an open question (issue #4), so age-dropping is opt-in rather
   * than assumed.
   */
  maxAgeYears?: number;
};

export type GateOptions = {
  policy?: GatePolicy;
  /** Reference point for age, injected so the gate is deterministic under test. */
  asOf?: Date;
};

export type GateResult =
  { accepted: true; record: AedRecord } | { accepted: false; reason: GateRejectionReason };

export type GateSummary = {
  accepted: AedRecord[];
  rejected: { node: AedNode; reason: GateRejectionReason }[];
};

function normalise(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : undefined;
}

/** An unreadable date is treated as absent — never as proof that a record is fresh. */
function parseCheckDate(value: string | undefined): string | undefined {
  if (!value || !ISO_DATE.test(value)) return undefined;
  return Number.isNaN(Date.parse(value)) ? undefined : value;
}

function isOlderThanYears(isoDate: string, years: number, asOf: Date): boolean {
  const cutoff = new Date(asOf);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);
  return Date.parse(isoDate) < cutoff.getTime();
}

/** Judge a single node. */
export function evaluateNode(node: AedNode, options: GateOptions = {}): GateResult {
  const emergency = normalise(node.tags.emergency);
  if (!emergency || !DEFIBRILLATOR_EMERGENCY_VALUES.has(emergency)) {
    return { accepted: false, reason: 'not-a-defibrillator' };
  }

  const access = normalise(node.tags.access);
  if (access && RESTRICTED_ACCESS_VALUES.has(access)) {
    return { accepted: false, reason: 'not-publicly-accessible' };
  }

  const verifiedOn = parseCheckDate(node.tags.check_date);
  const maxAgeYears = options.policy?.maxAgeYears;
  if (
    verifiedOn &&
    maxAgeYears !== undefined &&
    isOlderThanYears(verifiedOn, maxAgeYears, options.asOf ?? new Date())
  ) {
    return { accepted: false, reason: 'stale' };
  }

  return {
    accepted: true,
    record: {
      id: node.source.osmNodeId,
      coordinates: node.coordinates,
      source: node.source,
      verification: verifiedOn
        ? { status: 'verified', on: verifiedOn }
        : { status: 'never-verified' },
    },
  };
}

/** Judge a whole extract, keeping the rejected nodes so their reasons can be reported. */
export function applyQualityGate(
  nodes: readonly AedNode[],
  options: GateOptions = {},
): GateSummary {
  const accepted: AedRecord[] = [];
  const rejected: GateSummary['rejected'] = [];

  for (const node of nodes) {
    const result = evaluateNode(node, options);
    if (result.accepted) {
      accepted.push(result.record);
    } else {
      rejected.push({ node, reason: result.reason });
    }
  }

  return { accepted, rejected };
}

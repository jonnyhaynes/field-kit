import { describe, expect, it } from '@jest/globals';

import { applyQualityGate, evaluateNode } from '../gate';
import type { AedNode } from '../types';

const node = (tags: AedNode['tags']): AedNode => ({
  source: { dataset: 'osm-fixture-2026-09-01', osmNodeId: 42 },
  coordinates: { latitude: 51.5074, longitude: -0.1278 },
  tags,
});

const publicDefibrillator = { emergency: 'defibrillator', access: 'yes' };

describe('evaluateNode', () => {
  it('accepts a publicly accessible defibrillator', () => {
    const result = evaluateNode(node(publicDefibrillator));
    expect(result.accepted).toBe(true);
  });

  it('marks an accepted record never-verified when it carries no check_date', () => {
    const result = evaluateNode(node(publicDefibrillator));
    if (!result.accepted) throw new Error('expected the fixture to be accepted');
    expect(result.record.verification).toEqual({ status: 'never-verified' });
  });

  it('carries the check_date through as the verification date', () => {
    const result = evaluateNode(node({ ...publicDefibrillator, check_date: '2025-06-01' }));
    if (!result.accepted) throw new Error('expected the fixture to be accepted');
    expect(result.record.verification).toEqual({ status: 'verified', on: '2025-06-01' });
  });

  it.each([
    ['a fire hydrant', { ...publicDefibrillator, emergency: 'fire_hydrant' }],
    ['nothing at all', { access: 'yes' }],
    ['an unreadable emergency value', { ...publicDefibrillator, emergency: '   ' }],
  ])('rejects %s as not a defibrillator', (_label, tags) => {
    expect(evaluateNode(node(tags))).toEqual({ accepted: false, reason: 'not-a-defibrillator' });
  });

  it.each([
    ['no access tag', { emergency: 'defibrillator' }],
    ['access=no', { ...publicDefibrillator, access: 'no' }],
    ['access=private', { ...publicDefibrillator, access: 'private' }],
    ['an empty access value', { ...publicDefibrillator, access: '  ' }],
  ])('rejects %s as not publicly accessible', (_label, tags) => {
    expect(evaluateNode(node(tags))).toEqual({
      accepted: false,
      reason: 'not-publicly-accessible',
    });
  });

  it.each(['yes', 'permissive', 'public', 'YES', ' Permissive '])(
    'accepts access=%p as publicly accessible',
    (access) => {
      expect(evaluateNode(node({ emergency: 'defibrillator', access })).accepted).toBe(true);
    },
  );

  it('accepts emergency=aed, the documented OSM variant', () => {
    expect(evaluateNode(node({ emergency: 'aed', access: 'yes' })).accepted).toBe(true);
  });

  it('never drops a record just because check_date is missing', () => {
    const result = evaluateNode(node(publicDefibrillator), {
      policy: { maxAgeYears: 2 },
      asOf: new Date('2026-01-01'),
    });
    expect(result.accepted).toBe(true);
  });

  it('does not drop on age unless a policy opts in', () => {
    const ancient = { ...publicDefibrillator, check_date: '1999-01-01' };
    expect(evaluateNode(node(ancient), { asOf: new Date('2026-01-01') }).accepted).toBe(true);
  });

  it('drops an explicitly stale record when a threshold is set', () => {
    const stale = { ...publicDefibrillator, check_date: '2010-01-01' };
    expect(
      evaluateNode(node(stale), { policy: { maxAgeYears: 5 }, asOf: new Date('2026-01-01') }),
    ).toEqual({ accepted: false, reason: 'stale' });
  });

  it('keeps a record inside the threshold', () => {
    const recent = { ...publicDefibrillator, check_date: '2023-01-01' };
    expect(
      evaluateNode(node(recent), { policy: { maxAgeYears: 5 }, asOf: new Date('2026-01-01') })
        .accepted,
    ).toBe(true);
  });

  it('treats an unreadable check_date as absent, not as proof of freshness', () => {
    const result = evaluateNode(node({ ...publicDefibrillator, check_date: 'last Tuesday' }), {
      policy: { maxAgeYears: 5 },
      asOf: new Date('2026-01-01'),
    });
    if (!result.accepted) throw new Error('expected the fixture to be accepted');
    expect(result.record.verification).toEqual({ status: 'never-verified' });
  });

  it('keeps the source and coordinates on the accepted record', () => {
    const result = evaluateNode(node(publicDefibrillator));
    if (!result.accepted) throw new Error('expected the fixture to be accepted');
    expect(result.record.id).toBe(42);
    expect(result.record.coordinates).toEqual({ latitude: 51.5074, longitude: -0.1278 });
    expect(result.record.source).toEqual({ dataset: 'osm-fixture-2026-09-01', osmNodeId: 42 });
  });
});

describe('applyQualityGate', () => {
  it('separates accepted records from rejected nodes with their reasons', () => {
    const summary = applyQualityGate([
      node(publicDefibrillator),
      node({ emergency: 'fire_hydrant', access: 'yes' }),
      node({ emergency: 'defibrillator', access: 'no' }),
    ]);

    expect(summary.accepted).toHaveLength(1);
    expect(summary.rejected.map((entry) => entry.reason)).toEqual([
      'not-a-defibrillator',
      'not-publicly-accessible',
    ]);
  });

  it('returns an empty summary for no nodes', () => {
    expect(applyQualityGate([])).toEqual({ accepted: [], rejected: [] });
  });
});

/**
 * The report being filled in.
 *
 * "Current" means the most recently opened report, so closing the app mid-incident does not lose the
 * record and reopening it does not start a second one. A report is only ever removed because the user
 * discarded it.
 */

import Storage from 'expo-sqlite/kv-store';
import { useCallback, useEffect, useState } from 'react';

import type { RecordedLocation } from '@/incident/recorded-location';

import { openReport, recordObservation, type Observation, type Report } from './report';
import { createReportStore } from './store';

const store = createReportStore(Storage);

export function useCurrentReport() {
  const [report, setReport] = useState<Report | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void store.load().then((reports) => {
      if (cancelled) return;
      const latest = [...reports].sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];
      setReport(latest);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const begin = useCallback((location?: RecordedLocation) => {
    const opened = openReport(`report-${Date.now()}`, new Date().toISOString(), location);
    setReport(opened);
    void store.save(opened);
    return opened;
  }, []);

  const record = useCallback(
    (observation: Observation) => {
      if (!report) return;
      const next = recordObservation(report, observation);
      setReport(next);
      void store.save(next);
    },
    [report],
  );

  const discard = useCallback(() => {
    if (!report) return;
    setReport(undefined);
    void store.remove(report.id);
  }, [report]);

  /**
   * Attaches a position that was taken now, carrying the time it was sampled.
   *
   * It is stored as a `RecordedLocation` rather than a live one, so §4.1 rule 1 holds all the way
   * through: a report says when its position was taken, and never presents it as where you are.
   */
  const attachLocation = useCallback(
    (location: RecordedLocation) => {
      if (!report) return;
      const next = { ...report, location };
      setReport(next);
      void store.save(next);
    },
    [report],
  );

  return { report, begin, record, discard, attachLocation };
}

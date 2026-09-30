/**
 * Reports, kept in the app's own storage.
 *
 * One store, shared with the flags and the notes queue, for the same reason: local state should die
 * with the app, and a second mechanism would be a second set of failure modes. Reports are small and
 * few, so a key-value list is enough — this is not a system of record, and §4 says none is wanted.
 */

import type { KeyValueStore } from '@/aed';

import { parseReports, serialiseReports, type Report } from './report';

export const REPORTS_KEY = 'field-kit/reports';

export type ReportStore = {
  load(): Promise<Report[]>;
  /** Upserts by id, so recording an observation is a single write. */
  save(report: Report): Promise<Report[]>;
  remove(id: string): Promise<Report[]>;
};

export function createReportStore(store: KeyValueStore): ReportStore {
  async function load(): Promise<Report[]> {
    return parseReports(await store.getItem(REPORTS_KEY));
  }

  async function saveAll(reports: readonly Report[]): Promise<Report[]> {
    const next = [...reports];
    await store.setItem(REPORTS_KEY, serialiseReports(next));
    return next;
  }

  return {
    load,

    async save(report) {
      const reports = await load();
      return saveAll([...reports.filter((entry) => entry.id !== report.id), report]);
    },

    async remove(id) {
      const reports = await load();
      return saveAll(reports.filter((entry) => entry.id !== id));
    },
  };
}

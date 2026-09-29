/**
 * Loading the bundled defibrillator database.
 *
 * `useSuspense` so the screen renders only once the database is actually open, rather than
 * handing a half-initialised context to a child that would then have to handle it.
 *
 * Two deliberate choices:
 *
 * - The database name carries the dataset date. expo-sqlite copies the bundled asset into
 *   the app's own directory **once**; re-shipping a new dataset under the same name would
 *   leave existing installs reading the old one for ever. Bump the name with the dataset.
 * - `PRAGMA query_only = ON`, so nothing on the device can write to the shipped data.
 *   Flagging lives in its own key-value store (see `flags.ts`), not in here.
 */

import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';

import { toAedRecords, type AedDatasetRow } from './dataset';
import type { AedRecord } from './types';

/** Tied to the dataset in /assets/data — `osm-geofabrik-united-kingdom-260927`. */
const DATABASE_NAME = 'aed-20260927.db';

const SELECT_RECORDS = 'SELECT id, latitude, longitude, verified_on, source_dataset FROM aed';

export function AedDatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      assetSource={{ assetId: require('../../assets/data/aed.db') }}
      onInit={async (database) => {
        await database.execAsync('PRAGMA query_only = ON;');
      }}
      useSuspense>
      {children}
    </SQLiteProvider>
  );
}

export type AedRecordsState =
  { status: 'loading' } | { status: 'ready'; records: AedRecord[] } | { status: 'failed' };

/**
 * Every record in the shipped dataset.
 *
 * The whole table is ~22k rows and a couple of megabytes in memory, which is why proximity
 * is computed by the tested `nearestAeds` rather than reimplemented in SQL.
 */
export function useAedRecords(): AedRecordsState {
  const database = useSQLiteContext();
  const [state, setState] = useState<AedRecordsState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const rows = await database.getAllAsync<AedDatasetRow>(SELECT_RECORDS);
        if (!cancelled) setState({ status: 'ready', records: toAedRecords(rows) });
      } catch {
        if (!cancelled) setState({ status: 'failed' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [database]);

  return state;
}

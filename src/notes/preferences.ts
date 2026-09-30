/**
 * The opt-in for reporting to OpenStreetMap, which is off until someone turns it on.
 *
 * It governs nothing but the *sending* controls: flagging still works, and still hides an entry on
 * this device, without it.
 */

import type { KeyValueStore } from '@/aed';

export const OSM_OPT_IN_KEY = 'field-kit/osm/reports-opted-in';

export type OsmPreferences = {
  isOptedIn(): Promise<boolean>;
  setOptedIn(value: boolean): Promise<boolean>;
};

export function createOsmPreferences(store: KeyValueStore): OsmPreferences {
  return {
    async isOptedIn() {
      // Only an explicit 'true' counts, so a corrupt value cannot opt someone in.
      return (await store.getItem(OSM_OPT_IN_KEY)) === 'true';
    },

    async setOptedIn(value) {
      await store.setItem(OSM_OPT_IN_KEY, value ? 'true' : 'false');
      return value;
    },
  };
}

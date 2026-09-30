/**
 * The region packs, as the screens see them.
 *
 * The catalogue is bundled, so the list is there with no signal even though none of the bytes are.
 * Installed packs are recorded in the key-value store and checked against the filesystem, and the
 * two are kept apart on purpose: a record without a file is a pack that has gone missing, which is a
 * different thing to report than one that was never downloaded.
 */

import { Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import { useCallback, useEffect, useRef, useState } from 'react';

import { canMapRegions } from '@/capabilities/can-map-regions';
import catalogueJson from '../../assets/maps/regions.json';
import { createDevicePackFiles, createPackInstaller, type InstallFailure } from './pack-download';
import { createPackStore, type InstalledPack } from './pack-store';
import { parseRegionsCatalogue, type RegionPack } from './regions';

const catalogue = parseRegionsCatalogue(catalogueJson);
const store = createPackStore(Storage);
const installer = createPackInstaller({ files: createDevicePackFiles(), store });

/** One message per failure, because "something went wrong" tells a user nothing they can act on. */
export const FAILURE_TEXT: Record<InstallFailure, string> = {
  cancelled: 'The download was stopped, and nothing was kept.',
  'no-connection': 'The download did not finish. Check your connection and try again.',
  unavailable:
    'The pack is not where Field Kit expects to find it — it may not have been published yet. Nothing was kept.',
  damaged:
    'What arrived was not the pack it should have been, so it was discarded rather than used. Try again.',
  failed: 'The download failed. Try again.',
};

export type RegionsCapability = 'probing' | 'ready' | 'unsupported';

export function useRegions() {
  const packs = catalogue.packs;
  const [installed, setInstalled] = useState<InstalledPack[]>([]);
  /** Whether each pack's file is actually on disk — the record alone does not promise that. */
  const [present, setPresent] = useState<Record<string, boolean>>({});
  /** Fraction downloaded, or null when the server did not say how big the file is. */
  const [progress, setProgress] = useState<Record<string, number | null>>({});
  const [failure, setFailure] = useState<Record<string, InstallFailure | undefined>>({});
  const [availableBytes, setAvailableBytes] = useState(0);
  const [capability, setCapability] = useState<RegionsCapability>('probing');

  const controllers = useRef(new Map<string, AbortController>());

  const refreshSpace = useCallback(() => {
    setAvailableBytes(Paths.availableDiskSpace);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [records, capable] = await Promise.all([store.load(), canMapRegions(packs)]);

      // Presence is asked per pack, and it is the cheap question — existence and length, no hashing.
      const presence: Record<string, boolean> = {};
      for (const pack of packs) {
        presence[pack.id] = await installer.isPresent(pack);
      }

      if (cancelled) return;

      setInstalled(records);
      setPresent(presence);
      setCapability(capable ? 'ready' : 'unsupported');
      refreshSpace();
    })();

    return () => {
      cancelled = true;
    };
  }, [packs, refreshSpace]);

  const download = useCallback(
    async (pack: RegionPack) => {
      const controller = new AbortController();
      controllers.current.set(pack.id, controller);

      setFailure((current) => ({ ...current, [pack.id]: undefined }));
      setProgress((current) => ({ ...current, [pack.id]: 0 }));

      const outcome = await installer.install(pack, {
        signal: controller.signal,
        onProgress: ({ bytesWritten, totalBytes }) => {
          setProgress((current) => ({
            ...current,
            // A missing `Content-Length` is reported as -1, which is not a fraction of anything.
            [pack.id]: totalBytes > 0 ? bytesWritten / totalBytes : null,
          }));
        },
      });

      controllers.current.delete(pack.id);
      setProgress((current) => {
        const next = { ...current };
        delete next[pack.id];
        return next;
      });

      if (!outcome.ok) {
        // A cancellation is something the user did, not a failure to report back to them.
        if (outcome.reason !== 'cancelled') {
          setFailure((current) => ({ ...current, [pack.id]: outcome.reason }));
        }
        refreshSpace();
        return outcome;
      }

      setInstalled((current) => [
        ...current.filter((entry) => entry.id !== pack.id),
        outcome.installed,
      ]);
      setPresent((current) => ({ ...current, [pack.id]: true }));
      refreshSpace();

      return outcome;
    },
    [refreshSpace],
  );

  const cancel = useCallback((packId: string) => {
    controllers.current.get(packId)?.abort();
  }, []);

  const remove = useCallback(
    async (pack: RegionPack) => {
      await installer.remove(pack.id);
      setInstalled((current) => current.filter((entry) => entry.id !== pack.id));
      setPresent((current) => ({ ...current, [pack.id]: false }));
      setFailure((current) => ({ ...current, [pack.id]: undefined }));
      refreshSpace();
    },
    [refreshSpace],
  );

  const check = useCallback(async (pack: RegionPack) => {
    // The deliberate one: this reads the whole file and compares its md5.
    const intact = await installer.check(pack);
    setPresent((current) => ({ ...current, [pack.id]: intact }));
    return intact;
  }, []);

  /** Packs whose bytes are on disk, which is the only set worth pointing the map at. */
  const usable = packs.filter((pack) => present[pack.id] === true);

  return {
    packs,
    installed,
    present,
    usable,
    progress,
    failure,
    availableBytes,
    capability,
    download,
    cancel,
    remove,
    check,
  };
}

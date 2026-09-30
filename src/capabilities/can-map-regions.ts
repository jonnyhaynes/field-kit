/**
 * Can this device store a region pack?
 *
 * Unlike the compass there is no API that answers this — but unlike the compass it is not a sensor
 * question at all. Both platforms can download a file and both can keep it; the honest question is
 * whether there is **space**, because a pack is tens of megabytes and the device may be full. So the
 * probe is a writable directory plus free space, and it exists so the screen can say a pack will not
 * fit rather than offering a download that fails at 80%.
 *
 * The decision is a pure function, tested directly; the probe is the thin part that reads the device.
 */

import { Paths } from 'expo-file-system';

import { packsDirectory } from '@/maps/paths';
import { hasSpaceForPack, type RegionPack } from '@/maps/regions';

export type RegionStorageProbe = {
  /** Creates the packs directory, or false when it cannot be written. */
  prepare(): Promise<boolean>;
  availableBytes(): number;
};

export function deviceRegionStorage(): RegionStorageProbe {
  return {
    async prepare() {
      try {
        const directory = packsDirectory();
        if (!directory.exists) directory.create({ intermediates: true });
        return true;
      } catch {
        return false;
      }
    },

    availableBytes: () => Paths.availableDiskSpace,
  };
}

export type RegionStorageProblem = 'no-packs' | 'no-space';

/**
 * Why packs cannot be used here, if they cannot.
 *
 * The smallest pack is the test, because that is the one most likely to fit: if even that will not
 * go, the feature is unavailable rather than merely limited.
 */
export function regionStorageProblem(
  availableBytes: number,
  packs: readonly RegionPack[],
): RegionStorageProblem | undefined {
  if (packs.length === 0) return 'no-packs';

  const smallest = packs.reduce((smallestSoFar, pack) =>
    pack.bytes < smallestSoFar.bytes ? pack : smallestSoFar,
  );

  return hasSpaceForPack(availableBytes, smallest) ? undefined : 'no-space';
}

export async function canMapRegions(
  packs: readonly RegionPack[],
  storage: RegionStorageProbe = deviceRegionStorage(),
): Promise<boolean> {
  if (!(await storage.prepare())) return false;

  return regionStorageProblem(storage.availableBytes(), packs) === undefined;
}

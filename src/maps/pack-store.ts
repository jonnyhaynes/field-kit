/**
 * Which packs are installed.
 *
 * A record, not the file: the pack itself is on disk and the bytes are the truth. This says what we
 * put there, so a pack that has gone missing can be told apart from one that was never downloaded —
 * and so a pack cut by an older catalogue can be spotted rather than silently used.
 */

import type { KeyValueStore } from '@/aed';

export type InstalledPack = {
  id: string;
  /** The hash accepted at install time. A catalogue that has moved on will not match it. */
  md5: string;
  bytes: number;
  /** ISO-8601, so the screen can say when it was downloaded. */
  installedAt: string;
};

export const INSTALLED_PACKS_KEY = 'field-kit/maps/packs';

export type PackStore = {
  load(): Promise<InstalledPack[]>;
  record(pack: InstalledPack): Promise<InstalledPack[]>;
  forget(id: string): Promise<InstalledPack[]>;
};

function isInstalledPack(value: unknown): value is InstalledPack {
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as Partial<InstalledPack>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.trim() !== '' &&
    typeof candidate.md5 === 'string' &&
    candidate.md5.trim() !== '' &&
    Number.isFinite(candidate.bytes) &&
    (candidate.bytes as number) > 0 &&
    typeof candidate.installedAt === 'string'
  );
}

/** Unreadable state becomes an empty list rather than an exception, as every store here does. */
export function parseInstalledPacks(raw: string | null | undefined): InstalledPack[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isInstalledPack) : [];
  } catch {
    return [];
  }
}

export function serialiseInstalledPacks(packs: readonly InstalledPack[]): string {
  return JSON.stringify(packs);
}

export function createPackStore(store: KeyValueStore): PackStore {
  async function load(): Promise<InstalledPack[]> {
    return parseInstalledPacks(await store.getItem(INSTALLED_PACKS_KEY));
  }

  async function saveAll(packs: readonly InstalledPack[]): Promise<InstalledPack[]> {
    const next = [...packs];
    await store.setItem(INSTALLED_PACKS_KEY, serialiseInstalledPacks(next));
    return next;
  }

  return {
    load,

    async record(pack) {
      const packs = await load();
      return saveAll([...packs.filter((entry) => entry.id !== pack.id), pack]);
    },

    async forget(id) {
      const packs = await load();
      return saveAll(packs.filter((entry) => entry.id !== id));
    },
  };
}

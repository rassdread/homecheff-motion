/**
 * Persist production snapshots in localStorage (same-browser; no schema migration).
 */

import type {
  StudioProductionSnapshot,
  StudioSnapshotHistory,
  StudioSnapshotHistoryEntry,
} from "@/types/studio-production-snapshot";

const HISTORY_KEY_PREFIX = "hc-studio-snapshot-history-";
const MAX_SNAPSHOTS = 20;

const memoryStore = new Map<string, string>();

function readStorage(key: string): string | null {
  if (typeof window !== "undefined") {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  }
  return memoryStore.get(key) ?? null;
}

function writeStorage(key: string, value: string): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  memoryStore.set(key, value);
}

export function clearSnapshotStorageForTests(storyboardId?: string): void {
  if (storyboardId) {
    memoryStore.delete(snapshotHistoryStorageKey(storyboardId));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(snapshotHistoryStorageKey(storyboardId));
      } catch {
        /* ignore */
      }
    }
    return;
  }
  memoryStore.clear();
}

export function snapshotHistoryStorageKey(storyboardId: string): string {
  return `${HISTORY_KEY_PREFIX}${storyboardId}`;
}

export function emptySnapshotHistory(storyboardId: string): StudioSnapshotHistory {
  return {
    version: 1,
    storyboardId,
    updatedAt: new Date(0).toISOString(),
    snapshots: [],
    entries: [],
  };
}

export function loadSnapshotHistory(storyboardId: string): StudioSnapshotHistory {
  try {
    const raw = readStorage(snapshotHistoryStorageKey(storyboardId));
    if (!raw) {
      return emptySnapshotHistory(storyboardId);
    }
    const parsed = JSON.parse(raw) as StudioSnapshotHistory;
    if (parsed.version !== 1 || !Array.isArray(parsed.snapshots)) {
      return emptySnapshotHistory(storyboardId);
    }
    return {
      version: 1,
      storyboardId,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
      snapshots: parsed.snapshots.filter((snapshot) => snapshot.version === 1),
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.filter(
            (entry): entry is StudioSnapshotHistoryEntry =>
              entry.kind === "snapshot_created" || entry.kind === "snapshot_restored"
          )
        : [],
    };
  } catch {
    return emptySnapshotHistory(storyboardId);
  }
}

function saveSnapshotHistory(history: StudioSnapshotHistory): void {
  writeStorage(snapshotHistoryStorageKey(history.storyboardId), JSON.stringify(history));
}

export function appendSnapshotHistoryEntry(
  storyboardId: string,
  entry: StudioSnapshotHistoryEntry
): StudioSnapshotHistory {
  const history = loadSnapshotHistory(storyboardId);
  history.entries = [entry, ...history.entries].slice(0, MAX_SNAPSHOTS * 2);
  history.updatedAt = entry.at;
  saveSnapshotHistory(history);
  return history;
}

export function saveStudioSnapshot(snapshot: StudioProductionSnapshot): StudioSnapshotHistory {
  const history = loadSnapshotHistory(snapshot.storyboardId);
  history.snapshots = [snapshot, ...history.snapshots.filter((item) => item.id !== snapshot.id)].slice(
    0,
    MAX_SNAPSHOTS
  );
  const createdEntry: StudioSnapshotHistoryEntry = {
    id: `entry-${snapshot.id}`,
    at: snapshot.savedAt,
    kind: "snapshot_created",
    snapshotId: snapshot.id,
    labelKey: snapshot.labelKey,
    labelParams: snapshot.labelParams,
  };
  history.entries = [createdEntry, ...history.entries].slice(0, MAX_SNAPSHOTS * 2);
  history.updatedAt = snapshot.savedAt;
  saveSnapshotHistory(history);
  return history;
}

export function findStudioSnapshot(
  storyboardId: string,
  snapshotId: string
): StudioProductionSnapshot | null {
  const history = loadSnapshotHistory(storyboardId);
  return history.snapshots.find((snapshot) => snapshot.id === snapshotId) ?? null;
}

export function listStudioSnapshots(storyboardId: string): StudioProductionSnapshot[] {
  return loadSnapshotHistory(storyboardId).snapshots;
}

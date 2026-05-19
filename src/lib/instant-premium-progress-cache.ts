import type { InstantPremiumStatusResponse } from "@/types/animation-api";

const ACTIVE_PROJECT_KEY = "hc-instant-progress:activeProjectId";
const SNAPSHOT_PREFIX = "hc-instant-progress:snapshot:";
const COMPLETED_TTL_MS = 24 * 60 * 60 * 1000;

export type CachedInstantProgressSnapshot = {
  projectId: string;
  snapshot: InstantPremiumStatusResponse;
  savedAt: string;
  completedAt?: string;
};

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readActiveInstantProjectId(): string | null {
  if (!storageAvailable()) {
    return null;
  }
  const id = window.localStorage.getItem(ACTIVE_PROJECT_KEY)?.trim();
  return id || null;
}

export function writeActiveInstantProjectId(projectId: string): void {
  if (!storageAvailable() || !projectId.trim()) {
    return;
  }
  window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId.trim());
}

export function readCachedInstantProgressSnapshot(
  projectId: string
): CachedInstantProgressSnapshot | null {
  if (!storageAvailable() || !projectId.trim()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${SNAPSHOT_PREFIX}${projectId.trim()}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedInstantProgressSnapshot;
    if (parsed.projectId !== projectId.trim() || !parsed.snapshot) {
      return null;
    }
    if (parsed.snapshot.status === "completed" && parsed.completedAt) {
      const age = Date.now() - new Date(parsed.completedAt).getTime();
      if (age > COMPLETED_TTL_MS) {
        window.localStorage.removeItem(`${SNAPSHOT_PREFIX}${projectId.trim()}`);
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedInstantProgressSnapshot(
  projectId: string,
  snapshot: InstantPremiumStatusResponse
): void {
  if (!storageAvailable() || !projectId.trim()) {
    return;
  }
  const entry: CachedInstantProgressSnapshot = {
    projectId: projectId.trim(),
    snapshot,
    savedAt: new Date().toISOString(),
    ...(snapshot.status === "completed"
      ? { completedAt: new Date().toISOString() }
      : {}),
  };
  try {
    window.localStorage.setItem(
      `${SNAPSHOT_PREFIX}${projectId.trim()}`,
      JSON.stringify(entry)
    );
    writeActiveInstantProjectId(projectId);
  } catch {
    // quota or private mode — ignore
  }
}

export function resolveInstantProgressProjectId(urlProjectId: string | null | undefined): string {
  const fromUrl = urlProjectId?.trim() ?? "";
  if (fromUrl) {
    return fromUrl;
  }
  return readActiveInstantProjectId() ?? "";
}

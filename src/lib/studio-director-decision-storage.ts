/**
 * Persist director apply audits in localStorage (no schema migration).
 */

import type { StudioDirectorDecisionRegistry } from "@/types/studio-director-decision-memory";

const REGISTRY_KEY_PREFIX = "hc-studio-director-decisions-";
const GLOBAL_KEY = "hc-studio-director-decisions-global";

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
      /* fall through */
    }
  }
  memoryStore.set(key, value);
}

export function clearDirectorDecisionStorageForTests(storyboardId?: string): void {
  if (storyboardId) {
    memoryStore.delete(registryStorageKey(storyboardId));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(registryStorageKey(storyboardId));
      } catch {
        /* ignore */
      }
    }
    return;
  }
  memoryStore.clear();
}

export function registryStorageKey(storyboardId: string): string {
  return `${REGISTRY_KEY_PREFIX}${storyboardId}`;
}

export function emptyDirectorDecisionRegistry(storyboardId: string): StudioDirectorDecisionRegistry {
  return {
    version: 1,
    storyboardId,
    updatedAt: new Date(0).toISOString(),
    audits: [],
    applyBaseline: null,
    pendingProposalId: null,
  };
}

export function loadDirectorDecisionRegistry(storyboardId: string): StudioDirectorDecisionRegistry {
  try {
    const raw = readStorage(registryStorageKey(storyboardId));
    if (!raw) {
      return emptyDirectorDecisionRegistry(storyboardId);
    }
    const parsed = JSON.parse(raw) as StudioDirectorDecisionRegistry;
    if (parsed.version !== 1 || !Array.isArray(parsed.audits)) {
      return emptyDirectorDecisionRegistry(storyboardId);
    }
    return {
      version: 1,
      storyboardId,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
      audits: parsed.audits,
      applyBaseline: parsed.applyBaseline ?? null,
      pendingProposalId: parsed.pendingProposalId ?? null,
    };
  } catch {
    return emptyDirectorDecisionRegistry(storyboardId);
  }
}

export function saveDirectorDecisionRegistry(registry: StudioDirectorDecisionRegistry): void {
  writeStorage(
    registryStorageKey(registry.storyboardId),
    JSON.stringify({ ...registry, updatedAt: new Date().toISOString() })
  );
  appendGlobalAuditIndex(registry.audits.slice(-5));
}

function appendGlobalAuditIndex(recentAudits: StudioDirectorDecisionRegistry["audits"]): void {
  if (recentAudits.length === 0) {
    return;
  }
  try {
    const raw = readStorage(GLOBAL_KEY);
    const existing = raw ? (JSON.parse(raw) as string[]) : [];
    const ids = recentAudits.map((audit) => audit.id);
    const merged = [...ids, ...existing.filter((id) => !ids.includes(id))].slice(0, 100);
    writeStorage(GLOBAL_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
}

export function loadAllDirectorAudits(storyboardId: string): StudioDirectorDecisionRegistry["audits"] {
  return loadDirectorDecisionRegistry(storyboardId).audits;
}

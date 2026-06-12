import { safeSetLocalStorage } from "@/lib/editor-local-storage";
import type { EditorGenerationPackage } from "@/types/editor-generation-package";

export const EDITOR_GENERATION_PACKAGES_KEY = "hc-editor-generation-packages-v1";
export const EDITOR_GENERATION_LIBRARY_KEY = "hc-editor-generation-library-v1";

export type EditorGenerationLibraryRecord = {
  sessionId: string;
  packageId: string;
  workflow: string;
  name: string;
  primaryUrl: string;
  savedAt: string;
  package: EditorGenerationPackage;
};

function readPackageStore(): Record<string, EditorGenerationPackage> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(EDITOR_GENERATION_PACKAGES_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, EditorGenerationPackage>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePackageStore(store: Record<string, EditorGenerationPackage>): void {
  if (typeof window === "undefined") {
    return;
  }
  safeSetLocalStorage(EDITOR_GENERATION_PACKAGES_KEY, JSON.stringify(store));
}

function readLibraryStore(): EditorGenerationLibraryRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(EDITOR_GENERATION_LIBRARY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as EditorGenerationLibraryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLibraryStore(records: EditorGenerationLibraryRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }
  safeSetLocalStorage(EDITOR_GENERATION_LIBRARY_KEY, JSON.stringify(records.slice(0, 100)));
}

export function persistGenerationPackage(pkg: EditorGenerationPackage): EditorGenerationPackage {
  const next = { ...pkg, updatedAt: new Date().toISOString() };
  const store = readPackageStore();
  store[next.id] = next;
  if (next.editorSessionId) {
    store[`session:${next.editorSessionId}`] = next;
  }
  writePackageStore(store);
  return next;
}

export function loadGenerationPackage(packageId: string | null | undefined): EditorGenerationPackage | null {
  const id = packageId?.trim();
  if (!id) {
    return null;
  }
  return readPackageStore()[id] ?? null;
}

export function loadGenerationPackageBySession(sessionId: string | null | undefined): EditorGenerationPackage | null {
  const id = sessionId?.trim();
  if (!id) {
    return null;
  }
  return readPackageStore()[`session:${id}`] ?? null;
}

export function listGenerationLibraryRecords(limit = 50): EditorGenerationLibraryRecord[] {
  return readLibraryStore().slice(0, limit);
}

export function persistGenerationLibraryRecord(record: EditorGenerationLibraryRecord): EditorGenerationLibraryRecord {
  persistGenerationPackage(record.package);
  const next = [record, ...readLibraryStore().filter((r) => r.packageId !== record.packageId)].slice(0, 100);
  writeLibraryStore(next);
  return record;
}

export function loadGenerationLibraryRecord(sessionId: string): EditorGenerationLibraryRecord | null {
  return readLibraryStore().find((r) => r.sessionId === sessionId) ?? null;
}

/** Test-only helpers */
export function __resetGenerationPackageStoresForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(EDITOR_GENERATION_PACKAGES_KEY);
  window.localStorage.removeItem(EDITOR_GENERATION_LIBRARY_KEY);
}

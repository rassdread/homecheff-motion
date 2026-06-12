import { safeSetLocalStorage } from "@/lib/editor-local-storage";
import type { HomeCheffProjectListFilter } from "@/types/homecheff-project-package";
import type { LegacyProjectRegistryEntry } from "@/types/homecheff-legacy-project";
import type { HomeCheffProjectType } from "@/types/homecheff-project-package";

export const LEGACY_PROJECT_REGISTRY_KEY = "hc-legacy-projects-registry-v1";

function readStore(): Record<string, LegacyProjectRegistryEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LEGACY_PROJECT_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LegacyProjectRegistryEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, LegacyProjectRegistryEntry>): void {
  if (typeof window === "undefined") return;
  safeSetLocalStorage(LEGACY_PROJECT_REGISTRY_KEY, JSON.stringify(store));
}

function registryKey(service: HomeCheffProjectType, legacyId: string): string {
  return `${service}:${legacyId}`;
}

export function registerLegacyProject(input: {
  legacyId: string;
  service: HomeCheffProjectType;
  title: string;
  openPath?: string;
  metadata?: Record<string, unknown>;
}): LegacyProjectRegistryEntry {
  const now = new Date().toISOString();
  const key = registryKey(input.service, input.legacyId);
  const store = readStore();
  const existing = store[key];
  const entry: LegacyProjectRegistryEntry = {
    legacyId: input.legacyId,
    service: input.service,
    title: input.title,
    projectFormat: "legacy",
    projectVersion: "legacy",
    isArchived: existing?.isArchived ?? false,
    archivedAt: existing?.archivedAt,
    linkedHcProjectId: existing?.linkedHcProjectId,
    openPath: input.openPath ?? existing?.openPath,
    metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  store[key] = entry;
  writeStore(store);
  return entry;
}

export function getLegacyProjectRegistryEntry(
  service: HomeCheffProjectType,
  legacyId: string
): LegacyProjectRegistryEntry | null {
  return readStore()[registryKey(service, legacyId)] ?? null;
}

export function linkLegacyToHcProject(
  service: HomeCheffProjectType,
  legacyId: string,
  hcProjectId: string
): LegacyProjectRegistryEntry | null {
  const key = registryKey(service, legacyId);
  const store = readStore();
  const entry = store[key];
  if (!entry) return null;
  const next = {
    ...entry,
    linkedHcProjectId: hcProjectId,
    updatedAt: new Date().toISOString(),
  };
  store[key] = next;
  writeStore(store);
  return next;
}

export function archiveLegacyProject(service: HomeCheffProjectType, legacyId: string): LegacyProjectRegistryEntry | null {
  let entry = getLegacyProjectRegistryEntry(service, legacyId);
  if (!entry) {
    entry = registerLegacyProject({ legacyId, service, title: legacyId });
  }
  const key = registryKey(service, legacyId);
  const store = readStore();
  const next: LegacyProjectRegistryEntry = {
    ...entry,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store[key] = next;
  writeStore(store);
  return next;
}

export function restoreLegacyProject(service: HomeCheffProjectType, legacyId: string): LegacyProjectRegistryEntry | null {
  const key = registryKey(service, legacyId);
  const store = readStore();
  const entry = store[key];
  if (!entry) return null;
  const next: LegacyProjectRegistryEntry = {
    ...entry,
    isArchived: false,
    archivedAt: undefined,
    updatedAt: new Date().toISOString(),
  };
  store[key] = next;
  writeStore(store);
  return next;
}

export function listLegacyProjects(filter: HomeCheffProjectListFilter = "active"): LegacyProjectRegistryEntry[] {
  const entries = Object.values(readStore()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  switch (filter) {
    case "archived":
      return entries.filter((e) => e.isArchived);
    case "legacy":
      return entries.filter((e) => !e.isArchived);
    case "active":
      return entries.filter((e) => !e.isArchived);
    default:
      return entries;
  }
}

export function __resetLegacyProjectRegistryForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_PROJECT_REGISTRY_KEY);
}

import { safeSetLocalStorage } from "@/lib/editor-local-storage";
import { hcProjectDuplicateTitle } from "@/lib/hc-project-card-utils";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export const HOMECHEFF_PROJECTS_KEY = "hc-homecheff-projects-v1";

function readStore(): Record<string, HomeCheffProjectPackage> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(HOMECHEFF_PROJECTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, HomeCheffProjectPackage>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, HomeCheffProjectPackage>): void {
  if (typeof window === "undefined") return;
  safeSetLocalStorage(HOMECHEFF_PROJECTS_KEY, JSON.stringify(store));
}

export function persistHomeCheffProject(project: HomeCheffProjectPackage): HomeCheffProjectPackage {
  const next = { ...project, updatedAt: new Date().toISOString() };
  const store = readStore();
  store[next.id] = next;
  writeStore(store);
  return next;
}

export function loadHomeCheffProject(projectId: string): HomeCheffProjectPackage | null {
  return readStore()[projectId] ?? null;
}

export function listHomeCheffProjects(limit = 50): HomeCheffProjectPackage[] {
  return Object.values(readStore())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export function listHomeCheffProjectsFiltered(
  filter: import("@/types/homecheff-project-package").HomeCheffProjectListFilter,
  limit = 50
): HomeCheffProjectPackage[] {
  const all = Object.values(readStore()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  switch (filter) {
    case "archived":
      return all.filter((p) => p.isArchived).slice(0, limit);
    case "hc":
      return all.filter((p) => (p.projectFormat ?? "hc") === "hc" && !p.isArchived).slice(0, limit);
    case "active":
      return all.filter((p) => !p.isArchived).slice(0, limit);
    default:
      return all.slice(0, limit);
  }
}

export function archiveHcProject(projectId: string): HomeCheffProjectPackage | null {
  const project = loadHomeCheffProject(projectId);
  if (!project) return null;
  return persistHomeCheffProject({
    ...project,
    isArchived: true,
    archivedAt: new Date().toISOString(),
  });
}

export function restoreHcProject(projectId: string): HomeCheffProjectPackage | null {
  const project = loadHomeCheffProject(projectId);
  if (!project) return null;
  return persistHomeCheffProject({
    ...project,
    isArchived: false,
    archivedAt: undefined,
  });
}

export function deleteHcProject(projectId: string): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  delete store[projectId];
  writeStore(store);
}

export function duplicateHcProject(projectId: string): HomeCheffProjectPackage | null {
  const project = loadHomeCheffProject(projectId);
  if (!project) return null;
  const now = new Date().toISOString();
  const copy: HomeCheffProjectPackage = {
    ...project,
    id: `hcproj_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    title: hcProjectDuplicateTitle(project.title),
    createdAt: now,
    updatedAt: now,
    legacySource: undefined,
    conversionHistory: [],
  };
  return persistHomeCheffProject(copy);
}

export function __resetHomeCheffProjectsForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HOMECHEFF_PROJECTS_KEY);
}

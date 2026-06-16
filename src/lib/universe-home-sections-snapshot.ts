import { listHomeCheffProjects } from "@/lib/homecheff-project-persist";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

/** Stable empty snapshot — must be the same reference on every getServerSnapshot call. */
export const EMPTY_RECENT_PROJECTS: HomeCheffProjectPackage[] = [];

let cachedRecentProjects: HomeCheffProjectPackage[] = EMPTY_RECENT_PROJECTS;
let cachedRecentProjectsSignature = "";

function buildRecentProjectsSignature(projects: HomeCheffProjectPackage[]): string {
  return projects.map((project) => `${project.id}:${project.updatedAt}`).join("|");
}

function readRecentProjectsSnapshot(): HomeCheffProjectPackage[] {
  const next = listHomeCheffProjects()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 4);
  const signature = buildRecentProjectsSignature(next);
  if (signature === cachedRecentProjectsSignature) {
    return cachedRecentProjects;
  }
  cachedRecentProjects = next;
  cachedRecentProjectsSignature = signature;
  return cachedRecentProjects;
}

export function getRecentProjectsServerSnapshot(): HomeCheffProjectPackage[] {
  return EMPTY_RECENT_PROJECTS;
}

export function getRecentProjectsClientSnapshot(): HomeCheffProjectPackage[] {
  if (typeof window === "undefined") {
    return EMPTY_RECENT_PROJECTS;
  }
  return readRecentProjectsSnapshot();
}

export function subscribeRecentProjects(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function __resetRecentProjectsSnapshotCacheForTests(): void {
  cachedRecentProjects = EMPTY_RECENT_PROJECTS;
  cachedRecentProjectsSignature = "";
}

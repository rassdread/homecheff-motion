import type { HomeCheffProjectListFilter, HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { LegacyProjectRegistryEntry } from "@/types/homecheff-legacy-project";
import { listLegacyProjects } from "@/lib/homecheff-project-legacy-registry";
import { listHomeCheffProjectsFiltered } from "@/lib/homecheff-project-persist";

export type UnifiedProjectListItem =
  | { kind: "hc"; project: HomeCheffProjectPackage }
  | { kind: "legacy"; entry: LegacyProjectRegistryEntry };

export function listUnifiedProjects(filter: HomeCheffProjectListFilter = "active"): UnifiedProjectListItem[] {
  const items: UnifiedProjectListItem[] = [];

  if (filter === "hc" || filter === "active") {
    for (const project of listHomeCheffProjectsFiltered(filter === "active" ? "active" : "hc")) {
      items.push({ kind: "hc", project });
    }
  }

  if (filter === "legacy" || filter === "active") {
    for (const entry of listLegacyProjects(filter === "active" ? "active" : "legacy")) {
      items.push({ kind: "legacy", entry });
    }
  }

  if (filter === "archived") {
    for (const project of listHomeCheffProjectsFiltered("archived")) {
      items.push({ kind: "hc", project });
    }
    for (const entry of listLegacyProjects("archived")) {
      items.push({ kind: "legacy", entry });
    }
  }

  return items.sort((a, b) => {
    const aTime = a.kind === "hc" ? a.project.updatedAt : a.entry.updatedAt;
    const bTime = b.kind === "hc" ? b.project.updatedAt : b.entry.updatedAt;
    return bTime.localeCompare(aTime);
  });
}

import type {
  HomeCheffProjectFormat,
  HomeCheffProjectPackage,
  HomeCheffProjectVersion,
} from "@/types/homecheff-project-package";
import type { LegacyProjectRegistryEntry } from "@/types/homecheff-legacy-project";

export function detectProjectFormat(
  project:
    | Pick<HomeCheffProjectPackage, "projectFormat">
    | LegacyProjectRegistryEntry
): HomeCheffProjectFormat {
  if (project.projectFormat) {
    return project.projectFormat;
  }
  if ("legacyId" in project) {
    return "legacy";
  }
  return "hc";
}

export function detectProjectVersion(
  project: Pick<HomeCheffProjectPackage, "projectVersion" | "version"> | Pick<LegacyProjectRegistryEntry, "projectVersion">
): HomeCheffProjectVersion {
  if ("projectVersion" in project && project.projectVersion !== undefined) {
    return project.projectVersion;
  }
  if ("version" in project && typeof project.version === "number") {
    return project.version;
  }
  return "legacy";
}

export function isHcProject(project: Pick<HomeCheffProjectPackage, "projectFormat">): boolean {
  return detectProjectFormat(project) === "hc";
}

export function isLegacyRegistryEntry(entry: LegacyProjectRegistryEntry): boolean {
  return entry.projectFormat === "legacy";
}

export function shouldUseHcWorkflow(project: Pick<HomeCheffProjectPackage, "projectFormat">): boolean {
  return isHcProject(project);
}

export function shouldUseLegacyWorkflow(
  project: Pick<HomeCheffProjectPackage, "projectFormat"> | LegacyProjectRegistryEntry
): boolean {
  return detectProjectFormat(project) === "legacy";
}

/** Infer format from an opaque project id when only service context is known. */
export function inferFormatFromContext(input: {
  hcProjectId?: string | null;
  legacyService?: string | null;
}): HomeCheffProjectFormat {
  if (input.hcProjectId?.trim()) return "hc";
  if (input.legacyService?.trim()) return "legacy";
  return "legacy";
}

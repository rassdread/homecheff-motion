import { buildHcHandoffUrl, resolveHcProjectOpenRoute } from "@/lib/homecheff-project-package-core";
import { shouldUseHcWorkflow } from "@/lib/homecheff-project-legacy-detect";
import type { HomeCheffProjectPackage, HomeCheffProjectType } from "@/types/homecheff-project-package";
import type { LegacyProjectRegistryEntry } from "@/types/homecheff-legacy-project";

export function resolveLegacyProjectOpenPath(entry: LegacyProjectRegistryEntry): string {
  if (entry.openPath?.trim()) {
    return entry.openPath;
  }
  switch (entry.service) {
    case "motion":
      return `/animate/${encodeURIComponent(entry.legacyId)}`;
    case "publish":
      return `/publish?project=${encodeURIComponent(entry.legacyId)}`;
    case "editor":
      return `/editor/start?session=${encodeURIComponent(entry.legacyId)}`;
    case "studio":
      return `/studio/storyboards/${encodeURIComponent(entry.legacyId)}`;
    default:
      return "/";
  }
}

export function resolveProjectOpenPath(input: {
  hcProject?: HomeCheffProjectPackage | null;
  legacyEntry?: LegacyProjectRegistryEntry | null;
  preferredService?: HomeCheffProjectType;
}): string | null {
  if (input.hcProject && shouldUseHcWorkflow(input.hcProject)) {
    const service = input.preferredService ?? input.hcProject.projectType;
    return buildHcHandoffUrl(input.hcProject.id, service);
  }
  if (input.legacyEntry) {
    return resolveLegacyProjectOpenPath(input.legacyEntry);
  }
  return null;
}

export function resolveHcProjectOpenOptions(project: HomeCheffProjectPackage): Array<{
  service: HomeCheffProjectType;
  href: string;
  labelKey: string;
}> {
  const options: Array<{ service: HomeCheffProjectType; href: string; labelKey: string }> = [];
  const push = (service: HomeCheffProjectType, labelKey: string) => {
    options.push({
      service,
      href: resolveHcProjectOpenRoute(project.id, service),
      labelKey,
    });
  };

  if (project.servicePayload.editor) push("editor", "hcProject.openEditor");
  if (project.servicePayload.motion) push("motion", "hcProject.openMotion");
  if (project.servicePayload.publish) push("publish", "hcProject.openPublish");
  if (project.servicePayload.studio) push("studio", "hcProject.openStudio");

  if (!options.length) {
    push(project.projectType, "hcProject.open");
  }
  return options;
}

export function resolveLegacyProjectOpenOptions(entry: LegacyProjectRegistryEntry): Array<{
  action: "open" | "convert" | "publish" | "archive";
  labelKey: string;
}> {
  return [
    { action: "open", labelKey: "hcLegacy.action.open" },
    { action: "convert", labelKey: "hcLegacy.action.convert" },
    { action: "publish", labelKey: "hcLegacy.action.sendPublish" },
    { action: "archive", labelKey: "hcLegacy.action.archive" },
  ];
}

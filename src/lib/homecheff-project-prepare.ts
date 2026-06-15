import {
  extendHcProjectWithMotionState,
  extendHcProjectWithPublishState,
  extendHcProjectWithStudioState,
} from "@/lib/homecheff-project-handoff";
import { reuseHcProjectForService } from "@/lib/hc-project-lifecycle";
import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import { hydrateEditorDocumentFromHcProject } from "@/lib/homecheff-project-open";
import { persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import type { HomeCheffProjectPackage, HomeCheffProjectType } from "@/types/homecheff-project-package";

export type HcServicePrepareResult = {
  project: HomeCheffProjectPackage;
  prepared: boolean;
  hadExistingState: boolean;
};

function hasServiceState(project: HomeCheffProjectPackage, service: HomeCheffProjectType): boolean {
  return Boolean(project.servicePayload[service as keyof typeof project.servicePayload]);
}

export function prepareHcProjectForMotion(
  project: HomeCheffProjectPackage,
  options: { durationSec?: number } = {}
): HcServicePrepareResult {
  const hadExistingState = hasServiceState(project, "motion");
  if (hadExistingState) {
    return { project, prepared: false, hadExistingState: true };
  }
  const prepared = persistHomeCheffProject(
    reuseHcProjectForService(
      extendHcProjectWithMotionState(project, { durationSec: options.durationSec ?? 5 }),
      "motion"
    )
  );
  return { project: prepared, prepared: true, hadExistingState: false };
}

export function prepareHcProjectForPublish(
  project: HomeCheffProjectPackage,
  options: { publishIntent?: string } = {}
): HcServicePrepareResult {
  const hadExistingState = hasServiceState(project, "publish");
  if (hadExistingState) {
    return { project, prepared: false, hadExistingState: true };
  }
  const prepared = persistHomeCheffProject(
    reuseHcProjectForService(
      extendHcProjectWithPublishState(project, { publishIntent: options.publishIntent }),
      "publish"
    )
  );
  return { project: prepared, prepared: true, hadExistingState: false };
}

export function prepareHcProjectForStudio(
  project: HomeCheffProjectPackage,
  options: { sceneTitle?: string } = {}
): HcServicePrepareResult {
  const hadExistingState = hasServiceState(project, "studio");
  if (hadExistingState) {
    return { project, prepared: false, hadExistingState: true };
  }
  const prepared = persistHomeCheffProject(
    extendHcProjectWithStudioState(project, {
      sceneTitle: options.sceneTitle ?? project.title,
    })
  );
  return { project: prepared, prepared: true, hadExistingState: false };
}

export function prepareHcProjectForEditor(project: HomeCheffProjectPackage): HcServicePrepareResult {
  const hadExistingState = hasServiceState(project, "editor");
  const hydrated = hydrateEditorDocumentFromHcProject(project);
  if (hydrated) {
    const linked = buildHomeCheffProjectFromEditorDocument({
      document: hydrated,
      existing: project,
    });
    const prepared = persistHomeCheffProject(linked);
    return { project: prepared, prepared: !hadExistingState, hadExistingState };
  }
  if (hadExistingState) {
    return { project, prepared: false, hadExistingState: true };
  }
  return { project, prepared: false, hadExistingState: false };
}

export function resolveHcProjectServiceReadiness(
  project: HomeCheffProjectPackage,
  target: HomeCheffProjectType
): { ready: boolean; missingState: boolean } {
  if (target === "library" || target === "export") {
    return { ready: true, missingState: false };
  }
  const ready = hasServiceState(project, target);
  return { ready, missingState: !ready };
}

export function prepareHcProjectForService(
  project: HomeCheffProjectPackage,
  target: HomeCheffProjectType,
  options: { durationSec?: number; publishIntent?: string; sceneTitle?: string } = {}
): HcServicePrepareResult {
  switch (target) {
    case "motion":
      return prepareHcProjectForMotion(project, { durationSec: options.durationSec });
    case "publish":
      return prepareHcProjectForPublish(project, { publishIntent: options.publishIntent });
    case "studio":
      return prepareHcProjectForStudio(project, { sceneTitle: options.sceneTitle });
    case "editor":
      return prepareHcProjectForEditor(project);
    default:
      return { project, prepared: false, hadExistingState: true };
  }
}

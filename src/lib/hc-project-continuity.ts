import { buildHcHandoffUrl } from "@/lib/homecheff-project-package-core";
import { prepareHcProjectForService, resolveHcProjectServiceReadiness } from "@/lib/homecheff-project-prepare";
import { persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import type { HomeCheffProjectPackage, HomeCheffProjectType } from "@/types/homecheff-project-package";

export type HcProjectStage = "collect" | "plan" | "generate" | "publish" | "complete";

export type HcSuggestedNextStep = {
  id: string;
  labelKey: string;
  targetService: HomeCheffProjectType;
};

export function resolveHcProjectStage(project: HomeCheffProjectPackage): HcProjectStage {
  if (project.servicePayload.publish) return "complete";
  if (project.servicePayload.motion) return "publish";
  if (project.servicePayload.studio?.storyboardId || project.workflowState.aiWorkflowV2) return "generate";
  if (project.servicePayload.editor) return "plan";
  return "collect";
}

export function suggestHcProjectNextStep(project: HomeCheffProjectPackage): HcSuggestedNextStep | null {
  const stage = resolveHcProjectStage(project);
  if (stage === "complete") {
    return { id: "export", labelKey: "platform.continuity.next.export", targetService: "library" };
  }
  if (stage === "publish" || project.servicePayload.motion) {
    return { id: "publish", labelKey: "platform.continuity.next.publish", targetService: "publish" };
  }
  if (project.servicePayload.editor && !project.servicePayload.motion) {
    return { id: "motion", labelKey: "platform.continuity.next.motion", targetService: "motion" };
  }
  if (project.servicePayload.studio || project.workflowState.aiWorkflowV2) {
    return { id: "studio", labelKey: "platform.continuity.next.studio", targetService: "studio" };
  }
  return { id: "editor", labelKey: "platform.continuity.next.editor", targetService: "editor" };
}

export function buildHcContinuityHandoffUrl(
  project: HomeCheffProjectPackage,
  target: HomeCheffProjectType
): string {
  const { ready } = resolveHcProjectServiceReadiness(project, target);
  if (ready) {
    return buildHcHandoffUrl(project.id, target);
  }
  return `/projects?hcProject=${encodeURIComponent(project.id)}&prepare=${target}`;
}

export function autoPrepareHcHandoff(
  project: HomeCheffProjectPackage,
  target: HomeCheffProjectType,
  options: { publishIntent?: string; durationSec?: number } = {}
): HomeCheffProjectPackage {
  const { ready } = resolveHcProjectServiceReadiness(project, target);
  if (ready) return project;
  const result = prepareHcProjectForService(project, target, {
    publishIntent: options.publishIntent,
    durationSec: options.durationSec,
  });
  if (result.prepared) {
    return persistHomeCheffProject(result.project);
  }
  return project;
}

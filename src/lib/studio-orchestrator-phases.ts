/**
 * User-facing production phase labels — maps internal HC workflow to Plan/Create/Animate/Finish.
 */

import type { HcWorkflowV2Phase } from "@/lib/hc-workflow-v2";
import type {
  HcOrchestratorState,
  StudioOrchestratorStatus,
  StudioUserPhase,
} from "@/types/studio-video-production";

export const STUDIO_RUN_PHASE_LABEL_KEYS: Record<
  import("@/types/studio-video-production").StudioOrchestratorRunPhase,
  string
> = {
  collecting_assets: "studio.orchestrator.run.collectingAssets",
  analyzing_content: "studio.orchestrator.run.analyzingContent",
  planning_video: "studio.orchestrator.run.planningVideo",
  creating_scenes: "studio.orchestrator.run.creatingScenes",
  rendering_video: "studio.orchestrator.run.renderingVideo",
  merging_video: "studio.orchestrator.run.mergingVideo",
  finalizing_video: "studio.orchestrator.run.finalizingVideo",
  completed: "studio.orchestrator.run.completed",
};

export const STUDIO_PHASE_LABEL_KEYS: Record<StudioUserPhase, string> = {
  collect: "studio.orchestrator.phase.collectAssets",
  analyze: "studio.orchestrator.phase.analyzeContent",
  plan: "studio.orchestrator.phase.planVideo",
  generate: "studio.orchestrator.phase.createScenes",
  finish: "studio.orchestrator.phase.finishVideo",
};

export const STUDIO_STATUS_LABEL_KEYS: Record<StudioOrchestratorStatus, string> = {
  planning: "studio.orchestrator.status.planning",
  generating_assets: "studio.orchestrator.status.generatingAssets",
  preparing_motion: "studio.orchestrator.status.preparingMotion",
  rendering: "studio.orchestrator.status.rendering",
  merging: "studio.orchestrator.status.merging",
  publishing: "studio.orchestrator.status.publishing",
  completed: "studio.orchestrator.status.completed",
  failed: "studio.orchestrator.status.failed",
};

/** Internal HC phase → user-facing phase */
export function mapHcPhaseToUserPhase(hcPhase: HcWorkflowV2Phase): StudioUserPhase {
  switch (hcPhase) {
    case "collect":
    case "inventory":
      return "collect";
    case "analyze":
      return "analyze";
    case "plan":
    case "approve":
      return "plan";
    case "generate":
      return "generate";
    default:
      return "collect";
  }
}

/** User-facing phase → internal subsystem (never shown to user) */
export function mapUserPhaseToInternal(userPhase: StudioUserPhase): string {
  const map: Record<StudioUserPhase, string> = {
    collect: "assets",
    analyze: "director",
    plan: "storyboard",
    generate: "motion",
    finish: "publish",
  };
  return map[userPhase];
}

export function orchestratorStatusFromUserPhase(
  userPhase: StudioUserPhase,
  approved: boolean
): StudioOrchestratorStatus {
  switch (userPhase) {
    case "collect":
    case "analyze":
    case "plan":
      return "planning";
    case "generate":
      return approved ? "rendering" : "generating_assets";
    case "finish":
      return "publishing";
    default:
      return "planning";
  }
}

export function nextUserPhase(current: StudioUserPhase): StudioUserPhase | null {
  const order: StudioUserPhase[] = ["collect", "analyze", "plan", "generate", "finish"];
  const idx = order.indexOf(current);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1]! : null;
}

export function defaultOrchestratorState(): HcOrchestratorState {
  return {
    userPhase: "collect",
    status: "planning",
    completedAt: null,
  };
}

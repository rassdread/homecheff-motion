/**
 * S2G — Unified Finish (Afronden) contracts.
 * Human orchestration over existing engines — no new renderer.
 */

import type { StudioProductionReadiness } from "@/lib/studio-production-stages";
import type { StudioProductionStageId } from "@/lib/studio-production-stages";

export const STUDIO_FINISH_VERSION = "s2g.1" as const;

export type StudioFinishMode =
  | "FREE_LOCAL_VIDEO"
  | "CLOUD_STUDIO_VIDEO"
  | "MOTION_VIDEO"
  | "IMAGE_EXPORT"
  | "HOMECHEFF_ATTACH"
  | "LANGUAGE_EXPORT"
  | "EXISTING_OUTPUT"
  | "RERENDER_VERSION";

export type StudioFinishOrigin =
  | "standalone"
  | "homecheff"
  | "growth"
  | "preset_continue"
  | "quick_video"
  | "advanced_story";

export type StudioFinishSuccessActionId =
  | "download"
  | "use_on_homecheff"
  | "return_growth"
  | "return_homecheff"
  | "continue_editing"
  | "make_variant"
  | "new_version"
  | "continue_in_studio";

export type StudioFinishIntent = {
  version: typeof STUDIO_FINISH_VERSION;
  storyboardId: string;
  motionProjectId?: string | null;
  origin: StudioFinishOrigin;
  returnUrl?: string | null;
  homecheffItemId?: string | null;
  growthLeadId?: string | null;
  hasExistingOutput: boolean;
  hasExistingHomecheffVideo?: boolean;
  desiredMode?: StudioFinishMode | null;
};

export type StudioFinishCostSummary = {
  isFree: boolean;
  /** Approximate credits when paid; null when unknown/free. */
  estimatedCredits: number | null;
  labelKey: string;
};

export type StudioFinishOutputSummary = {
  outputType: "video" | "image" | "none";
  approximateDurationSeconds: number | null;
  sceneCount: number;
  hasSubtitlesIntent: boolean;
  languageHint: string | null;
};

export type StudioFinishPlan = {
  version: typeof STUDIO_FINISH_VERSION;
  mode: StudioFinishMode;
  adapterId: string;
  readiness: StudioProductionReadiness;
  blockingIssues: StudioProductionReadiness["blockingIssues"];
  warnings: StudioProductionReadiness["warnings"];
  cost: StudioFinishCostSummary;
  output: StudioFinishOutputSummary;
  primaryActionKey: string;
  primaryActionEnabled: boolean;
  hasExistingOutput: boolean;
  existingOutputLabelKey: string | null;
  providerCalls: 0;
};

export type StudioFinishSuccessAction = {
  id: StudioFinishSuccessActionId;
  labelKey: string;
  href?: string | null;
  prominence: "primary" | "secondary" | "tertiary";
};

export type StudioFinishProgressStage =
  | "preparing"
  | "visuals"
  | "animation"
  | "audio"
  | "composing"
  | "almost_done"
  | "done"
  | "failed";

export const FINISH_PROGRESS_LABEL_KEYS: Record<StudioFinishProgressStage, string> = {
  preparing: "studio.finish.progress.preparing",
  visuals: "studio.finish.progress.visuals",
  animation: "studio.finish.progress.animation",
  audio: "studio.finish.progress.audio",
  composing: "studio.finish.progress.composing",
  almost_done: "studio.finish.progress.almostDone",
  done: "studio.finish.progress.done",
  failed: "studio.finish.progress.failed",
};

/** Map coarse backend statuses → human progress (no provider names). */
export function mapBackendStatusToFinishProgress(
  status: string | null | undefined
): StudioFinishProgressStage {
  const s = (status ?? "").toLowerCase();
  if (!s || s === "idle" || s === "queued" || s === "pending") return "preparing";
  if (s.includes("fail") || s.includes("error")) return "failed";
  if (s.includes("complete") || s.includes("succeed") || s === "done" || s === "ready") {
    return "done";
  }
  if (s.includes("mux") || s.includes("compos") || s.includes("final") || s.includes("export")) {
    return "composing";
  }
  if (s.includes("audio") || s.includes("voice") || s.includes("mix")) return "audio";
  if (s.includes("vidu") || s.includes("motion") || s.includes("anim")) return "animation";
  if (s.includes("image") || s.includes("scene") || s.includes("generat")) return "visuals";
  if (s.includes("run") || s.includes("process") || s.includes("progress")) return "almost_done";
  return "almost_done";
}

export function stageLinkForFinishIssue(
  stageId: StudioProductionStageId
): { stage: StudioProductionStageId; labelKey: string } {
  switch (stageId) {
    case "visuals":
      return { stage: "visuals", labelKey: "studio.finish.fix.goVisuals" };
    case "entities":
      return { stage: "entities", labelKey: "studio.finish.fix.goEntities" };
    case "sound":
      return { stage: "sound", labelKey: "studio.finish.fix.goSound" };
    case "finish":
      return { stage: "finish", labelKey: "studio.finish.fix.goFinish" };
    case "story":
    default:
      return { stage: "story", labelKey: "studio.finish.fix.goStory" };
  }
}

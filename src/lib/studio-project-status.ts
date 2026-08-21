/**
 * S2H — Pure project status / title / continue resolvers (0 provider calls).
 */

import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type { StudioProductionStageId } from "@/lib/studio-production-stages";
import type {
  StudioProjectHumanStatus,
  StudioProjectHumanType,
  StudioProjectOriginKind,
  StudioProjectRecommendedAction,
  StudioProjectSourceType,
} from "@/types/studio-project-summary";

export type StudioProjectStatusInput = {
  sceneCount: number;
  scenesWithStory: number;
  scenesWithVisual: number;
  hasFinalOutput: boolean;
  /** Storyboard updated after last successful output (when known). */
  editedAfterOutput?: boolean;
  /** Latest attempt failed but older output may still exist. */
  lastAttemptFailed?: boolean;
  isGenerating?: boolean;
  archived?: boolean;
};

export type StudioProjectStatusResult = {
  status: StudioProjectHumanStatus;
  recommendedStage: StudioProductionStageId | null;
  recommendedAction: StudioProjectRecommendedAction;
  hasCurrentOutput: boolean;
  isStale: boolean;
  secondaryWarningKey: string | null;
  providerCalls: 0;
};

export function resolveStudioProjectStatus(
  input: StudioProjectStatusInput
): StudioProjectStatusResult {
  if (input.archived) {
    return {
      status: "archived",
      recommendedStage: null,
      recommendedAction: "open_project",
      hasCurrentOutput: input.hasFinalOutput,
      isStale: false,
      secondaryWarningKey: null,
      providerCalls: 0,
    };
  }

  if (input.isGenerating) {
    return {
      status: "generating",
      recommendedStage: "finish",
      recommendedAction: "open_project",
      hasCurrentOutput: input.hasFinalOutput,
      isStale: false,
      secondaryWarningKey: null,
      providerCalls: 0,
    };
  }

  if (input.hasFinalOutput && input.editedAfterOutput) {
    return {
      status: "needs_update",
      recommendedStage: "finish",
      recommendedAction: "finish",
      hasCurrentOutput: true,
      isStale: true,
      secondaryWarningKey: input.lastAttemptFailed
        ? "studio.projects.warning.lastAttemptFailed"
        : null,
      providerCalls: 0,
    };
  }

  if (input.hasFinalOutput && input.lastAttemptFailed) {
    return {
      status: "needs_update",
      recommendedStage: "finish",
      recommendedAction: "view_video",
      hasCurrentOutput: true,
      isStale: false,
      secondaryWarningKey: "studio.projects.warning.lastAttemptFailed",
      providerCalls: 0,
    };
  }

  if (input.hasFinalOutput) {
    return {
      status: "ready",
      recommendedStage: "finish",
      recommendedAction: "view_video",
      hasCurrentOutput: true,
      isStale: false,
      secondaryWarningKey: null,
      providerCalls: 0,
    };
  }

  if (input.lastAttemptFailed && !input.hasFinalOutput) {
    return {
      status: "failed",
      recommendedStage: "finish",
      recommendedAction: "finish",
      hasCurrentOutput: false,
      isStale: false,
      secondaryWarningKey: null,
      providerCalls: 0,
    };
  }

  if (input.sceneCount === 0 || input.scenesWithStory === 0) {
    return {
      status: "draft",
      recommendedStage: "story",
      recommendedAction: "continue_story",
      hasCurrentOutput: false,
      isStale: false,
      secondaryWarningKey: null,
      providerCalls: 0,
    };
  }

  if (input.scenesWithVisual < input.sceneCount) {
    return {
      status: "in_progress",
      recommendedStage: "visuals",
      recommendedAction: "continue_visuals",
      hasCurrentOutput: false,
      isStale: false,
      secondaryWarningKey: null,
      providerCalls: 0,
    };
  }

  return {
    status: "in_progress",
    recommendedStage: "finish",
    recommendedAction: "finish",
    hasCurrentOutput: false,
    isStale: false,
    secondaryWarningKey: null,
    providerCalls: 0,
  };
}

export function resolveStudioProjectTitle(input: {
  userTitle?: string | null;
  presetDisplayTitle?: string | null;
  homecheffHint?: string | null;
  storyTitle?: string | null;
  fallbackKey?: "new_project" | "untitled_video";
}): string {
  const user = input.userTitle?.trim();
  if (user && !/^untitled/i.test(user) && !/^storyboard\s*#?\d*$/i.test(user)) {
    return user;
  }
  const preset = input.presetDisplayTitle?.trim();
  if (preset) return preset;
  const hc = input.homecheffHint?.trim();
  if (hc) return hc;
  const story = input.storyTitle?.trim();
  if (story) return story;
  if (user) return user;
  return "";
}

export function resolveStudioProjectHumanType(input: {
  sourceType: StudioProjectSourceType;
  sceneCount?: number;
  isInstantOrMotion?: boolean;
  isImageOnly?: boolean;
}): StudioProjectHumanType {
  if (input.isImageOnly || input.sourceType === "image") return "image";
  if (input.sourceType === "storyboard" && (input.sceneCount ?? 0) > 1) return "story";
  if (input.isInstantOrMotion || input.sourceType === "motion") return "animation";
  if (input.sourceType === "storyboard") return "video";
  return "video";
}

export function resolveStudioProjectOrigin(input: {
  homecheffItemId?: string | null;
  growthLeadId?: string | null;
  returnUrl?: string | null;
  hasPresetMeta?: boolean;
  localOnly?: boolean;
}): StudioProjectOriginKind {
  if (input.localOnly) return "local_device";
  if (input.homecheffItemId) return "homecheff";
  if (input.growthLeadId || (input.returnUrl && /growth/i.test(input.returnUrl))) {
    return "growth";
  }
  if (input.hasPresetMeta) return "preset";
  return "standalone";
}

export function resolveStudioProjectContinueHref(input: {
  sourceType: StudioProjectSourceType;
  sourceId: string;
  motionProjectId?: string | null;
  recommendedStage?: StudioProductionStageId | null;
  hasFinalOutput?: boolean;
}): string {
  if (input.sourceType === "storyboard") {
    const stage =
      input.recommendedStage ?? (input.hasFinalOutput ? "finish" : "story");
    return studioWorkspaceHref(input.sourceId, {
      stage,
      continueInStudio: true,
    });
  }
  if (input.sourceType === "motion" || input.motionProjectId) {
    const id = input.motionProjectId ?? input.sourceId;
    return `/videos/${encodeURIComponent(id)}`;
  }
  if (input.sourceType === "local_quick_video") {
    return "/studio/photo-video?resume=1";
  }
  if (input.sourceType === "image") {
    return "/editor/start";
  }
  return "/studio";
}

/** Deterministic sort: lastEditedAt desc, then createdAt desc, then id. */
export function compareStudioProjectSummariesByRecency(
  a: { lastEditedAt: string; createdAt: string; id: string },
  b: { lastEditedAt: string; createdAt: string; id: string }
): number {
  const le = Date.parse(b.lastEditedAt) - Date.parse(a.lastEditedAt);
  if (le !== 0) return le;
  const c = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (c !== 0) return c;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function isMotionProjectGenerating(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return (
    s.includes("generat") ||
    s.includes("render") ||
    s.includes("processing") ||
    s.includes("running") ||
    s.includes("queued") ||
    s === "pending"
  );
}

export function isMotionProjectFailed(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s.includes("fail") || s.includes("error");
}

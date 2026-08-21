/**
 * S2G — Resolve finish plan + success actions. Pure / 0 provider calls.
 */

import {
  resolveStudioProductionReadiness,
  type StudioProductionReadiness,
} from "@/lib/studio-production-stages";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type {
  StudioFinishIntent,
  StudioFinishMode,
  StudioFinishOrigin,
  StudioFinishPlan,
  StudioFinishSuccessAction,
} from "@/types/studio-finish";
import { STUDIO_FINISH_VERSION } from "@/types/studio-finish";

export type ResolveFinishPlanInput = {
  storyboard: Pick<
    StudioStoryboardDetail,
    | "id"
    | "scenes"
    | "voiceEnabled"
    | "musicEnabled"
    | "soundEnabled"
    | "voiceNarrationScript"
    | "voiceLanguage"
  >;
  intent: Omit<StudioFinishIntent, "version" | "storyboardId"> & {
    storyboardId?: string;
  };
  /** Existing completed motion/final when known. */
  hasCompletedFinal?: boolean;
  approximateCredits?: number | null;
};

function resolveMode(input: ResolveFinishPlanInput): {
  mode: StudioFinishMode;
  adapterId: string;
} {
  if (input.intent.origin === "quick_video") {
    return { mode: "FREE_LOCAL_VIDEO", adapterId: "local_quick_video" };
  }
  if (input.hasCompletedFinal && !input.intent.desiredMode) {
    return { mode: "EXISTING_OUTPUT", adapterId: "motion_existing" };
  }
  if (input.intent.desiredMode === "LANGUAGE_EXPORT") {
    return { mode: "LANGUAGE_EXPORT", adapterId: "language_export" };
  }
  if (input.intent.desiredMode === "RERENDER_VERSION" || input.hasCompletedFinal) {
    if (input.intent.desiredMode === "RERENDER_VERSION") {
      return { mode: "RERENDER_VERSION", adapterId: "motion_rerender" };
    }
  }
  if (input.intent.homecheffItemId && input.hasCompletedFinal) {
    return { mode: "HOMECHEFF_ATTACH", adapterId: "homecheff_attach" };
  }
  if (input.intent.motionProjectId || input.intent.origin === "advanced_story") {
    return { mode: "MOTION_VIDEO", adapterId: "motion_cloud" };
  }
  return { mode: "CLOUD_STUDIO_VIDEO", adapterId: "studio_cloud" };
}

function primaryActionKey(mode: StudioFinishMode, hasExisting: boolean): string {
  if (mode === "HOMECHEFF_ATTACH") return "studio.finish.cta.useOnHomecheff";
  if (mode === "LANGUAGE_EXPORT") return "studio.finish.cta.makeLanguage";
  if (mode === "IMAGE_EXPORT") return "studio.finish.cta.saveImage";
  if (hasExisting || mode === "EXISTING_OUTPUT" || mode === "RERENDER_VERSION") {
    return "studio.finish.cta.newVersion";
  }
  return "studio.finish.cta.makeVideo";
}

/**
 * Finish-specific readiness wrapper — reuses S2F engine (no second blocker calc).
 */
export function resolveStudioFinishReadiness(
  storyboard: ResolveFinishPlanInput["storyboard"]
) {
  return resolveStudioProductionReadiness(storyboard);
}

/**
 * Build human finish plan from readiness + origin. Never calls providers.
 */
export function resolveStudioFinishPlan(input: ResolveFinishPlanInput): StudioFinishPlan {
  const readiness: StudioProductionReadiness = resolveStudioProductionReadiness(
    input.storyboard
  );
  const { mode, adapterId } = resolveMode(input);
  const isFree = mode === "FREE_LOCAL_VIDEO";
  const hasExisting = Boolean(input.hasCompletedFinal || input.intent.hasExistingOutput);
  const blocking = readiness.blockingIssues;
  const primaryEnabled = blocking.length === 0;

  const durationSeconds = input.storyboard.scenes.reduce(
    (sum, s) => sum + Math.max(0.5, s.durationSeconds || 5),
    0
  );

  return {
    version: STUDIO_FINISH_VERSION,
    mode,
    adapterId,
    readiness,
    blockingIssues: blocking,
    warnings: readiness.warnings,
    cost: {
      isFree,
      estimatedCredits: isFree ? 0 : (input.approximateCredits ?? null),
      labelKey: isFree ? "studio.finish.cost.free" : "studio.finish.cost.approxCredits",
    },
    output: {
      outputType: mode === "IMAGE_EXPORT" ? "image" : "video",
      approximateDurationSeconds: Math.round(durationSeconds),
      sceneCount: input.storyboard.scenes.length,
      hasSubtitlesIntent: false,
      languageHint: input.storyboard.voiceLanguage || null,
    },
    primaryActionKey: primaryActionKey(mode, hasExisting),
    primaryActionEnabled: primaryEnabled,
    hasExistingOutput: hasExisting,
    existingOutputLabelKey: hasExisting ? "studio.finish.existing.latestVideo" : null,
    providerCalls: 0,
  };
}

export function resolveStudioFinishSuccessActions(input: {
  origin: StudioFinishOrigin;
  returnUrl?: string | null;
  homecheffItemId?: string | null;
  hasExistingHomecheffVideo?: boolean;
  outputType?: "video" | "image";
}): StudioFinishSuccessAction[] {
  const actions: StudioFinishSuccessAction[] = [];

  if (input.origin === "homecheff" || input.homecheffItemId) {
    actions.push({
      id: "use_on_homecheff",
      labelKey: input.hasExistingHomecheffVideo
        ? "studio.finish.success.useNewOnHomecheff"
        : "studio.finish.success.useOnHomecheff",
      prominence: "primary",
    });
    actions.push({
      id: "download",
      labelKey: "studio.finish.success.download",
      prominence: "secondary",
    });
    actions.push({
      id: "return_homecheff",
      labelKey: "studio.finish.success.returnListing",
      href: input.returnUrl ?? null,
      prominence: "tertiary",
    });
    return actions.slice(0, 3);
  }

  if (input.origin === "growth") {
    actions.push({
      id: "download",
      labelKey: "studio.finish.success.download",
      prominence: "primary",
    });
    actions.push({
      id: "return_growth",
      labelKey: "studio.finish.success.returnGrowth",
      href: input.returnUrl ?? null,
      prominence: "secondary",
    });
    actions.push({
      id: "make_variant",
      labelKey: "studio.finish.success.makeVariant",
      prominence: "tertiary",
    });
    return actions.slice(0, 3);
  }

  if (input.origin === "preset_continue") {
    actions.push({
      id: "continue_in_studio",
      labelKey: "studio.finish.success.continueEditing",
      prominence: "primary",
    });
    actions.push({
      id: "download",
      labelKey: "studio.finish.success.download",
      prominence: "secondary",
    });
    actions.push({
      id: "make_variant",
      labelKey: "studio.finish.success.makeVariant",
      prominence: "tertiary",
    });
    return actions.slice(0, 3);
  }

  if (input.outputType === "image") {
    actions.push({
      id: "download",
      labelKey: "studio.finish.success.downloadImage",
      prominence: "primary",
    });
    actions.push({
      id: "continue_editing",
      labelKey: "studio.finish.success.continueEditing",
      prominence: "secondary",
    });
    return actions.slice(0, 3);
  }

  actions.push({
    id: "download",
    labelKey: "studio.finish.success.download",
    prominence: "primary",
  });
  actions.push({
    id: "continue_editing",
    labelKey: "studio.finish.success.continueEditing",
    prominence: "secondary",
  });
  actions.push({
    id: "make_variant",
    labelKey: "studio.finish.success.makeVariant",
    prominence: "tertiary",
  });
  return actions.slice(0, 3);
}

export function inferFinishOrigin(input: {
  homecheffItemId?: string | null;
  growthLeadId?: string | null;
  returnUrl?: string | null;
  lifecycleClass?: string | null;
  isQuickVideo?: boolean;
}): StudioFinishOrigin {
  if (input.isQuickVideo) return "quick_video";
  if (input.homecheffItemId) return "homecheff";
  if (input.growthLeadId || (input.returnUrl && /growth/i.test(input.returnUrl))) {
    return "growth";
  }
  if (input.lifecycleClass && /QUICK|CONTINUE|PRESET/i.test(input.lifecycleClass)) {
    return "preset_continue";
  }
  return "advanced_story";
}

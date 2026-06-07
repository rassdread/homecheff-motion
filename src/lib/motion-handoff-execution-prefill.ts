/**
 * Parses Studio planner metadata from Motion handoff for wizard prefill (no render start).
 */

import {
  isInstantTransitionSeconds,
  normalizeInstantTransitionSeconds,
  type InstantMode,
} from "@/lib/instant-premium-mode-types";
import type {
  MotionHandoffExecutionPrefill,
  MotionHandoffPrefillMissingImage,
  MotionHandoffPrefillWarning,
} from "@/types/motion-handoff-execution-prefill";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

const MODE_LABEL: Record<NonNullable<MotionHandoffExecutionPrefill["executionMode"]>, string> = {
  story_video: "motion.handoff.executionPrefill.mode.storyVideo",
  action_chain: "motion.handoff.executionPrefill.mode.actionChain",
  hybrid: "motion.handoff.executionPrefill.mode.hybrid",
};

const APPROACH_SUMMARY: Record<NonNullable<MotionHandoffExecutionPrefill["executionMode"]>, string> = {
  story_video: "motion.handoff.executionPrefill.approach.storyVideo",
  action_chain: "motion.handoff.executionPrefill.approach.actionChain",
  hybrid: "motion.handoff.executionPrefill.approach.hybrid",
};

function resolveInstantMode(params: {
  executionMode: MotionHandoffExecutionPrefill["executionMode"];
  internalInstantMode?: "story" | "transition";
}): { mode: InstantMode; source: MotionHandoffExecutionPrefill["instantModeSource"] } {
  if (params.executionMode === "action_chain") {
    return { mode: "transition", source: "execution_plan" };
  }
  if (params.executionMode === "story_video" || params.executionMode === "hybrid") {
    return { mode: "story", source: "execution_plan" };
  }
  if (params.internalInstantMode === "transition") {
    return { mode: "transition", source: "render_strategy" };
  }
  return { mode: "story", source: "default" };
}

function buildWarnings(
  payload: MotionHandoffPayload,
  executionMode: MotionHandoffExecutionPrefill["executionMode"]
): MotionHandoffPrefillWarning[] {
  const warnings: MotionHandoffPrefillWarning[] = [];
  const exec = payload.viduExecutionPlan;
  const animation = payload.animationPlan;

  if (exec?.readiness.missingStartEndImages) {
    warnings.push({
      id: "missing-end-images",
      messageKey: "motion.handoff.executionPrefill.warning.missingEndImage",
    });
  }

  if (executionMode === "action_chain" && (exec?.missingRequirementCount ?? 0) > 0) {
    warnings.push({
      id: "action-needs-images",
      messageKey: "motion.handoff.executionPrefill.warning.actionNeedsImages",
    });
  }

  if (exec?.fallbackActive) {
    warnings.push({
      id: "fallback-active",
      messageKey: exec.fallbackReasonKey || "motion.handoff.executionPrefill.warning.fallbackActive",
    });
  }

  if (executionMode === "hybrid") {
    warnings.push({
      id: "hybrid-approach",
      messageKey: "motion.handoff.executionPrefill.warning.hybridUsesStory",
    });
    if (exec?.readiness.unsupportedHybridPieces) {
      warnings.push({
        id: "hybrid-unsupported",
        messageKey: "motion.handoff.executionPrefill.warning.hybridReview",
      });
    }
  }

  if (exec?.fallbackMode === "generate_images_first") {
    warnings.push({
      id: "generate-first",
      messageKey: "motion.handoff.executionPrefill.warning.generateImagesFirst",
    });
  }

  if (animation && animation.missingImageCount > 0) {
    warnings.push({
      id: "animation-missing-images",
      messageKey: "motion.handoff.executionPrefill.warning.missingImagesCount",
      messageParams: { count: String(animation.missingImageCount) },
    });
  }

  return warnings.slice(0, 8);
}

function buildMissingImages(payload: MotionHandoffPayload): MotionHandoffPrefillMissingImage[] {
  const items: MotionHandoffPrefillMissingImage[] = [];
  const animation = payload.animationPlan;

  if (animation) {
    const sceneById = new Map(payload.scenes.map((s) => [s.sceneId, s]));
    for (const scene of animation.scenes) {
      const payloadScene = sceneById.get(scene.sceneId);
      const title = payloadScene?.title.trim() || String(scene.sceneOrder + 1);
      for (const shot of scene.shots.filter((s) => s.missingImage)) {
        items.push({
          id: `missing-${scene.sceneId}-${shot.shotRole}`,
          sceneOrder: scene.sceneOrder,
          sceneTitle: title,
          roleLabelKey:
            shot.requiredImageRole.includes("end")
              ? "motion.handoff.executionPrefill.imageRole.end"
              : shot.requiredImageRole.includes("start")
                ? "motion.handoff.executionPrefill.imageRole.start"
                : "motion.handoff.executionPrefill.imageRole.scene",
        });
      }
    }
  }

  for (const scene of payload.scenes) {
    if (!scene.selectedSceneImageUrl?.trim()) {
      if (!items.some((i) => i.sceneOrder === scene.order)) {
        items.push({
          id: `missing-scene-${scene.sceneId}`,
          sceneOrder: scene.order,
          sceneTitle: scene.title.trim() || String(scene.order + 1),
          roleLabelKey: "motion.handoff.executionPrefill.imageRole.scene",
        });
      }
    }
  }

  return items.slice(0, 10);
}

function deriveTransitionSeconds(payload: MotionHandoffPayload): 3 | 5 | 8 {
  const animation = payload.animationPlan;
  if (!animation || animation.scenes.length === 0) {
    return 5;
  }
  const avg =
    animation.scenes.reduce((sum, s) => sum + s.targetDuration, 0) /
    animation.scenes.length;
  const rounded = Math.round(avg);
  if (isInstantTransitionSeconds(rounded)) {
    return rounded;
  }
  if (rounded <= 4) return 3;
  if (rounded >= 7) return 8;
  return normalizeInstantTransitionSeconds(5);
}

/**
 * Resolve execution prefill from handoff payload. Safe when metadata is absent — falls back to legacy import.
 */
export function resolveMotionHandoffExecutionPrefill(
  payload: MotionHandoffPayload
): MotionHandoffExecutionPrefill {
  const exec = payload.viduExecutionPlan;
  const render = payload.renderStrategyPlan;
  const animation = payload.animationPlan;

  const metadataAvailable = Boolean(exec || render || animation);
  const executionMode = exec?.executionMode ?? null;

  const { mode: instantMode, source: instantModeSource } = resolveInstantMode({
    executionMode,
    internalInstantMode: render?.internalInstantMode,
  });

  const executionModeLabelKey =
    executionMode ? MODE_LABEL[executionMode] : "motion.handoff.executionPrefill.mode.storyVideo";
  const approachSummaryKey =
    executionMode ? APPROACH_SUMMARY[executionMode] : "motion.handoff.executionPrefill.approach.storyVideo";

  const sceneDurations =
    animation?.scenes.map((s) => ({
      sceneId: s.sceneId,
      sceneOrder: s.sceneOrder,
      durationSeconds: s.targetDuration > 0 ? s.targetDuration : 5,
    })) ??
    payload.scenes.map((s) => ({
      sceneId: s.sceneId,
      sceneOrder: s.order,
      durationSeconds: s.durationSeconds > 0 ? s.durationSeconds : 5,
    }));

  const totalDurationSeconds =
    animation?.totalTargetDuration ??
    exec?.estimatedDurationSeconds ??
    sceneDurations.reduce((sum, s) => sum + s.durationSeconds, 0);

  let sceneImagePresentCount = 0;
  let sceneImageMissingCount = 0;
  for (const scene of payload.scenes) {
    if (scene.selectedSceneImageUrl?.trim()) {
      sceneImagePresentCount += 1;
    } else {
      sceneImageMissingCount += 1;
    }
  }

  return {
    metadataAvailable,
    instantMode,
    instantModeSource,
    executionMode,
    executionModeLabelKey,
    approachSummaryKey,
    warnings: buildWarnings(payload, executionMode),
    missingImages: buildMissingImages(payload),
    sceneDurations,
    totalDurationSeconds,
    transitionSeconds: deriveTransitionSeconds(payload),
    readyToRender: exec?.readyToRender ?? sceneImageMissingCount === 0,
    fallbackActive: exec?.fallbackActive ?? false,
    fallbackLabelKey:
      exec?.fallbackActive ? exec.fallbackReasonKey ?? "studio.executionPlan.fallback.title" : null,
    usesMultipleSteps: exec?.usesMultipleSteps ?? false,
    audioMixReady: exec?.audioMixReady ?? Boolean(payload.audioMixPlan?.mixReady),
    sceneImagePresentCount,
    sceneImageMissingCount,
  };
}

export function toMotionHandoffExecutionPrefillSummary(
  prefill: MotionHandoffExecutionPrefill
): import("@/types/motion-handoff-execution-prefill").MotionHandoffExecutionPrefillSummary {
  return {
    executionModeLabelKey: prefill.executionModeLabelKey,
    instantMode: prefill.instantMode,
    readyToRender: prefill.readyToRender,
    fallbackActive: prefill.fallbackActive,
    fallbackLabelKey: prefill.fallbackLabelKey,
    warningCount: prefill.warnings.length,
    missingImageCount: prefill.missingImages.length,
    totalDurationSeconds: prefill.totalDurationSeconds,
    usesMultipleSteps: prefill.usesMultipleSteps,
    confirmedAt: new Date().toISOString(),
  };
}

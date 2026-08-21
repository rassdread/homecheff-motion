/**
 * S2C — Build StudioPresetProductionContext from existing preset/wizard inputs.
 * Pure bridge — no provider calls, no DB.
 */

import { createHash } from "node:crypto";
import { getProductExperience } from "@/lib/studio-creative-director/product-experience-registry";
import { isStudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import { getMotionActionPreset } from "@/lib/motion-action-presets";
import { resolveMotionPresetStoryboard } from "@/lib/motion-preset-storyboards";
import { fusionIntentDefinition } from "@/lib/editor-image-fusion-catalog";
import { classifyPresetSource } from "@/lib/studio-preset-lifecycle";
import {
  mapFusionWizardToTransformationIntent,
  mapMotionPresetToTransformationIntent,
  mapProductExperienceToTransformationIntent,
  type TransformationSlotInput,
} from "@/lib/studio-image-transformation-map";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import {
  PRESET_PRODUCTION_CONTEXT_VERSION,
  type StudioPresetAudioHints,
  type StudioPresetOrigin,
  type StudioPresetProductionContext,
  type StudioPresetRoleTaggedAsset,
  type StudioPresetScenePlanBeat,
  type StudioPresetSourceType,
} from "@/types/studio-preset-production-context";

export type BuildPresetProductionContextInput = {
  sourceType: StudioPresetSourceType;
  sourceId: string;
  displayTitle?: string | null;
  userIntent?: string | null;
  assets?: StudioPresetRoleTaggedAsset[];
  returnUrl?: string | null;
  homecheffItemId?: string | null;
  homecheffItemType?: string | null;
  growthLeadId?: string | null;
  sourceQuickProjectId?: string | null;
  styleHints?: string[];
  worldHints?: string[];
  motionHints?: string[];
  audioHints?: StudioPresetAudioHints;
};

function fingerprint(parts: string[]): string {
  return createHash("sha256").update(parts.filter(Boolean).join("|")).digest("hex").slice(0, 32);
}

function assetsToSlots(assets: StudioPresetRoleTaggedAsset[]): TransformationSlotInput[] {
  return assets
    .filter((a) => a.role !== "result_still" && a.role !== "result_video")
    .map((a) => ({
      slotId: a.assetId ?? a.role,
      role: a.role,
      url: a.url ?? undefined,
      assetId: a.assetId ?? undefined,
      required: Boolean(a.required),
    }));
}

function redCarpetAudioHints(): StudioPresetAudioHints {
  return {
    musicMood: "luxury glamorous",
    sfxSuggestions: ["camera_flash", "crowd_ambience"],
    subtitleIntent: null,
  };
}

function scenePlanFromMotionPreset(presetId: string): StudioPresetScenePlanBeat[] {
  try {
    const board = resolveMotionPresetStoryboard(presetId as MotionActionPresetId);
    return board.scenes.map((s) => ({
      order: s.sceneIndex - 1,
      title: s.title,
      action: s.motion,
      camera: s.camera,
      emotion: s.expression,
      durationSeconds: 4,
      audioHints:
        presetId === "red_carpet_moment"
          ? { sfx: ["camera_flash"], musicMood: "luxury" }
          : undefined,
    }));
  } catch {
    return [
      {
        order: 0,
        title: "Scene 1",
        action: presetId.replace(/_/g, " "),
        durationSeconds: 5,
      },
    ];
  }
}

export function buildPresetProductionContext(
  input: BuildPresetProductionContextInput
): StudioPresetProductionContext {
  const classification = classifyPresetSource({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
  });

  const assets = input.assets ?? [];
  const origin: StudioPresetOrigin = {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    experienceId:
      input.sourceType === "EXPERIENCE_PACK" ? input.sourceId : null,
    presetId: input.sourceType === "MOTION_PRESET" ? input.sourceId : null,
    wizardId: input.sourceType === "FUSION_WIZARD" ? input.sourceId : null,
    morphId: input.sourceType === "MORPH_ACTION" ? input.sourceId : null,
    sourceQuickProjectId: input.sourceQuickProjectId ?? null,
    returnUrl: input.returnUrl ?? null,
    homecheffItemId: input.homecheffItemId ?? null,
    homecheffItemType: input.homecheffItemType ?? null,
    growthLeadId: input.growthLeadId ?? null,
  };

  let displayTitle = input.displayTitle?.trim() || input.sourceId;
  let styleHints = [...(input.styleHints ?? [])];
  let worldHints = [...(input.worldHints ?? [])];
  let motionHints = [...(input.motionHints ?? [])];
  let audioHints: StudioPresetAudioHints = { ...(input.audioHints ?? {}) };
  let scenePlan: StudioPresetScenePlanBeat[] = [];
  let transformationIntent = null as StudioPresetProductionContext["transformationIntent"];

  const slots = assetsToSlots(assets);

  if (input.sourceType === "EXPERIENCE_PACK" && isStudioProductExperienceId(input.sourceId)) {
    const entry = getProductExperience(input.sourceId);
    displayTitle = input.displayTitle?.trim() || entry.label;
    styleHints = styleHints.length ? styleHints : [entry.creativeGoal];
    try {
      transformationIntent = mapProductExperienceToTransformationIntent({
        experienceId: input.sourceId,
        slots,
      });
    } catch {
      transformationIntent = null;
    }
    if (input.sourceId === "PEOPLE_RED_CARPET" || input.sourceId === "PEOPLE_CELEBRITY") {
      audioHints = { ...redCarpetAudioHints(), ...audioHints };
      scenePlan = scenePlanFromMotionPreset("red_carpet_moment");
      motionHints = motionHints.length ? motionHints : ["red_carpet_walk", "paparazzi_pause"];
    }
    if (classification.lifecycleClass === "ADVANCED_STORY" || classification.lifecycleClass === "CANONICAL_MULTI_SCENE") {
      if (scenePlan.length === 0) {
        scenePlan = [
          { order: 0, title: "Opening", action: entry.creativeGoal, durationSeconds: 5 },
          { order: 1, title: "Development", action: entry.creativeGoal, durationSeconds: 5 },
          { order: 2, title: "Closing", action: entry.creativeGoal, durationSeconds: 5 },
        ];
      }
    } else if (
      classification.lifecycleClass === "CANONICAL_SINGLE_SCENE" ||
      classification.lifecycleClass === "IMAGE_ONLY" ||
      classification.materializationMode === "SINGLE_SCENE_NOW" ||
      classification.materializationMode === "DEFERRED_CONTINUE"
    ) {
      if (scenePlan.length === 0) {
        scenePlan = [
          {
            order: 0,
            title: displayTitle,
            action: entry.creativeGoal,
            durationSeconds: 5,
          },
        ];
      }
    }
  } else if (input.sourceType === "MOTION_PRESET") {
    const preset = getMotionActionPreset(input.sourceId as MotionActionPresetId);
    displayTitle = input.displayTitle?.trim() || preset?.id?.replace(/_/g, " ") || input.sourceId;
    styleHints = styleHints.length ? styleHints : [preset?.styleSettings.visualStyle ?? "cinematic"].filter(Boolean) as string[];
    worldHints = worldHints.length ? worldHints : [preset?.sceneSettings.environment ?? ""].filter(Boolean);
    motionHints = motionHints.length ? motionHints : [input.sourceId];
    scenePlan = scenePlanFromMotionPreset(input.sourceId);
    if (input.sourceId === "red_carpet_moment") {
      audioHints = { ...redCarpetAudioHints(), ...audioHints };
    }
    try {
      transformationIntent = mapMotionPresetToTransformationIntent({
        presetId: input.sourceId as MotionActionPresetId,
        slots,
      });
    } catch {
      transformationIntent = null;
    }
  } else if (input.sourceType === "FUSION_WIZARD") {
    const def = fusionIntentDefinition(input.sourceId as EditorFusionIntent);
    displayTitle = input.displayTitle?.trim() || input.sourceId.replace(/_/g, " ");
    scenePlan = [
      {
        order: 0,
        title: displayTitle,
        action: def?.id ?? input.sourceId,
        durationSeconds: 5,
      },
    ];
    try {
      transformationIntent = mapFusionWizardToTransformationIntent({
        intentId: input.sourceId as EditorFusionIntent,
        slots,
      });
    } catch {
      transformationIntent = null;
    }
  } else {
    scenePlan = [
      {
        order: 0,
        title: displayTitle,
        action: input.userIntent ?? input.sourceId,
        durationSeconds: 5,
      },
    ];
  }

  const assetFingerprints = assets.map(
    (a) => `${a.role}:${a.assetId ?? ""}:${a.pointer ?? ""}`
  );
  const idempotencyKey = fingerprint([
    input.sourceType,
    input.sourceId,
    input.sourceQuickProjectId ?? "",
    input.homecheffItemId ?? "",
    ...assetFingerprints,
  ]);

  return {
    version: PRESET_PRODUCTION_CONTEXT_VERSION,
    origin,
    lifecycleClass: classification.lifecycleClass,
    materializationMode: classification.materializationMode,
    continuationSupported: classification.continuationSupported,
    displayTitle,
    userIntent: input.userIntent ?? null,
    styleHints,
    worldHints,
    assets,
    transformationIntent,
    scenePlan,
    motionHints,
    audioHints,
    idempotencyKey,
  };
}

export function shouldMaterializeNow(context: StudioPresetProductionContext): boolean {
  return (
    context.materializationMode === "SINGLE_SCENE_NOW" ||
    context.materializationMode === "MULTI_SCENE_NOW" ||
    context.materializationMode === "STORY_NOW"
  );
}

export function continuationSupported(context: StudioPresetProductionContext): boolean {
  return context.continuationSupported && context.lifecycleClass !== "BLOCKED";
}

export function studioWorkspaceHrefForStoryboard(storyboardId: string): string {
  return `/studio?storyboardId=${encodeURIComponent(storyboardId)}`;
}

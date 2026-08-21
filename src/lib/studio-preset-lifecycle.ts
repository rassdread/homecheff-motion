/**
 * S2C — Lifecycle classification for Experience Packs, motion presets, Fusion wizards, morphs.
 * Registry-driven rules — no per-row hardcoding explosion.
 */

import { getProductExperience } from "@/lib/studio-creative-director/product-experience-registry";
import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import { STUDIO_PRODUCT_EXPERIENCE_IDS } from "@/lib/studio-creative-director/product-experience-ids";
import { getAllMotionActionPresets } from "@/lib/motion-action-presets";
import { EDITOR_FUSION_INTENT_DEFINITIONS } from "@/lib/editor-image-fusion-catalog";
import { EDITOR_MORPH_ACTION_IDS } from "@/lib/editor-morph-actions";
import type {
  StudioPresetCoverageRow,
  StudioPresetCoverageStatus,
  StudioPresetLifecycleClass,
  StudioPresetMaterializationMode,
  StudioPresetSourceType,
} from "@/types/studio-preset-production-context";

const KEY_MOTION_STORYBOARD_PRESETS = new Set<string>([
  "moonwalk",
  "penalty_kick",
  "goal_celebration",
  "red_carpet_moment",
  "podcast_clip",
  "product_launch",
  "mascot_commercial",
]);

function hasKeyMotionStoryboard(presetId: string): boolean {
  return KEY_MOTION_STORYBOARD_PRESETS.has(presetId);
}

export type LifecycleClassification = {
  lifecycleClass: StudioPresetLifecycleClass;
  materializationMode: StudioPresetMaterializationMode;
  continuationSupported: boolean;
  canonicalProject: boolean;
  reason: string;
};

function modesFor(
  lifecycleClass: StudioPresetLifecycleClass
): Pick<LifecycleClassification, "materializationMode" | "continuationSupported" | "canonicalProject"> {
  switch (lifecycleClass) {
    case "QUICK_ONE_SHOT":
      return { materializationMode: "NONE", continuationSupported: false, canonicalProject: false };
    case "QUICK_WITH_CONTINUE":
      return {
        materializationMode: "DEFERRED_CONTINUE",
        continuationSupported: true,
        canonicalProject: false,
      };
    case "CANONICAL_SINGLE_SCENE":
      return {
        materializationMode: "SINGLE_SCENE_NOW",
        continuationSupported: true,
        canonicalProject: true,
      };
    case "CANONICAL_MULTI_SCENE":
      return {
        materializationMode: "MULTI_SCENE_NOW",
        continuationSupported: true,
        canonicalProject: true,
      };
    case "ADVANCED_STORY":
      return {
        materializationMode: "STORY_NOW",
        continuationSupported: true,
        canonicalProject: true,
      };
    case "MOTION_ONLY":
      return {
        materializationMode: "DEFERRED_CONTINUE",
        continuationSupported: true,
        canonicalProject: false,
      };
    case "IMAGE_ONLY":
      return {
        materializationMode: "DEFERRED_CONTINUE",
        continuationSupported: true,
        canonicalProject: false,
      };
    case "LEGACY":
      return {
        materializationMode: "LINK_RESULT_ONLY",
        continuationSupported: false,
        canonicalProject: false,
      };
    case "BLOCKED":
    case "MISSING_INPUT":
      return { materializationMode: "NONE", continuationSupported: false, canonicalProject: false };
  }
}

export function classifyExperiencePackLifecycle(
  experienceId: StudioProductExperienceId
): LifecycleClassification {
  const entry = getProductExperience(experienceId);
  const family = entry.family;
  const strategy = entry.generationStrategy;

  let lifecycleClass: StudioPresetLifecycleClass = "QUICK_WITH_CONTINUE";

  if (entry.status === "MISSING") {
    lifecycleClass = "BLOCKED";
  } else if (family === "CREATIVE") {
    if (
      experienceId === "CREATIVE_STORYBOARD" ||
      experienceId === "CREATIVE_FILM" ||
      experienceId === "CREATIVE_DOCUMENTARY" ||
      experienceId === "CREATIVE_MUSIC_VIDEO" ||
      experienceId === "CREATIVE_TRAVEL_VLOG" ||
      experienceId === "CREATIVE_EVENT_VIDEO"
    ) {
      lifecycleClass = "ADVANCED_STORY";
    } else if (experienceId === "CREATIVE_ANIMATION") {
      lifecycleClass = "MOTION_ONLY";
    } else {
      lifecycleClass = "CANONICAL_MULTI_SCENE";
    }
  } else if (family === "BUSINESS") {
    if (experienceId === "BUSINESS_LOGO_PLACEMENT") {
      lifecycleClass = "IMAGE_ONLY";
    } else if (
      experienceId === "BUSINESS_PRODUCT" ||
      experienceId === "BUSINESS_COMMERCIAL" ||
      experienceId === "BUSINESS_ADVERTISEMENT" ||
      experienceId === "BUSINESS_BRANDING" ||
      experienceId === "BUSINESS_RESTAURANT" ||
      experienceId === "BUSINESS_COOKING_SHOW"
    ) {
      lifecycleClass = "CANONICAL_SINGLE_SCENE";
    } else {
      lifecycleClass = "QUICK_WITH_CONTINUE";
    }
  } else if (family === "IDENTITY") {
    if (experienceId === "IDENTITY_OUTFIT" || experienceId === "IDENTITY_PERSON_BACKGROUND") {
      lifecycleClass = "IMAGE_ONLY";
    } else if (experienceId === "IDENTITY_CHARACTER" || experienceId === "IDENTITY_MOTION_READY") {
      lifecycleClass = "CANONICAL_SINGLE_SCENE";
    } else {
      lifecycleClass = "QUICK_WITH_CONTINUE";
    }
  } else if (family === "PEOPLE") {
    if (experienceId === "PEOPLE_RED_CARPET" || experienceId === "PEOPLE_CELEBRITY") {
      lifecycleClass = "QUICK_WITH_CONTINUE";
    } else if (
      experienceId === "PEOPLE_LINKEDIN_PHOTO" ||
      experienceId === "PEOPLE_CV_PHOTO" ||
      experienceId === "PEOPLE_DATING_PROFILE"
    ) {
      lifecycleClass = "IMAGE_ONLY";
    } else {
      lifecycleClass = "QUICK_WITH_CONTINUE";
    }
  } else if (family === "SOCIAL") {
    lifecycleClass = "QUICK_ONE_SHOT";
  }

  // Strategy overrides for multi-scene pipelines
  if (
    lifecycleClass !== "BLOCKED" &&
    (strategy.includes("movie_builder") || strategy.includes("scene_stills_then_motion"))
  ) {
    if (family === "CREATIVE") {
      lifecycleClass = "ADVANCED_STORY";
    }
  }

  const modes = modesFor(lifecycleClass);
  return {
    lifecycleClass,
    ...modes,
    reason: `${family}/${strategy}/${entry.matrixExperienceId}`,
  };
}

export function classifyMotionPresetLifecycle(presetId: string): LifecycleClassification {
  const hasTemplate = hasKeyMotionStoryboard(presetId);
  let lifecycleClass: StudioPresetLifecycleClass = "MOTION_ONLY";
  if (presetId === "red_carpet_moment" || presetId === "luxury_entrance") {
    lifecycleClass = "QUICK_WITH_CONTINUE";
  } else if (hasTemplate && (presetId === "product_launch" || presetId === "mascot_commercial" || presetId === "podcast_clip")) {
    lifecycleClass = "CANONICAL_MULTI_SCENE";
  }
  const modes = modesFor(lifecycleClass);
  return {
    lifecycleClass,
    ...modes,
    reason: hasTemplate ? "motion_preset_with_template" : "motion_preset_one_shot",
  };
}

export function classifyFusionWizardLifecycle(intentId: string): LifecycleClassification {
  let lifecycleClass: StudioPresetLifecycleClass = "IMAGE_ONLY";
  if (intentId === "outfit_from_reference" || intentId === "person_outfit") {
    lifecycleClass = "IMAGE_ONLY";
  } else if (intentId === "person_background") {
    lifecycleClass = "IMAGE_ONLY";
  } else if (intentId === "product_branding" || intentId === "product_environment") {
    lifecycleClass = "IMAGE_ONLY";
  } else if (intentId.includes("character") || intentId.includes("fusion")) {
    lifecycleClass = "QUICK_WITH_CONTINUE";
  }
  const modes = modesFor(lifecycleClass);
  return {
    lifecycleClass,
    ...modes,
    reason: `fusion:${intentId}`,
  };
}

export function classifyMorphActionLifecycle(morphId: string): LifecycleClassification {
  const lifecycleClass: StudioPresetLifecycleClass =
    morphId === "outfit_change" || morphId === "expression_change" || morphId === "pose_change"
      ? "IMAGE_ONLY"
      : "QUICK_ONE_SHOT";
  const modes = modesFor(lifecycleClass);
  return {
    lifecycleClass,
    ...modes,
    reason: `morph:${morphId}`,
  };
}

export function classifyPresetSource(input: {
  sourceType: StudioPresetSourceType;
  sourceId: string;
}): LifecycleClassification {
  switch (input.sourceType) {
    case "EXPERIENCE_PACK":
      return classifyExperiencePackLifecycle(input.sourceId as StudioProductExperienceId);
    case "MOTION_PRESET":
      return classifyMotionPresetLifecycle(input.sourceId);
    case "FUSION_WIZARD":
      return classifyFusionWizardLifecycle(input.sourceId);
    case "MORPH_ACTION":
      return classifyMorphActionLifecycle(input.sourceId);
    case "CHARACTER_STUDIO":
      return {
        lifecycleClass: "CANONICAL_SINGLE_SCENE",
        ...modesFor("CANONICAL_SINGLE_SCENE"),
        reason: "character_studio",
      };
    case "DIRECTOR":
      return {
        lifecycleClass: "ADVANCED_STORY",
        ...modesFor("ADVANCED_STORY"),
        reason: "director",
      };
    case "HOMECHEFF":
      return {
        lifecycleClass: "QUICK_WITH_CONTINUE",
        ...modesFor("QUICK_WITH_CONTINUE"),
        reason: "homecheff_context",
      };
    case "LEGACY":
      return {
        lifecycleClass: "LEGACY",
        ...modesFor("LEGACY"),
        reason: "legacy",
      };
  }
}

function coverageStatusFor(
  classification: LifecycleClassification
): StudioPresetCoverageStatus {
  switch (classification.lifecycleClass) {
    case "ADVANCED_STORY":
      return "FULLY_CANONICAL";
    case "CANONICAL_MULTI_SCENE":
      return "CANONICAL_MULTI_SCENE";
    case "CANONICAL_SINGLE_SCENE":
      return "CANONICAL_SINGLE_SCENE";
    case "QUICK_WITH_CONTINUE":
    case "MOTION_ONLY":
    case "IMAGE_ONLY":
      return classification.continuationSupported
        ? "QUICK_WITH_CANONICAL_CONTINUE"
        : "QUICK_ONE_SHOT_VALID";
    case "QUICK_ONE_SHOT":
      return "QUICK_ONE_SHOT_VALID";
    case "LEGACY":
      return "LEGACY_SUPPORTED";
    case "MISSING_INPUT":
      return "MISSING_INPUT";
    case "BLOCKED":
      return "BLOCKED";
  }
}

export function buildPresetLifecycleCoverageMatrix(): StudioPresetCoverageRow[] {
  const rows: StudioPresetCoverageRow[] = [];

  for (const id of STUDIO_PRODUCT_EXPERIENCE_IDS) {
    const entry = getProductExperience(id);
    const c = classifyExperiencePackLifecycle(id);
    rows.push({
      id: `experience:${id}`,
      displayName: entry.label,
      sourceType: "EXPERIENCE_PACK",
      family: entry.family,
      currentRoute: `/studio/experience?experience=${id}`,
      currentResultType: entry.providerCapabilities.join("+") || "unknown",
      lifecycleClass: c.lifecycleClass,
      canonicalProject: c.canonicalProject,
      continueSupported: c.continuationSupported,
      materializationMode: c.materializationMode,
      entityCreation: c.canonicalProject || c.continuationSupported ? "on_materialize" : "none",
      sceneCreation: c.materializationMode.includes("SCENE") || c.materializationMode === "STORY_NOW" ? "yes" : "deferred",
      transformationIntentPreserved: true,
      upcReady: c.canonicalProject || c.continuationSupported,
      audioHintsPreserved: true,
      status: coverageStatusFor(c),
      nextGap: c.lifecycleClass === "BLOCKED" ? "pack_missing" : null,
    });
  }

  for (const preset of getAllMotionActionPresets()) {
    const c = classifyMotionPresetLifecycle(preset.id);
    rows.push({
      id: `motion:${preset.id}`,
      displayName: preset.id,
      sourceType: "MOTION_PRESET",
      family: preset.category ?? "motion",
      currentRoute: `/animate/instant?preset=${preset.id}`,
      currentResultType: "vidu_motion",
      lifecycleClass: c.lifecycleClass,
      canonicalProject: c.canonicalProject,
      continueSupported: c.continuationSupported,
      materializationMode: c.materializationMode,
      entityCreation: c.continuationSupported ? "on_continue" : "none",
      sceneCreation: hasKeyMotionStoryboard(preset.id) ? "template" : "none",
      transformationIntentPreserved: true,
      upcReady: c.continuationSupported,
      audioHintsPreserved: true,
      status: coverageStatusFor(c),
      nextGap: null,
    });
  }

  for (const def of EDITOR_FUSION_INTENT_DEFINITIONS) {
    const c = classifyFusionWizardLifecycle(def.id);
    rows.push({
      id: `fusion:${def.id}`,
      displayName: def.id,
      sourceType: "FUSION_WIZARD",
      family: def.category,
      currentRoute: `/editor/start?workflow=${def.id}`,
      currentResultType: "openai_image",
      lifecycleClass: c.lifecycleClass,
      canonicalProject: c.canonicalProject,
      continueSupported: c.continuationSupported,
      materializationMode: c.materializationMode,
      entityCreation: "on_continue",
      sceneCreation: "single_optional",
      transformationIntentPreserved: true,
      upcReady: true,
      audioHintsPreserved: false,
      status: coverageStatusFor(c),
      nextGap: null,
    });
  }

  for (const morphId of EDITOR_MORPH_ACTION_IDS) {
    const c = classifyMorphActionLifecycle(morphId);
    rows.push({
      id: `morph:${morphId}`,
      displayName: morphId,
      sourceType: "MORPH_ACTION",
      family: "morph",
      currentRoute: `/editor/start?morph=${morphId}`,
      currentResultType: "openai_image",
      lifecycleClass: c.lifecycleClass,
      canonicalProject: c.canonicalProject,
      continueSupported: c.continuationSupported,
      materializationMode: c.materializationMode,
      entityCreation: "none",
      sceneCreation: "none",
      transformationIntentPreserved: true,
      upcReady: false,
      audioHintsPreserved: false,
      status: coverageStatusFor(c),
      nextGap: null,
    });
  }

  return rows;
}

export function presetLifecycleCoverageSummary(rows = buildPresetLifecycleCoverageMatrix()) {
  const byStatus: Record<string, number> = {};
  const byLifecycle: Record<string, number> = {};
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    byLifecycle[row.lifecycleClass] = (byLifecycle[row.lifecycleClass] ?? 0) + 1;
  }
  return { total: rows.length, byStatus, byLifecycle };
}

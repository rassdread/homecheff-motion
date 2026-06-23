/**
 * Compact factory for motion action presets — same pipeline, no new render system.
 */

import type {
  MotionActionPreset,
  MotionActionPresetCategory,
  MotionActionPresetId,
  MotionActionPresetMotionMode,
} from "@/types/motion-action-presets";

export type MotionPresetBuilderInput = {
  id: MotionActionPresetId;
  category: MotionActionPresetCategory;
  title: string;
  shortDescription: string;
  userFacingDescription: string;
  motionMode: MotionActionPresetMotionMode;
  movement: string;
  environment: string;
  backgroundPrompt: string;
  promptTemplate: string;
  difficulty?: MotionActionPreset["difficulty"];
  reliability?: MotionActionPreset["reliability"];
  duration?: MotionActionPreset["recommendedDurationSeconds"];
  feasibilityNote?: string;
  negativePrompt?: string;
  keywords?: string[];
};

const DEFAULT_NEGATIVE =
  "No distorted anatomy, duplicate faces, broken limbs, identity drift, or morphing character design.";

export function buildMotionActionPreset(input: MotionPresetBuilderInput): MotionActionPreset {
  const cinematic = input.motionMode === "cinematic" || input.motionMode === "sport";
  return {
    id: input.id,
    category: input.category,
    title: input.title,
    shortDescription: input.shortDescription,
    userFacingDescription: input.userFacingDescription,
    difficulty: input.difficulty ?? "easy",
    reliability: input.reliability ?? "medium",
    recommendedDurationSeconds: input.duration ?? 8,
    motionMode: input.motionMode,
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: true,
      feetVisiblePreferred: false,
      outfitRecommended: [],
    },
    motionSettings: {
      cameraMotion: cinematic ? "cinematic tracking" : "medium shot",
      energy: input.motionMode === "celebration" ? "high" : "medium",
      movement: input.movement,
      pacing: input.motionMode === "celebration" ? "fast" : "steady",
      shotType: cinematic ? "cinematic" : "naturalistic",
    },
    sceneSettings: {
      environment: input.environment,
      backgroundPrompt: input.backgroundPrompt,
      atmosphere: input.environment,
      lighting: cinematic ? "cinematic lighting" : "natural lighting",
    },
    styleSettings: {
      visualStyle: cinematic ? "cinematic realistic" : "realistic social",
      realismLevel: "realistic",
      cinematicLevel: cinematic ? "high" : "medium",
    },
    audioSuggestions: {
      musicMood: input.motionMode === "celebration" ? "triumphant" : "uplifting",
      genre: "modern",
    },
    sfxSuggestions: [],
    promptTemplate: input.promptTemplate,
    negativePrompt: input.negativePrompt ?? DEFAULT_NEGATIVE,
    feasibilityNote:
      input.feasibilityNote ??
      "Betrouwbaar voor deze scène. Exacte fysieke interacties kunnen per generatie licht wisselen.",
  };
}

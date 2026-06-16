import { fusionArchetypeDefinitionForIntent } from "@/lib/editor-fusion-archetype-definitions";
import { buildFusionOutputSettings } from "@/lib/editor-fusion-archetype-v2";
import type { loadAssistantEditorFusionBootstrap } from "@/lib/assistant-prefill-storage";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";
import type { CharacterFromReferenceWizardState } from "@/lib/character-from-reference-wizard";
import type { CharacterNewWizardState } from "@/lib/character-new-wizard";
import type { MotionReadyWizardAnswers, MotionReadyWizardState } from "@/types/motion-ready-character-wizard";
import type { PublishWizardState } from "@/lib/publish-wizard-flow";
import type { StudioProductionBriefV4Selections } from "@/types/studio-production-brief-v4";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorFusionGenerationSettings } from "@/types/editor-instruction-studio";
import type { InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import type { InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import { applyAnimationStyleToPosterSettings } from "@/lib/animation-style-presets";
import type { AnimationMoodId } from "@/lib/animation-mood-presets";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";
import type { MotionActionPresetMetadata } from "@/types/motion-action-presets";
import { isMotionActionPresetId } from "@/lib/motion-action-presets";

export function applyAssistantPrefillToMotionWizard(
  state: MotionReadyWizardState,
  pkg: AssistantPrefillPackage
): MotionReadyWizardState {
  if (!pkg.character) {
    return state;
  }
  const answers: MotionReadyWizardAnswers = {
    ...state.answers,
    bodyStyle: pkg.character.style === "cartoon" ? "mascot_cartoon" : "realistic",
    pose:
      pkg.character.pose === "friendly"
        ? "friendly"
        : pkg.character.pose === "neutral_standing"
          ? "neutral_standing"
          : state.answers.pose,
    clothing: pkg.character.clothing ?? state.answers.clothing,
    removeBackground: pkg.character.transparentBackground ?? true,
    clarifyHandsFeet: pkg.character.handsRequired ?? true,
  };
  return {
    ...state,
    answers,
  };
}

export function applyAssistantPrefillToStudioBrief(
  selections: StudioProductionBriefV4Selections,
  pkg: AssistantPrefillPackage
): StudioProductionBriefV4Selections {
  if (!pkg.studio) {
    return selections;
  }
  const duration = pkg.studio.durationSeconds ?? 30;
  return {
    ...selections,
    goals: pkg.studio.goal === "promotion" ? ["promote"] : selections.goals,
    length: duration <= 30 ? ["short"] : ["medium"],
    audience:
      pkg.studio.audience === "business"
        ? ["business"]
        : pkg.studio.audience === "consumers"
          ? ["consumers"]
          : ["general"],
    narrative: pkg.studio.narrativeMode === "dialogue" ? ["characters"] : ["narrator"],
  };
}

export function assistantPrefillSettingLabels(pkg: AssistantPrefillPackage): string[] {
  return [...pkg.settingLabelKeys];
}

export function applyAssistantPrefillToCharacterNew(
  state: CharacterNewWizardState,
  pkg: AssistantPrefillPackage
): CharacterNewWizardState {
  if (!pkg.character) {
    return state;
  }
  const idea =
    pkg.promptDraft?.trim() ||
    (pkg.character.style === "cartoon"
      ? "A cartoon character for my project"
      : pkg.character.clothing
        ? `A character wearing ${pkg.character.clothing}`
        : state.idea);
  return {
    ...state,
    idea: idea || state.idea,
    projectId: pkg.projectId ?? state.projectId,
  };
}

export function applyAssistantPrefillToFromReference(
  state: CharacterFromReferenceWizardState,
  pkg: AssistantPrefillPackage
): CharacterFromReferenceWizardState {
  if (!pkg.character) {
    return state;
  }
  return {
    ...state,
    referenceMode:
      pkg.character.routeProfile === "from_reference" && pkg.character.style === "cartoon"
        ? "custom_variant"
        : state.referenceMode,
    projectId: pkg.projectId ?? state.projectId,
    characterName: pkg.promptDraft?.trim() || state.characterName,
  };
}

function mapAudioMoodToAnimationMood(mood: string | undefined): AnimationMoodId | undefined {
  const raw = mood?.trim().toLowerCase() ?? "";
  if (!raw) {
    return undefined;
  }
  if (raw.includes("play") || raw.includes("fun") || raw.includes("grapp")) {
    return "playful";
  }
  if (raw.includes("lux") || raw.includes("glam")) {
    return "luxury";
  }
  if (raw.includes("epic") || raw.includes("cinematic") || raw.includes("film")) {
    return "cinematic";
  }
  if (raw.includes("triumph") || raw.includes("energ") || raw.includes("intense")) {
    return "energetic";
  }
  if (raw.includes("warm") || raw.includes("inspir")) {
    return "warm";
  }
  return "cinematic";
}

export type InstantMotionPrefillPatch = {
  stylePreset?: InstantPremiumStylePreset;
  transitionSeconds?: InstantTransitionSeconds;
  motionText?: string;
  scenePrompt?: string;
  posterMotionSettings?: Partial<PosterMotionSettings>;
  actionPresetId?: string;
  actionPresetTitle?: string;
  hcActionPreset?: MotionActionPresetMetadata;
};

export function applyAssistantPrefillToInstantMotion(
  pkg: AssistantPrefillPackage
): InstantMotionPrefillPatch {
  if (!pkg.motion) {
    return {};
  }
  const patch: InstantMotionPrefillPatch = {};
  if (pkg.motion.style === "cartoon" || pkg.motion.style === "social") {
    patch.stylePreset = "social_boost";
  } else if (pkg.motion.style === "business" || pkg.motion.style === "cinematic") {
    patch.stylePreset = "clean_business";
  } else if (pkg.motion.style === "food") {
    patch.stylePreset = "food_promo";
  }
  if (pkg.motion.durationSeconds === 5) {
    patch.transitionSeconds = 5;
  } else if (pkg.motion.durationSeconds === 8) {
    patch.transitionSeconds = 8;
  } else if (pkg.motion.durationSeconds === 12) {
    patch.transitionSeconds = 8;
  } else if (pkg.motion.durationSeconds === 3) {
    patch.transitionSeconds = 3;
  }

  const motionText =
    pkg.promptDraft?.trim() ||
    pkg.motion.textOverlayPreference?.trim() ||
    pkg.generationGoal?.trim();
  if (motionText) {
    patch.motionText = motionText;
  }
  if (pkg.motion.scenePrompt?.trim()) {
    patch.scenePrompt = pkg.motion.scenePrompt.trim();
  }
  if (pkg.motion.actionPresetId && isMotionActionPresetId(pkg.motion.actionPresetId)) {
    patch.actionPresetId = pkg.motion.actionPresetId;
    patch.actionPresetTitle = pkg.motion.presetTitle;
    patch.hcActionPreset = pkg.hcActionPreset;
    const mood = mapAudioMoodToAnimationMood(pkg.motion.audioMood ?? pkg.motion.mood);
    const base = applyAnimationStyleToPosterSettings(
      pkg.motion.style === "social" ? "character_animation" : "clean_motion"
    );
    patch.posterMotionSettings = {
      ...base,
      animationMood: mood ?? base.animationMood,
      cinematicCameraMotion: true,
      hcActionPreset: pkg.hcActionPreset ?? undefined,
      preparedByAssistant: pkg.motion.preparedByAssistant ?? false,
      preparedCharacterAssetId: pkg.motion.preparedCharacterAssetId,
      preparedOutfitAssetId: pkg.motion.preparedOutfitAssetId,
      preparedBackgroundAssetId: pkg.motion.preparedBackgroundAssetId,
      preparedPropAssetId: pkg.motion.preparedPropAssetId,
    };
  }
  return patch;
}

export function applyAssistantPrefillToPublishWizard(
  state: PublishWizardState,
  pkg: AssistantPrefillPackage
): PublishWizardState {
  if (!pkg.publish) {
    return state;
  }
  const intentParts = [
    pkg.publish.voice ? `voice:${pkg.publish.voice}` : null,
    pkg.publish.music ? `music:${pkg.publish.music}` : null,
    pkg.publish.exportFormat ? `export:${pkg.publish.exportFormat}` : null,
    pkg.publish.cta ? `cta:${pkg.publish.cta}` : null,
  ].filter(Boolean);
  return {
    ...state,
    intent: intentParts.join(" · ") || state.intent,
    hcProjectId: pkg.projectId ?? state.hcProjectId,
  };
}

type AssistantFusionBootstrap = NonNullable<ReturnType<typeof loadAssistantEditorFusionBootstrap>>;

export function buildFusionSettingsFromAssistantBootstrap(
  combineIntent: EditorFusionIntent,
  bootstrap: AssistantFusionBootstrap
): EditorFusionGenerationSettings {
  const base = buildFusionOutputSettings(combineIntent, {});
  return {
    ...base,
    ...(bootstrap.outputSettings as Partial<EditorFusionGenerationSettings>),
  };
}

export function buildFusionQuestionAnswersFromAssistantBootstrap(
  combineIntent: EditorFusionIntent,
  bootstrap: AssistantFusionBootstrap
): Record<string, string | boolean | string[]> {
  const settings = buildFusionSettingsFromAssistantBootstrap(combineIntent, bootstrap);
  const archetype = fusionArchetypeDefinitionForIntent(combineIntent);
  const answers: Record<string, string | boolean | string[]> = {};
  for (const question of archetype.questions) {
    const value = settings[question.outputKey as keyof EditorFusionGenerationSettings];
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      answers[question.id] = value.map(String);
    } else {
      answers[question.id] = value as string | boolean;
    }
  }
  return answers;
}

import { buildAssistantActionRoute, type AssistantRouteContext } from "@/lib/assistant-route-builder";
import { createAssistantPrefillId } from "@/lib/assistant-prefill-storage";
import {
  buildMotionActionPresetMetadata,
  getMotionActionPreset,
  motionActionPresetMissingInputKeys,
  motionActionPresetToInstantStyle,
} from "@/lib/motion-action-presets";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";
import type { AssistantInterpretation } from "@/types/assistant-interpretation";
import type { MotionActionPreset, MotionActionPresetId } from "@/types/motion-action-presets";

export function buildActionPresetInterpretation(
  message: string,
  preset: MotionActionPreset,
  locale?: string
): AssistantInterpretation {
  const nl = !locale || locale.startsWith("nl");

  return {
    originalMessage: message,
    understoodGoal: preset.userFacingDescription,
    detectedIntent: "create_motion_video",
    confidence: preset.reliability === "high" ? "high" : "medium",
    targetModule: "motion",
    likelyActionId: "create_motion_video",
    extractedEntities: {
      people: [nl ? "Jij / hoofdpersonage" : "You / main character"],
      locations: [preset.sceneSettings.environment],
      actions: [preset.motionSettings.movement],
      style: [preset.styleSettings.visualStyle],
    },
    inferredSettings: {
      subtype: "action_preset",
      actionPresetId: preset.id,
      actionClipCandidate: true,
      scene: preset.sceneSettings.environment,
      action: preset.motionSettings.movement,
      style: preset.styleSettings.visualStyle,
      mood: preset.audioSuggestions.musicMood,
      duration: preset.recommendedDurationSeconds,
    },
    missingInputs: nl ? ["foto van jezelf of personage"] : ["photo of yourself or character"],
    followUpQuestions: [
      {
        id: "source_photo",
        label: nl ? "Heb je een foto van jezelf of een personage?" : "Do you have a photo or character?",
        reason: nl
          ? "Een bronfoto of personage is nodig voor de actieclip."
          : "A source photo or character is required for the action clip.",
        options: nl
          ? ["Ja, upload in wizard", "Kies uit bibliotheek", "Nog niet"]
          : ["Yes, upload in wizard", "Choose from library", "Not yet"],
        required: true,
        affectsSettings: ["sourceImages"],
      },
    ],
    safetyOrFeasibilityNotes: [preset.feasibilityNote],
    suggestedRoute: "/animate/instant",
    source: "rules",
  };
}

export function buildActionPresetPrefillPackage(input: {
  presetId: MotionActionPresetId;
  message?: string;
  routeContext?: AssistantRouteContext;
  interpretation?: AssistantInterpretation;
}): AssistantPrefillPackage | null {
  const preset = getMotionActionPreset(input.presetId);
  if (!preset) {
    return null;
  }

  const routeContext = input.routeContext ?? {};
  const interpretation =
    input.interpretation ??
    buildActionPresetInterpretation(
      input.message ?? `Action preset: ${preset.title}`,
      preset
    );

  const motionStyle = motionActionPresetToInstantStyle(preset);
  const metadata = buildMotionActionPresetMetadata(preset);

  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "motion_video",
    actionId: "create_motion_video",
    targetRoute: buildAssistantActionRoute("create_motion_video", routeContext),
    projectId: routeContext.projectId ?? null,
    generationGoal: preset.userFacingDescription,
    promptDraft: preset.promptTemplate,
    estimatedCost: null,
    readiness: "ready_to_open",
    missingInputs: motionActionPresetMissingInputKeys(preset),
    pendingQuestions: [],
    activitySteps: [
      { id: "intent", labelKey: "assistant.prefill.activity.intent", status: "done" },
      { id: "preset", labelKey: "assistant.prefill.activity.actionPreset", status: "done" },
      { id: "route", labelKey: "assistant.prefill.activity.route", status: "done" },
      { id: "settings", labelKey: "assistant.prefill.activity.settings", status: "done" },
      { id: "review", labelKey: "assistant.prefill.activity.review", status: "active" },
    ],
    outputSettings: {
      actionPresetId: preset.id,
      duration: preset.recommendedDurationSeconds,
      motionSettings: preset.motionSettings,
      sceneSettings: preset.sceneSettings,
      styleSettings: preset.styleSettings,
      characterRequirements: preset.characterRequirements,
      audioSuggestions: preset.audioSuggestions,
      sfxSuggestions: preset.sfxSuggestions,
      negativePrompt: preset.negativePrompt,
    },
    protectionSettings: {
      preserveIdentity: true,
      preserveFace: true,
      preserveCharacterConsistency: true,
    },
    motion: {
      style: motionStyle,
      mood: preset.audioSuggestions.musicMood,
      cameraMotion: preset.motionSettings.cameraMotion,
      durationSeconds: preset.recommendedDurationSeconds,
      motionPreset: preset.id,
      actionPresetId: preset.id,
      scenePrompt: preset.sceneSettings.backgroundPrompt,
      audioMood: preset.audioSuggestions.musicMood,
      sfxSuggestions: preset.sfxSuggestions,
      negativePrompt: preset.negativePrompt,
      movementLabel: preset.motionSettings.movement,
      environmentLabel: preset.sceneSettings.environment,
      feasibilityNote: preset.feasibilityNote,
      presetTitle: preset.title,
    },
    understoodKey: "assistant.understood.motionActionPreset",
    settingLabelKeys: [
      "assistant.prefill.setting.actionPreset",
      "assistant.prefill.setting.motionDuration",
      "assistant.prefill.setting.motionStyle",
    ],
    interpretationSummary: {
      understoodGoal: preset.userFacingDescription,
      confidence: interpretation.confidence,
      feasibilityNotes: [preset.feasibilityNote],
      source: interpretation.source,
      followUpQuestions: interpretation.followUpQuestions,
    },
    interpretation,
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
    hcActionPreset: metadata,
  };
}

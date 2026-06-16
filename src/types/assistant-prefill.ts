import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { AssistantInterpretationQuestion } from "@/types/assistant-interpretation";
import type { AssistantInterpretation } from "@/types/assistant-interpretation";
import type { MotionActionPresetMetadata } from "@/types/motion-action-presets";
import type {
  ActionPresetMissingAsset,
  ActionPresetRequirementMetadata,
  ActionPresetResolutionPlan,
  ActionPresetResolvedAsset,
  AssistantActionPresetRequirementAnalysis,
} from "@/types/action-preset-requirements";
import type {
  AssistantExecutionPlan,
  AssistantPreparedAssetLink,
} from "@/types/assistant-tool-execution";

export type AssistantPrefillInterpretationSummary = {
  understoodGoal: string;
  confidence: "high" | "medium" | "low";
  feasibilityNotes?: string[];
  source: "rules" | "llm";
  followUpQuestions: AssistantInterpretationQuestion[];
  creativeGoal?: string;
  styleHints?: string[];
  constraints?: string[];
  intensity?: "subtle" | "balanced" | "high";
  alternativeIntents?: Array<{
    label: string;
    intent: string;
    presetId?: string;
    reason: string;
  }>;
};

export type AssistantPrefillIntent =
  | "fusion_outfit"
  | "fusion_age_progression"
  | "fusion_logo_placement"
  | "character_motion_ready"
  | "character_from_reference"
  | "character_new"
  | "studio_story"
  | "motion_video"
  | "publish_export"
  | "generic";

export type AssistantPrefillReadiness =
  | "planned"
  | "waiting_for_answer"
  | "ready_to_open"
  | "opened"
  | "cancelled";

export type AssistantPrefillActivityStatus =
  | "planned"
  | "waiting_for_answer"
  | "ready_to_open"
  | "opened"
  | "cancelled";

export type AssistantPrefillActivityStep = {
  id: string;
  labelKey: `assistant.prefill.activity.${string}`;
  status: "done" | "active" | "pending";
};

export type AssistantPrefillQuestion = {
  id: string;
  labelKey: `assistant.prefill.question.${string}`;
  kind: "choice" | "confirm";
  options?: Array<{ id: string; labelKey: `assistant.prefill.question.${string}` }>;
};

export type AssistantPrefillOutputSettings = Record<
  string,
  string | boolean | string[] | number | Record<string, unknown>
>;

export type AssistantFusionPrefill = {
  fusionIntent?: string;
  fusionArchetype?: string;
  requiredInputRoles?: string[];
  sourceRoles?: Record<string, string>;
  dynamicAnswers?: Record<string, string | boolean>;
  outputSettings?: AssistantPrefillOutputSettings;
  protectionSettings?: Record<string, boolean>;
};

export type AssistantCharacterPrefill = {
  routeProfile?: "new" | "from_reference" | "motion_ready";
  characterType?: string;
  style?: string;
  clothing?: string;
  motionReadyNeeded?: boolean;
  fullBodyRequired?: boolean;
  handsRequired?: boolean;
  feetRequired?: boolean;
  transparentBackground?: boolean;
  pose?: string;
  missingPartsPolicy?: string;
  saveToLibrary?: boolean;
  attachToProject?: boolean;
};

export type AssistantStudioPrefill = {
  goal?: string;
  audience?: string;
  storyType?: string;
  narrativeMode?: string;
  sceneCount?: number;
  durationSeconds?: number;
  cta?: string;
  voicePlan?: string;
  musicPlan?: string;
  overlayPlan?: string;
};

export type AssistantMotionPrefill = {
  style?: string;
  mood?: string;
  cameraMotion?: string;
  durationSeconds?: number;
  textOverlayPreference?: string;
  motionPreset?: string;
  actionPresetId?: string;
  scenePrompt?: string;
  audioMood?: string;
  sfxSuggestions?: string[];
  negativePrompt?: string;
  movementLabel?: string;
  environmentLabel?: string;
  feasibilityNote?: string;
  presetTitle?: string;
  preparedCharacterAssetId?: string;
  preparedOutfitAssetId?: string;
  preparedBackgroundAssetId?: string;
  preparedPropAssetId?: string;
  preparedByAssistant?: boolean;
};

export type AssistantPublishPrefill = {
  voice?: string;
  music?: string;
  sfx?: string;
  subtitles?: boolean;
  exportFormat?: string;
  cta?: string;
};

export type AssistantPrefillPackage = {
  version: 1;
  id: string;
  intent: AssistantPrefillIntent;
  actionId: AssistantActionId;
  targetRoute: string;
  projectId?: string | null;
  sourceAssetIds?: string[];
  uploadedFiles?: string[];
  questionAnswers?: Record<string, string>;
  outputSettings?: AssistantPrefillOutputSettings;
  protectionSettings?: Record<string, boolean>;
  generationGoal?: string;
  promptDraft?: string;
  estimatedCost?: number | null;
  readiness: AssistantPrefillReadiness;
  missingInputs: `assistant.prefill.missing.${string}`[];
  pendingQuestions: AssistantPrefillQuestion[];
  activitySteps: AssistantPrefillActivityStep[];
  fusion?: AssistantFusionPrefill;
  character?: AssistantCharacterPrefill;
  studio?: AssistantStudioPrefill;
  motion?: AssistantMotionPrefill;
  publish?: AssistantPublishPrefill;
  understoodKey: `assistant.understood.${string}`;
  settingLabelKeys: `assistant.prefill.setting.${string}`[];
  interpretationSummary?: AssistantPrefillInterpretationSummary;
  interpretation?: AssistantInterpretation;
  createdAt: string;
  /** V2 guard: prefill never triggers provider calls. */
  providerCalls: 0;
  creditsConsumed: 0;
  /** Action preset metadata for library registration after render. */
  hcActionPreset?: MotionActionPresetMetadata;
  requirementAnalysis?: AssistantActionPresetRequirementAnalysis;
  resolutionPlan?: ActionPresetResolutionPlan;
  missingAssets?: ActionPresetMissingAsset[];
  availableAssets?: ActionPresetResolvedAsset[];
  assistantRecommendations?: `assistant.requirements.recommendation.${string}`[];
  requirementMetadata?: ActionPresetRequirementMetadata;
  executionPlan?: AssistantExecutionPlan;
  preparedAssets?: AssistantPreparedAssetLink[];
};

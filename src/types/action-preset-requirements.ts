import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { MotionActionPresetId } from "@/types/motion-action-presets";

export type ActionPresetRequirementCategory =
  | "character"
  | "outfit"
  | "location"
  | "background"
  | "prop"
  | "crowd"
  | "vehicle"
  | "mascot"
  | "logo"
  | "music"
  | "sfx"
  | "voice"
  | "lighting";

export type ActionPresetRequirementId =
  | "person_character"
  | "football_outfit"
  | "sports_outfit"
  | "dance_outfit"
  | "hiking_outfit"
  | "fashion_outfit"
  | "luxury_outfit"
  | "stadium_location"
  | "mountain_location"
  | "city_location"
  | "beach_location"
  | "stage"
  | "red_carpet"
  | "luxury_background"
  | "background"
  | "crowd"
  | "trophy"
  | "confetti"
  | "sports_car"
  | "vehicle"
  | "skateboard"
  | "snowboard"
  | "microphone"
  | "reporter"
  | "logo"
  | "mascot"
  | "sports_music"
  | "music"
  | "sfx"
  | "voice"
  | "paparazzi"
  | "stage_lighting"
  | "basketball_outfit"
  | "cycling_outfit"
  | "finish_line";

export type ActionPresetRequirementAssetType =
  | "person_character"
  | "outfit"
  | "location"
  | "background"
  | "prop"
  | "crowd"
  | "vehicle"
  | "mascot"
  | "logo"
  | "music"
  | "sfx"
  | "voice"
  | "lighting";

export type ActionPresetRequirementPreferredSource =
  | "library_character"
  | "library_fusion"
  | "library_reference"
  | "library_music"
  | "library_sfx"
  | "project_assets"
  | "upload"
  | "generate"
  | "preset_default";

export type ActionPresetRequirement = {
  id: ActionPresetRequirementId;
  category: ActionPresetRequirementCategory;
  label: string;
  labelKey: `assistant.requirements.${string}`;
  required: boolean;
  autoGeneratable: boolean;
  assetType: ActionPresetRequirementAssetType;
  preferredSource: ActionPresetRequirementPreferredSource[];
};

export type ActionPresetResolutionOptionKind =
  | "upload_reference"
  | "generate_with_fusion"
  | "generate_background"
  | "use_library_asset"
  | "use_preset_default"
  | "continue_without"
  | "prepare_motion_character"
  | "create_character"
  | "choose_from_library"
  | "upload_photo";

export type ActionPresetResolutionOption = {
  id: string;
  kind: ActionPresetResolutionOptionKind;
  labelKey: `assistant.requirements.option.${string}`;
  actionId?: AssistantActionId;
  /** V3: plan only — never auto-executes provider calls. */
  registryOnly: true;
};

export type ActionPresetResolvedAsset = {
  requirementId: ActionPresetRequirementId;
  assetId: string;
  assetName: string;
  assetUrl: string;
  source: "library" | "project";
  motionReady?: boolean | null;
  fromProject?: boolean;
};

export type ActionPresetMissingAsset = {
  requirementId: ActionPresetRequirementId;
  label: string;
  labelKey: `assistant.requirements.${string}`;
  required: boolean;
  options: ActionPresetResolutionOption[];
};

export type ActionPresetResolutionStepKind =
  | "use_existing"
  | "prepare"
  | "generate_plan"
  | "use_default"
  | "open_wizard"
  | "generate_video";

export type ActionPresetResolutionStep = {
  order: number;
  id: string;
  labelKey: `assistant.requirements.plan.${string}`;
  kind: ActionPresetResolutionStepKind;
  requirementId?: ActionPresetRequirementId;
  assetId?: string;
  actionId?: AssistantActionId;
};

export type ActionPresetResolutionPlan = {
  presetId: MotionActionPresetId;
  presetTitle: string;
  steps: ActionPresetResolutionStep[];
  providerCalls: 0;
  creditsConsumed: 0;
};

export type ActionPresetMotionReadyIssue = {
  characterAssetId: string;
  characterName: string;
  motionReady: false;
};

export type ActionPresetRequirementResult = {
  presetId: MotionActionPresetId;
  presetTitle: string;
  availableAssets: ActionPresetResolvedAsset[];
  missingAssets: ActionPresetMissingAsset[];
  recommendedAssets: ActionPresetResolvedAsset[];
  resolutionPlan: ActionPresetResolutionPlan;
  motionReadyIssue?: ActionPresetMotionReadyIssue;
};

export type ActionPresetRequirementMetadata = {
  presetId: MotionActionPresetId;
  analyzedAt: string;
  availableCount: number;
  missingCount: number;
  requiredMissingCount: number;
  projectId?: string | null;
  reusedProjectAssetIds: string[];
  planStepIds: string[];
};

export type AssistantActionPresetRequirementAnalysis = {
  requirementResult: ActionPresetRequirementResult;
  resolutionPlan: ActionPresetResolutionPlan;
  missingAssets: ActionPresetMissingAsset[];
  availableAssets: ActionPresetResolvedAsset[];
  assistantRecommendations: `assistant.requirements.recommendation.${string}`[];
  requirementMetadata: ActionPresetRequirementMetadata;
};

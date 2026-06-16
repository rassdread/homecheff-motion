import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { ActionPresetRequirementId } from "@/types/action-preset-requirements";
import type { MotionActionPresetId } from "@/types/motion-action-presets";

export type AssistantToolExecutionStatus =
  | "planned"
  | "waiting_for_confirmation"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled"
  | "requires_user_review";

export type AssistantExecutionMode = "auto_safe" | "requires_user_review" | "wizard_only";

export type AssistantPreparedAssetLink = {
  requirementId: ActionPresetRequirementId;
  assetId: string;
  libraryRecordId?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  assetName: string;
  projectId?: string | null;
  sourceActionId: AssistantActionId | "use_existing" | "use_preset_default";
};

export type AssistantExecutionStepInput = {
  requirementId?: ActionPresetRequirementId;
  assetId?: string;
  characterAssetId?: string;
  characterAssetUrl?: string;
  presetId?: MotionActionPresetId;
  scenePrompt?: string;
  fusionIntent?: string;
  fusionArchetype?: string;
  projectId?: string | null;
  prefillId?: string;
};

export type AssistantExecutionStepOutput = {
  assetId?: string;
  libraryRecordId?: string | null;
  url?: string;
  thumbnailUrl?: string | null;
  assetName?: string;
  projectId?: string | null;
  sourceActionId?: AssistantActionId | "use_existing" | "use_preset_default";
  preparedAsset?: AssistantPreparedAssetLink;
  handoffRoute?: string;
  handoffPrefillId?: string;
  fusionBootstrap?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
  skipAllowed?: boolean;
  manualRoute?: string;
};

export type AssistantExecutionStep = {
  id: string;
  order: number;
  actionId: AssistantActionId | "use_existing_asset" | "use_preset_default" | "open_motion_wizard";
  labelKey: `assistant.execution.step.${string}`;
  descriptionKey?: `assistant.execution.step.${string}`;
  required: boolean;
  executionMode: AssistantExecutionMode;
  estimatedCredits: number;
  estimatedDurationSec: number;
  requirementId?: ActionPresetRequirementId;
  input: AssistantExecutionStepInput;
  output?: AssistantExecutionStepOutput;
  status: AssistantToolExecutionStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
};

export type AssistantExecutionPlan = {
  id: string;
  prefillId: string;
  presetId: MotionActionPresetId;
  presetTitle: string;
  projectId?: string | null;
  status: AssistantToolExecutionStatus;
  steps: AssistantExecutionStep[];
  totalEstimatedCredits: number;
  confirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
  preparedByAssistant: true;
  providerCalls: 0;
  creditsConsumed: number;
};

export type AssistantExecutionResult = {
  planId: string;
  stepId: string;
  status: AssistantToolExecutionStatus;
  step: AssistantExecutionStep;
  plan: AssistantExecutionPlan;
  nextStepId?: string | null;
  requiresUserReview: boolean;
  handoffRoute?: string;
  handoffPrefillId?: string;
  providerCalls: 0;
  creditsConsumed: number;
};

export type AssistantExecutionLogEntry = {
  planId: string;
  stepId: string;
  actionId: string;
  status: AssistantToolExecutionStatus;
  startedAt: string;
  completedAt?: string;
  outputAssetId?: string;
  error?: string;
};

export type AssistantExecutionProjectMetadata = {
  version: 1;
  updatedAt: string;
  plans: Array<{
    planId: string;
    presetId: MotionActionPresetId;
    status: AssistantToolExecutionStatus;
    confirmedAt?: string;
    completedAt?: string;
    entries: AssistantExecutionLogEntry[];
  }>;
};

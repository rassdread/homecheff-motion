import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { AssistantExecutionMode } from "@/types/assistant-tool-execution";

export const ASSISTANT_V4_EXECUTABLE_ACTIONS = [
  "prepare_motion_character",
  "prepare_outfit",
  "prepare_background",
  "prepare_location",
  "prepare_prop",
  "prepare_vehicle",
  "prepare_music",
  "prepare_sfx",
] as const satisfies readonly AssistantActionId[];

export type AssistantV4ExecutableActionId = (typeof ASSISTANT_V4_EXECUTABLE_ACTIONS)[number];

export type AssistantExecutionStepActionId =
  | AssistantV4ExecutableActionId
  | "use_existing_asset"
  | "use_preset_default"
  | "open_motion_wizard";

export const ASSISTANT_V4_BLOCKED_ACTIONS = [
  "create_publish_export",
  "rename_project",
] as const satisfies readonly AssistantActionId[];

const EXECUTION_MODE_BY_ACTION: Record<AssistantExecutionStepActionId, AssistantExecutionMode> = {
  use_existing_asset: "auto_safe",
  use_preset_default: "auto_safe",
  open_motion_wizard: "auto_safe",
  prepare_motion_character: "wizard_only",
  prepare_outfit: "requires_user_review",
  prepare_background: "requires_user_review",
  prepare_location: "requires_user_review",
  prepare_prop: "requires_user_review",
  prepare_vehicle: "requires_user_review",
  prepare_music: "requires_user_review",
  prepare_sfx: "requires_user_review",
};

const CREDIT_ESTIMATE_BY_ACTION: Record<AssistantExecutionStepActionId, number> = {
  use_existing_asset: 0,
  use_preset_default: 0,
  open_motion_wizard: 0,
  prepare_motion_character: 0,
  prepare_outfit: 2,
  prepare_background: 2,
  prepare_location: 2,
  prepare_prop: 2,
  prepare_vehicle: 2,
  prepare_music: 0,
  prepare_sfx: 0,
};

export function getAssistantExecutionMode(
  actionId: AssistantExecutionStepActionId
): AssistantExecutionMode {
  return EXECUTION_MODE_BY_ACTION[actionId] ?? "requires_user_review";
}

export function getAssistantExecutionCreditEstimate(
  actionId: AssistantExecutionStepActionId
): number {
  return CREDIT_ESTIMATE_BY_ACTION[actionId] ?? 0;
}

export function isAssistantV4ExecutableAction(
  actionId: string
): actionId is AssistantV4ExecutableActionId {
  return (ASSISTANT_V4_EXECUTABLE_ACTIONS as readonly string[]).includes(actionId);
}

export function isAssistantV4BlockedAction(actionId: string): boolean {
  return (ASSISTANT_V4_BLOCKED_ACTIONS as readonly string[]).includes(actionId);
}

export function isVideoRenderAction(actionId: string): boolean {
  return actionId === "create_motion_video";
}

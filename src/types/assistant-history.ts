import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type { AssistantActionId } from "@/lib/assistant-action-registry";

export type AssistantHistoryStatus =
  | "planned"
  | "opened"
  | "prepared"
  | "generated"
  | "completed"
  | "cancelled"
  | "failed";

export type AssistantHistoryItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string | null;
  projectTitle?: string | null;
  userMessage: string;
  assistantSummary: string;
  intent: string;
  presetId?: MotionActionPresetId;
  actionId?: AssistantActionId;
  status: AssistantHistoryStatus;
  route?: string;
  relatedAssetIds: string[];
  relatedLibraryRecordIds: string[];
  executionPlanId?: string;
};

export type AssistantHistoryStore = {
  version: 1;
  items: AssistantHistoryItem[];
};

import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type { AssistantActionId } from "@/lib/assistant-action-registry";

export type AssistantProjectMemoryTurn = {
  at: string;
  userMessage: string;
  intent: string;
  presetId?: MotionActionPresetId;
  actionId?: AssistantActionId;
  route?: string;
  characterName?: string;
  characterId?: string;
  style?: string;
};

export type AssistantProjectMemoryLastPlan = {
  presetId?: MotionActionPresetId;
  characterName?: string;
  characterId?: string;
  locationName?: string;
  outfitName?: string;
  style?: string;
  route?: string;
  durationSeconds?: number;
  at: string;
};

export type AssistantProjectMemory = {
  version: 1;
  updatedAt: string;
  presets: MotionActionPresetId[];
  styles: string[];
  routes: string[];
  generatedAssetIds: string[];
  characterIds: string[];
  characterNames: string[];
  preferredDurations: number[];
  favoriteOutputIds: string[];
  recentTurns: AssistantProjectMemoryTurn[];
  lastSuccessfulPlan?: AssistantProjectMemoryLastPlan;
};

import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { AssistantConversationMemory } from "@/lib/assistant-conversation-memory";

export type AssistantClarificationKind = "video_type";

export type AssistantSessionMemory = {
  selectedProjectId: string | null;
  selectedAssetId: string | null;
  activeWizard: AssistantActionId | null;
  lastIntent: string | null;
  pendingClarification: AssistantClarificationKind | null;
  pendingPrefillId: string | null;
  recentRecommendationIds?: string[];
  recommendationSessionSeed?: string;
  conversationMemory?: AssistantConversationMemory;
};

import { EMPTY_CONVERSATION_MEMORY } from "@/lib/assistant-conversation-memory";

export const EMPTY_ASSISTANT_SESSION: AssistantSessionMemory = {
  selectedProjectId: null,
  selectedAssetId: null,
  activeWizard: null,
  lastIntent: null,
  pendingClarification: null,
  pendingPrefillId: null,
  recentRecommendationIds: [],
  recommendationSessionSeed: undefined,
  conversationMemory: EMPTY_CONVERSATION_MEMORY,
};

export function createAssistantSessionMemory(
  partial: Partial<AssistantSessionMemory> = {}
): AssistantSessionMemory {
  return { ...EMPTY_ASSISTANT_SESSION, ...partial };
}

export function rememberAssistantProject(
  memory: AssistantSessionMemory,
  projectId: string | null
): AssistantSessionMemory {
  return { ...memory, selectedProjectId: projectId };
}

export function rememberAssistantAsset(
  memory: AssistantSessionMemory,
  assetId: string | null
): AssistantSessionMemory {
  return { ...memory, selectedAssetId: assetId };
}

export function rememberAssistantWizard(
  memory: AssistantSessionMemory,
  actionId: AssistantActionId | null
): AssistantSessionMemory {
  return { ...memory, activeWizard: actionId };
}

export function rememberAssistantIntent(
  memory: AssistantSessionMemory,
  intent: string | null
): AssistantSessionMemory {
  return { ...memory, lastIntent: intent };
}

export function setAssistantPendingClarification(
  memory: AssistantSessionMemory,
  kind: AssistantClarificationKind | null
): AssistantSessionMemory {
  return { ...memory, pendingClarification: kind };
}

export function resolveActiveAssistantProjectId(
  memory: AssistantSessionMemory,
  urlProjectId?: string | null
): string | null {
  return memory.selectedProjectId ?? urlProjectId ?? null;
}

export function rememberAssistantRecommendation(
  memory: AssistantSessionMemory,
  recommendationId: string
): AssistantSessionMemory {
  const recent = memory.recentRecommendationIds ?? [];
  const next = [recommendationId, ...recent.filter((id) => id !== recommendationId)].slice(0, 12);
  return {
    ...memory,
    recentRecommendationIds: next,
    lastIntent: recommendationId,
  };
}

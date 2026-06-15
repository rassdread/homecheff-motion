import type { AssistantActionId } from "@/lib/assistant-action-registry";

export type AssistantClarificationKind = "video_type";

export type AssistantSessionMemory = {
  selectedProjectId: string | null;
  selectedAssetId: string | null;
  activeWizard: AssistantActionId | null;
  lastIntent: string | null;
  pendingClarification: AssistantClarificationKind | null;
};

export const EMPTY_ASSISTANT_SESSION: AssistantSessionMemory = {
  selectedProjectId: null,
  selectedAssetId: null,
  activeWizard: null,
  lastIntent: null,
  pendingClarification: null,
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

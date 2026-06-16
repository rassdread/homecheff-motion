/**
 * @deprecated Replaced by AssistantRecommendationEngine (V5).
 * Kept as a thin compatibility shim for legacy imports.
 */
import { buildAssistantRecommendations } from "@/lib/assistant-recommendation-engine";
import type { AssistantProjectContext, AssistantContextSnapshot } from "@/lib/assistant-context-layer";

export type AssistantSuggestion = {
  id: string;
  messageKey: `assistant.recommendation.${string}.title` | `assistant.suggestion.${string}`;
  actionId?: import("@/lib/assistant-action-registry").AssistantActionId;
  promptMessage?: string;
};

export function buildAssistantSuggestions(input: {
  snapshot: AssistantContextSnapshot;
  activeProject?: AssistantProjectContext | null;
  message?: string;
  pathname?: string;
}): AssistantSuggestion[] {
  const result = buildAssistantRecommendations({
    pathname: input.pathname ?? "/studio",
    snapshot: input.snapshot,
    activeProject: input.activeProject,
    maxCount: 4,
  });
  return result.recommendations.map((row) => ({
    id: row.id,
    messageKey: row.titleKey,
    actionId: row.actionPresetId ? "create_motion_video" : undefined,
    promptMessage: row.promptMessage,
  }));
}

import type { AssistantProjectContext, AssistantContextSnapshot } from "@/lib/assistant-context-layer";

export type AssistantSuggestion = {
  id: string;
  messageKey: `assistant.suggestion.${string}`;
  actionId?: import("@/lib/assistant-action-registry").AssistantActionId;
};

export function buildAssistantSuggestions(input: {
  snapshot: AssistantContextSnapshot;
  activeProject?: AssistantProjectContext | null;
}): AssistantSuggestion[] {
  const suggestions: AssistantSuggestion[] = [];
  const { library } = input.snapshot;
  const project = input.activeProject;

  if (library.characters.length === 0) {
    suggestions.push({
      id: "no-characters",
      messageKey: "assistant.suggestion.noCharacters",
      actionId: "create_character",
    });
  }

  const motionReadyCharacters = library.characters.filter((row) => row.motionReady === true);
  if (motionReadyCharacters.length > 0) {
    suggestions.push({
      id: "motion-ready-characters",
      messageKey: "assistant.suggestion.motionReadyCharacters",
      actionId: "create_motion_video",
    });
  }

  if (library.fusionOutputs.length > 0 && library.characters.length === 0) {
    suggestions.push({
      id: "fusion-to-character",
      messageKey: "assistant.suggestion.fusionToCharacter",
      actionId: "create_character_from_reference",
    });
  }

  if (project?.workflowStatus === "publish_ready" || project?.workflowStatus === "motion_ready") {
    suggestions.push({
      id: "ready-to-publish",
      messageKey: "assistant.suggestion.readyToPublish",
      actionId: "create_publish_export",
    });
  }

  if (project && project.assetStats.characterCount === 0) {
    suggestions.push({
      id: "project-no-characters",
      messageKey: "assistant.suggestion.projectNoCharacters",
      actionId: "create_character",
    });
  }

  return suggestions.slice(0, 4);
}

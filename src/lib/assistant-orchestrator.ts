import {
  buildAssistantContextSnapshot,
  type AssistantContextSnapshot,
  type AssistantProjectContext,
} from "@/lib/assistant-context-layer";
import type { AssistantActionId } from "@/lib/assistant-action-registry";
import { getAssistantAction } from "@/lib/assistant-action-registry";
import {
  assistantClarifyOptions,
  matchAssistantIntent,
  type AssistantClarifyOption,
} from "@/lib/assistant-intent-router";
import {
  buildAssistantActionRoute,
  pickLatestAssistantProject,
  type AssistantRouteContext,
} from "@/lib/assistant-route-builder";
import { buildAssistantSuggestions, type AssistantSuggestion } from "@/lib/assistant-suggestions";
import {
  createAssistantSessionMemory,
  resolveActiveAssistantProjectId,
  type AssistantSessionMemory,
} from "@/lib/assistant-session-memory";
import { listHomeCheffProjectsFiltered } from "@/lib/homecheff-project-persist";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export type AssistantChatRole = "user" | "assistant";

export type AssistantChatMessage = {
  id: string;
  role: AssistantChatRole;
  messageKey: `assistant.${string}`;
  params?: Record<string, string | number>;
  proposal?: AssistantProposal | null;
  clarifyOptions?: AssistantClarifyOption[];
};

export type AssistantProposal = {
  understoodKey: `assistant.understood.${string}`;
  actionId: AssistantActionId;
  route: string;
  autoExecute: false;
};

export type AssistantTurnInput = {
  message: string;
  memory: AssistantSessionMemory;
  snapshot: AssistantContextSnapshot;
  urlProjectId?: string | null;
};

export type AssistantTurnResult = {
  memory: AssistantSessionMemory;
  messages: AssistantChatMessage[];
  suggestions: AssistantSuggestion[];
};

function findActiveProject(
  snapshot: AssistantContextSnapshot,
  projectId: string | null
): AssistantProjectContext | null {
  if (!projectId) {
    return null;
  }
  return snapshot.projects.find((project) => project.id === projectId) ?? null;
}

function routeContextFromProject(
  project: AssistantProjectContext | HomeCheffProjectPackage | null
): AssistantRouteContext {
  if (!project) {
    return {};
  }
  if ("assetStats" in project) {
    return {
      projectId: project.id,
      projectTitle: project.title,
      storyboardId: project.storyboardId,
    };
  }
  return {
    projectId: project.id,
    projectTitle: project.title,
    storyboardId: project.servicePayload?.studio?.storyboardId ?? null,
  };
}

function proposalMessage(
  understoodKey: `assistant.understood.${string}`,
  actionId: AssistantActionId,
  route: string
): AssistantChatMessage {
  return {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    messageKey: "assistant.reply.proposal",
    params: {
      action: getAssistantAction(actionId).id,
      route,
    },
    proposal: {
      understoodKey,
      actionId,
      route,
      autoExecute: false,
    },
  };
}

function replyMessage(
  messageKey: `assistant.${string}`,
  params?: Record<string, string | number>
): AssistantChatMessage {
  return {
    id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: "assistant",
    messageKey,
    params,
  };
}

function formatAssetList(names: string[], emptyKey: `assistant.${string}`): AssistantChatMessage {
  if (names.length === 0) {
    return replyMessage(emptyKey);
  }
  return replyMessage("assistant.reply.itemList", {
    items: names.slice(0, 8).join(", "),
    count: names.length,
  });
}

export function buildAssistantSnapshotFromClient(input: {
  libraryRecords?: LibraryConsistencyRecord[];
}): AssistantContextSnapshot {
  const projects = listHomeCheffProjectsFiltered("hc", 200);
  return buildAssistantContextSnapshot({
    projects,
    libraryRecords: input.libraryRecords ?? [],
    query: { limit: 100 },
  });
}

export function processAssistantTurn(input: AssistantTurnInput): AssistantTurnResult {
  const activeProjectId = resolveActiveAssistantProjectId(input.memory, input.urlProjectId);
  let memory = { ...input.memory, lastIntent: input.message.trim() };
  const activeProject = findActiveProject(input.snapshot, activeProjectId);
  const suggestions = buildAssistantSuggestions({
    snapshot: input.snapshot,
    activeProject,
  });

  const userMessage: AssistantChatMessage = {
    id: `user-${Date.now()}`,
    role: "user",
    messageKey: "assistant.chat.userEcho",
    params: { text: input.message.trim() },
  };

  const intent = matchAssistantIntent(input.message, {
    pendingClarification: memory.pendingClarification,
  });

  if (intent.kind === "clarify") {
    memory = { ...memory, pendingClarification: intent.clarification };
    return {
      memory,
      messages: [
        userMessage,
        {
          id: `assistant-clarify-${Date.now()}`,
          role: "assistant",
          messageKey: intent.messageKey,
          clarifyOptions: assistantClarifyOptions(intent.clarification),
        },
      ],
      suggestions,
    };
  }

  memory = { ...memory, pendingClarification: null };

  if (intent.kind === "query") {
    switch (intent.query) {
      case "list_characters":
        return {
          memory,
          messages: [
            userMessage,
            formatAssetList(
              input.snapshot.library.characters.map((row) => row.assetName),
              "assistant.reply.noCharacters"
            ),
          ],
          suggestions,
        };
      case "list_motion_videos":
        return {
          memory,
          messages: [
            userMessage,
            formatAssetList(
              input.snapshot.library.motionVideos.map((row) => row.assetName),
              "assistant.reply.noMotionVideos"
            ),
          ],
          suggestions,
        };
      case "list_fusion_outputs":
        return {
          memory,
          messages: [
            userMessage,
            formatAssetList(
              input.snapshot.library.fusionOutputs.map((row) => row.assetName),
              "assistant.reply.noFusionOutputs"
            ),
          ],
          suggestions,
        };
      case "open_latest_project": {
        const latest = pickLatestAssistantProject(listHomeCheffProjectsFiltered("hc", 200));
        if (!latest) {
          return {
            memory,
            messages: [userMessage, replyMessage("assistant.reply.noProjects")],
            suggestions,
          };
        }
        memory = { ...memory, selectedProjectId: latest.id };
        const route = buildAssistantActionRoute("open_project", routeContextFromProject(latest));
        return {
          memory,
          messages: [
            userMessage,
            proposalMessage("assistant.understood.openLatestProject", "open_project", route),
          ],
          suggestions,
        };
      }
      case "project_status": {
        if (!activeProject) {
          return {
            memory,
            messages: [userMessage, replyMessage("assistant.reply.noActiveProject")],
            suggestions,
          };
        }
        return {
          memory,
          messages: [
            userMessage,
            replyMessage("assistant.reply.projectStatus", {
              title: activeProject.title,
              status: activeProject.workflowStatus,
              characters: activeProject.assetStats.characterCount,
              videos: activeProject.assetStats.videoCount,
              exports: activeProject.assetStats.exportCount,
              fusion: input.snapshot.library.fusionOutputs.length,
            }),
          ],
          suggestions,
        };
      }
      case "project_assets": {
        if (!activeProject) {
          return {
            memory,
            messages: [userMessage, replyMessage("assistant.reply.noActiveProject")],
            suggestions,
          };
        }
        const route = buildAssistantActionRoute("open_asset", {
          projectId: activeProject.id,
        });
        return {
          memory,
          messages: [
            userMessage,
            replyMessage("assistant.reply.projectAssets", {
              title: activeProject.title,
              count: activeProject.assetStats.assetCount,
            }),
            proposalMessage("assistant.understood.openProjectAssets", "open_asset", route),
          ],
          suggestions,
        };
      }
    }
  }

  if (intent.kind === "action") {
    const route = buildAssistantActionRoute(
      intent.actionId,
      routeContextFromProject(activeProject)
    );
    memory = {
      ...memory,
      activeWizard: intent.actionId,
      selectedProjectId: activeProject?.id ?? memory.selectedProjectId,
    };
    return {
      memory,
      messages: [userMessage, proposalMessage(intent.understoodKey, intent.actionId, route)],
      suggestions,
    };
  }

  return {
    memory,
    messages: [userMessage, replyMessage("assistant.reply.unknown")],
    suggestions,
  };
}

export function createInitialAssistantSession(urlProjectId?: string | null): {
  memory: AssistantSessionMemory;
  snapshot: AssistantContextSnapshot;
} {
  const memory = createAssistantSessionMemory({
    selectedProjectId: urlProjectId ?? null,
  });
  const snapshot = buildAssistantSnapshotFromClient({});
  return { memory, snapshot };
}

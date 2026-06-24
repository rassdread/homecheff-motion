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
import { enrichPrefillWithProducerAnalysis } from "@/lib/assistant-producer-mode";
import {
  createAssistantSessionMemory,
  resolveActiveAssistantProjectId,
  type AssistantSessionMemory,
} from "@/lib/assistant-session-memory";
import {
  applyPrefillAnswer,
  buildAssistantPrefillPackage,
  detectAssistantPrefillIntent,
  tryResolvePrefillAnswerFromMessage,
} from "@/lib/assistant-prefill-engine";
import { interpretConversationally } from "@/lib/assistant-conversational-interpretation";
import {
  applyInterpretationAnswerToPrefill,
  buildPrefillPackageFromInterpretation,
  tryResolveInterpretationAnswerFromMessage,
} from "@/lib/assistant-interpretation-engine";
import { listAssistantHistory } from "@/lib/assistant-history";
import {
  buildProjectMemoryReuseReply,
  isProjectRepeatRequest,
} from "@/lib/assistant-project-memory";
import {
  resolvePronounMessage,
  updateConversationMemory,
} from "@/lib/assistant-conversation-memory";
import { buildAssistantStudioContext } from "@/lib/assistant-studio-brain";
import { producerResponseFromInterpretation } from "@/lib/assistant-producer-response";
import type { ProducerResponse } from "@/types/assistant-producer";
import { buildExecutionChainForPreset, executionChainSummary } from "@/lib/assistant-execution-chain";
import { isMotionActionPresetId } from "@/lib/motion-action-presets";
import type { AssistantStudioContext } from "@/types/assistant-studio-brain";
import type { AssistantProjectMemory } from "@/types/assistant-project-memory";
import { loadAssistantPrefillPackage } from "@/lib/assistant-prefill-storage";
import { listHomeCheffProjectsFiltered } from "@/lib/homecheff-project-persist";
import { buildAssistantPricingCatalogReply } from "@/lib/assistant-pricing-catalog";
import {
  processAssistantV4Turn,
  type AssistantV4TurnInput,
} from "@/lib/assistant-v4-intelligence";
import type { AssistantEditorContextHint } from "@/types/assistant-v3";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export type AssistantChatRole = "user" | "assistant";

export type AssistantChatMessage = {
  id: string;
  role: AssistantChatRole;
  messageKey: `assistant.${string}`;
  params?: Record<string, string | number>;
  proposal?: AssistantProposal | null;
  clarifyOptions?: AssistantClarifyOption[];
  producerResponse?: ProducerResponse;
  v3Response?: import("@/types/assistant-v4").AssistantV4CopilotResponse;
};

export type AssistantProposal = {
  understoodKey: `assistant.understood.${string}`;
  actionId: AssistantActionId;
  route: string;
  autoExecute: false;
  prefillPackage?: AssistantPrefillPackage | null;
};

import type { AssistantBillingContext } from "@/types/studio-billing";
import type { StudioPricingCatalogPublicEntry } from "@/types/studio-pricing-catalog";

export type AssistantTurnInput = {
  message: string;
  memory: AssistantSessionMemory;
  snapshot: AssistantContextSnapshot;
  urlProjectId?: string | null;
  interpretation?: import("@/types/assistant-interpretation").AssistantInterpretation | null;
  isAuthenticated?: boolean;
  locale?: "nl" | "en";
  pathname?: string;
  projectMemory?: AssistantProjectMemory | null;
  billingContext?: AssistantBillingContext;
  pricingCatalog?: StudioPricingCatalogPublicEntry[];
  editorContext?: AssistantEditorContextHint | null;
  libraryRecords?: LibraryConsistencyRecord[];
  identityPreservationOverrides?: import("@/types/assistant-identity-preservation").IdentityPreservationOverrides;
};

export type AssistantTurnResult = {
  memory: AssistantSessionMemory;
  messages: AssistantChatMessage[];
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

function finalizePrefillPackage(
  pkg: AssistantPrefillPackage,
  snapshot: AssistantContextSnapshot,
  activeProject?: AssistantProjectContext | null
): AssistantPrefillPackage {
  return enrichPrefillWithProducerAnalysis(pkg, snapshot, activeProject);
}

function prefillProposalMessage(
  pkg: AssistantPrefillPackage,
  studio?: AssistantStudioContext | null,
  locale?: string
): AssistantChatMessage {
  const messageKey = pkg.requirementAnalysis
    ? pkg.readiness === "waiting_for_answer"
      ? "assistant.reply.producerPrefillWaiting"
      : "assistant.reply.producerPrefillReady"
    : pkg.readiness === "waiting_for_answer"
      ? "assistant.reply.prefillWaiting"
      : "assistant.reply.prefillReady";

  let producerResponse: ProducerResponse | undefined;
  const presetId = pkg.interpretation?.likelyPresetId;
  if (presetId && isMotionActionPresetId(presetId) && studio) {
    const chain = buildExecutionChainForPreset(
      presetId,
      {
        projects: [],
        storyboards: [],
        library: {
          characters: studio.characters,
          fusionOutputs: [],
          motionVideos: [],
          publishExports: [],
          references: [],
          voice: [],
          music: [],
          sfx: [],
          assets: studio.assets,
        },
      },
      locale
    );
    if (chain) {
      producerResponse = {
        understoodGoal: pkg.interpretation?.understoodGoal ?? chain.goal,
        confidence: pkg.interpretation?.confidence ?? "high",
        shortReply: executionChainSummary(chain, locale),
        options: [],
        questions: [],
        canPrepare: pkg.readiness === "ready_to_open",
        requiresLogin: false,
        missingInputs: pkg.interpretation?.missingInputs ?? [],
        executionChain: chain,
      };
    }
  }

  return {
    id: `assistant-prefill-${Date.now()}`,
    role: "assistant",
    messageKey,
    params: {
      action: getAssistantAction(pkg.actionId).id,
      route: pkg.targetRoute,
    },
    proposal: {
      understoodKey: pkg.understoodKey,
      actionId: pkg.actionId,
      route: pkg.targetRoute,
      autoExecute: false,
      prefillPackage: pkg,
    },
    producerResponse,
  };
}

function proposalMessage(
  understoodKey: `assistant.understood.${string}`,
  actionId: AssistantActionId,
  route: string,
  prefillPackage?: AssistantPrefillPackage | null
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
      prefillPackage: prefillPackage ?? null,
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

function v3CopilotMessage(
  v3: import("@/types/assistant-v4").AssistantV4CopilotResponse,
  producer: ProducerResponse
): AssistantChatMessage {
  return {
    id: `assistant-v3-${Date.now()}`,
    role: "assistant",
    messageKey: "assistant.reply.v3Copilot",
    params: { text: producer.shortReply },
    producerResponse: producer,
    v3Response: v3,
  };
}

function producerMessage(producer: ProducerResponse): AssistantChatMessage {
  return {
    id: `assistant-producer-${Date.now()}`,
    role: "assistant",
    messageKey: "assistant.reply.producer",
    params: { text: producer.shortReply },
    producerResponse: producer,
  };
}

function interpretContext(input: AssistantTurnInput) {
  return {
    locale: input.locale ?? "nl",
    projectId: input.urlProjectId ?? input.memory.selectedProjectId,
    isAuthenticated: input.isAuthenticated ?? true,
    snapshot: input.snapshot,
  } as const;
}

function shouldShowProducerFirst(
  interpretation: import("@/types/assistant-interpretation").AssistantInterpretation
): boolean {
  if (interpretation.detectedIntent === "mascot_variant") {
    return true;
  }
  if (interpretation.detectedIntent === "producer_guidance") {
    return true;
  }
  if (interpretation.confidence === "low") {
    return true;
  }
  if (
    (interpretation.alternativeIntents?.length ?? 0) > 0 &&
    interpretation.confidence !== "high"
  ) {
    return true;
  }
  return false;
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
  const studio = buildAssistantStudioContext({
    pathname: input.pathname ?? "/",
    snapshot: input.snapshot,
    activeProjectId,
    pendingPrefillId: input.memory.pendingPrefillId,
    recentHistory: listAssistantHistory(activeProjectId),
    projectMemory: input.projectMemory ?? null,
  });
  const resolvedMessage = resolvePronounMessage(
    input.message,
    input.memory.conversationMemory ?? { lastEntities: [] },
    studio
  );
  let memory = { ...input.memory, lastIntent: resolvedMessage.trim() };
  const activeProject = findActiveProject(input.snapshot, activeProjectId);

  const userMessage: AssistantChatMessage = {
    id: `user-${Date.now()}`,
    role: "user",
    messageKey: "assistant.chat.userEcho",
    params: { text: resolvedMessage.trim() },
  };

  const pricingReply = buildAssistantPricingCatalogReply({
    message: resolvedMessage,
    catalog: input.pricingCatalog ?? [],
    locale: input.locale,
  });
  if (pricingReply) {
    return {
      memory: { ...memory, lastIntent: "pricing_question" },
      messages: [
        userMessage,
        {
          id: `assistant-pricing-${Date.now()}`,
          role: "assistant",
          messageKey: "assistant.chat.pricingReply",
          params: {
            text: input.locale === "en" ? pricingReply.replyEn : pricingReply.replyNl,
          },
        },
      ],
    };
  }

  if (isProjectRepeatRequest(resolvedMessage) && studio.projectMemory) {
    const reuseReply = buildProjectMemoryReuseReply(studio.projectMemory, input.locale ?? "nl");
    if (reuseReply) {
      const interpretation = interpretConversationally(resolvedMessage, interpretContext(input));
      memory = {
        ...memory,
        conversationMemory: updateConversationMemory(memory.conversationMemory ?? { lastEntities: [] }, {
          message: resolvedMessage,
          interpretation,
          studio,
          clusterId: "general_help",
        }),
      };
      const producer = producerResponseFromInterpretation(
        resolvedMessage,
        interpretation,
        interpretContext(input),
        studio,
        input.billingContext
      );
      return {
        memory,
        messages: [
          userMessage,
          producerMessage({
            ...producer,
            shortReply: `${reuseReply} ${producer.shortReply}`.trim(),
          }),
        ],
      };
    }
  }

  if (memory.pendingPrefillId) {
    const existing = loadAssistantPrefillPackage(memory.pendingPrefillId);
    if (existing && existing.readiness === "waiting_for_answer") {
      if (existing.interpretation) {
        const resolvedInterp = tryResolveInterpretationAnswerFromMessage(
          existing.interpretation,
          input.message
        );
        if (resolvedInterp) {
          const applied = applyInterpretationAnswerToPrefill(
            existing,
            existing.interpretation,
            resolvedInterp.questionId,
            resolvedInterp.answer
          );
          const pkg = finalizePrefillPackage(applied.pkg, input.snapshot, activeProject);
          memory = { ...memory, pendingPrefillId: pkg.id };
          return {
            memory,
            messages: [userMessage, prefillProposalMessage(pkg, studio, input.locale)],
          };
        }
      }

      const resolved = tryResolvePrefillAnswerFromMessage(existing, input.message);
      if (resolved) {
        const updated = applyPrefillAnswer(existing, resolved.questionId, resolved.answer);
        const pkg = finalizePrefillPackage(updated, input.snapshot, activeProject);
        memory = { ...memory, pendingPrefillId: pkg.id };
        return {
          memory,
          messages: [userMessage, prefillProposalMessage(pkg, studio, input.locale)],
        };
      }
    }
  }

  const routeCtx = routeContextFromProject(activeProject);
  const interpretCtx = interpretContext(input);

  const interpretation =
    input.interpretation ?? interpretConversationally(resolvedMessage, interpretCtx);

  if (
    interpretation &&
    !shouldShowProducerFirst(interpretation) &&
    interpretation.likelyActionId !== "unknown"
  ) {
    const built = buildPrefillPackageFromInterpretation(interpretation, routeCtx);
    if (built) {
      const pkg = finalizePrefillPackage(built, input.snapshot, activeProject);
      memory = {
        ...memory,
        pendingPrefillId: pkg.id,
        activeWizard: pkg.actionId,
        selectedProjectId: activeProject?.id ?? memory.selectedProjectId,
      };
      return {
        memory,
        messages: [userMessage, prefillProposalMessage(pkg, studio, input.locale)],
      };
    }
  }

  const prefillDetect = detectAssistantPrefillIntent(resolvedMessage);
  if (prefillDetect.kind === "prefill") {
    const built = buildAssistantPrefillPackage({
      intent: prefillDetect.intent,
      message: resolvedMessage,
      actionId: prefillDetect.actionId,
      understoodKey: prefillDetect.understoodKey,
      routeContext: routeCtx,
    });
    if (built) {
      const pkg = finalizePrefillPackage(built, input.snapshot, activeProject);
      memory = {
        ...memory,
        pendingPrefillId: pkg.id,
        activeWizard: pkg.actionId,
        selectedProjectId: activeProject?.id ?? memory.selectedProjectId,
      };
      return {
        memory,
        messages: [userMessage, prefillProposalMessage(pkg, studio, input.locale)],
      };
    }
  }

  const intent = matchAssistantIntent(resolvedMessage, {
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
        };
      case "open_latest_project": {
        const latest = pickLatestAssistantProject(listHomeCheffProjectsFiltered("hc", 200));
        if (!latest) {
          return {
            memory,
            messages: [userMessage, replyMessage("assistant.reply.noProjects")],
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
        };
      }
      case "project_status": {
        if (!activeProject) {
          return {
            memory,
            messages: [userMessage, replyMessage("assistant.reply.noActiveProject")],
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
        };
      }
      case "project_assets": {
        if (!activeProject) {
          return {
            memory,
            messages: [userMessage, replyMessage("assistant.reply.noActiveProject")],
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
        };
      }
    }
  }

  if (intent.kind === "action") {
    const route = buildAssistantActionRoute(intent.actionId, {
      ...routeContextFromProject(activeProject),
      videoIntent: intent.videoIntent,
      idea: resolvedMessage,
    });
    memory = {
      ...memory,
      activeWizard: intent.actionId,
      selectedProjectId: activeProject?.id ?? memory.selectedProjectId,
    };
    return {
      memory,
      messages: [userMessage, proposalMessage(intent.understoodKey, intent.actionId, route)],
    };
  }

  memory = {
    ...memory,
    pendingClarification: null,
    conversationMemory: updateConversationMemory(memory.conversationMemory ?? { lastEntities: [] }, {
      message: resolvedMessage,
      interpretation,
      studio,
      clusterId: interpretation?.detectedIntent,
    }),
  };

  const v3Input: AssistantV4TurnInput = {
    message: resolvedMessage,
    locale: (input.locale ?? "nl") as "nl" | "en",
    memory,
    snapshot: input.snapshot,
    studio,
    activeProject,
    editorContext: input.editorContext ?? null,
    libraryRecords: input.libraryRecords,
    pricingCatalog: input.pricingCatalog,
    pathname: input.pathname,
    billingContext: input.billingContext,
    identityPreservationOverrides: input.identityPreservationOverrides,
  };
  const v3Turn = processAssistantV4Turn(v3Input);
  if (v3Turn.handled && v3Turn.producerResponse && v3Turn.v3Response) {
    if (v3Turn.memoryPatch?.v3) {
      memory = { ...memory, v3: v3Turn.memoryPatch.v3 };
    }
    if (v3Turn.memoryPatch?.selectedAssetId !== undefined) {
      memory = { ...memory, selectedAssetId: v3Turn.memoryPatch.selectedAssetId };
    }
    if (v3Turn.memoryPatch?.conversationMemory) {
      memory = { ...memory, conversationMemory: v3Turn.memoryPatch.conversationMemory };
    }
    memory = { ...memory, lastIntent: "assistant_v3_copilot" };
    return {
      memory,
      messages: [userMessage, v3CopilotMessage(v3Turn.v3Response, v3Turn.producerResponse)],
    };
  }

  return {
    memory,
    messages: [
      userMessage,
      producerMessage(
        producerResponseFromInterpretation(
          resolvedMessage,
          interpretation,
          interpretCtx,
          studio,
          input.billingContext
        )
      ),
    ],
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

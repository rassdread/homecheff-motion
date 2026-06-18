/**
 * Assistant V4 — Production Director & Tool Awareness.
 */

import {
  processAssistantV3Turn,
  resolveAssistantV3AssetContext,
  resolveAssistantV3PartContext,
  type AssistantV3TurnInput,
} from "@/lib/assistant-v3-intelligence";
import { v3ResponseToProducerResponse } from "@/lib/assistant-v3-intelligence";
import { analyzeAssetConsistency } from "@/lib/assistant-v4-consistency-director";
import {
  buildAssistantExecutionPreview,
  buildInsufficientCreditsMessage,
  buildToolAwareOpeningLine,
} from "@/lib/assistant-v4-execution-preview";
import { computeProductionReadinessScore } from "@/lib/assistant-v4-readiness-score";
import { buildAssistantRiskWarnings } from "@/lib/assistant-v4-risk-warnings";
import { explainNoToolAvailable, matchAssistantTool } from "@/lib/assistant-tool-matcher";
import type { AssistantBillingContext } from "@/types/studio-billing";
import type { AssistantV3CopilotInsight, AssistantV3DynamicAction } from "@/types/assistant-v3";
import type {
  AssistantV4CopilotResponse,
  AssistantV4DynamicAction,
  AssistantV4TurnResult,
} from "@/types/assistant-v4";

export type AssistantV4TurnInput = AssistantV3TurnInput & {
  billingContext?: AssistantBillingContext;
};

function nl(locale: "nl" | "en", nlText: string, enText: string): string {
  return locale === "en" ? enText : nlText;
}

function isActionableToolRequest(message: string): boolean {
  return /(maak|make|groter|kleiner|bigger|smaller|blauw|blue|kleur|color|cartoon|mascot|mascotte|outfit|voice|stem|render|export|vrolijker|happier|expressie|expression)/i.test(
    message
  );
}

function enrichActionWithTool(
  action: AssistantV3DynamicAction,
  toolMatch: ReturnType<typeof matchAssistantTool>,
  estimatedCredits?: number
): AssistantV4DynamicAction {
  if (!toolMatch) {
    return action;
  }
  return {
    ...action,
    route: action.route ?? toolMatch.route,
    morphActionId: action.morphActionId ?? toolMatch.morphActionId,
    toolId: toolMatch.bestTool.toolId,
    estimatedCredits,
    settings: toolMatch.recommendedSettings,
  };
}

function consistencyToInsights(
  suggestions: ReturnType<typeof analyzeAssetConsistency>,
  locale: "nl" | "en"
): AssistantV3CopilotInsight[] {
  return suggestions.map((s) => ({
    id: s.id,
    message: locale === "en" ? s.messageEn : s.messageNl,
    severity: s.severity === "warning" ? "warning" : s.severity === "info" ? "info" : "suggestion",
    optional: true as const,
  }));
}

function readinessToInsight(
  readiness: NonNullable<ReturnType<typeof computeProductionReadinessScore>>,
  locale: "nl" | "en"
): AssistantV3CopilotInsight {
  const missingLabels = readiness.missing.map((m) => (locale === "en" ? m.labelEn : m.labelNl)).join(", ");
  return {
    id: "readiness_score",
    message: nl(
      locale,
      `Project readiness: ${readiness.scorePercent}%. Ontbreekt: ${missingLabels || "niets kritisch"}. Volgende stap: ${readiness.recommendedNextStepNl}`,
      `Project readiness: ${readiness.scorePercent}%. Missing: ${missingLabels || "nothing critical"}. Next step: ${readiness.recommendedNextStepEn}`
    ),
    severity: readiness.scorePercent >= 80 ? "info" : "suggestion",
    optional: true,
  };
}

export function enhanceAssistantV4Response(
  v3: import("@/types/assistant-v3").AssistantV3CopilotResponse,
  input: AssistantV4TurnInput
): AssistantV4CopilotResponse {
  const availableCredits = input.billingContext?.walletAvailableCredits ?? 0;
  const asset = resolveAssistantV3AssetContext(input);
  const part = resolveAssistantV3PartContext(input, asset?.assetName);

  const toolMatch = isActionableToolRequest(input.message)
    ? matchAssistantTool({
        message: input.message,
        locale: input.locale,
        turnInput: input,
        availableCredits,
        pricingCatalog: input.pricingCatalog,
      })
    : null;

  const riskWarnings = buildAssistantRiskWarnings(input, toolMatch);
  const executionPreview =
    toolMatch &&
    buildAssistantExecutionPreview({
      locale: input.locale,
      message: input.message,
      match: toolMatch,
      availableCredits,
      assetName: asset?.assetName,
      partName: part?.partName,
      riskWarnings,
    });

  const readinessScore = computeProductionReadinessScore(input, availableCredits);
  const consistencySuggestions = analyzeAssetConsistency(input);

  let openingLine = v3.openingLine;
  let body = v3.body;

  if (executionPreview && !toolMatch?.blocked) {
    openingLine = buildToolAwareOpeningLine({
      locale: input.locale,
      preview: executionPreview,
      assetName: asset?.assetName,
      partName: part?.partName,
    });
    const preserveBody =
      executionPreview.preserveItems.length > 0
        ? nl(
            input.locale,
            `Behouden: ${executionPreview.preserveItems.join(", ")}.`,
            `Preserving: ${executionPreview.preserveItems.join(", ")}.`
          )
        : "";
    const costBody =
      executionPreview.estimatedCredits > 0
        ? nl(
            input.locale,
            `Geschatte kosten: ±${executionPreview.estimatedCredits} credits.`,
            `Estimated cost: ~${executionPreview.estimatedCredits} credits.`
          )
        : "";
    if (!executionPreview.sufficientCredits && executionPreview.estimatedCredits > 0) {
      body = [
        preserveBody,
        costBody,
        buildInsufficientCreditsMessage(input.locale, availableCredits, executionPreview.estimatedCredits),
        nl(
          input.locale,
          "Koop credits, upgrade je abonnement, of kies een goedkoper alternatief.",
          "Buy credits, upgrade your plan, or pick a cheaper alternative."
        ),
      ]
        .filter(Boolean)
        .join(" ");
    } else {
      body = [preserveBody, costBody].filter(Boolean).join(" ") || body;
    }
  } else if (toolMatch?.blocked && toolMatch.blockedReason) {
    openingLine = toolMatch.blockedReason;
    body = "";
  } else if (isActionableToolRequest(input.message) && !toolMatch) {
    openingLine = explainNoToolAvailable(input.locale, asset?.assetType);
  }

  const insights = [
    ...v3.insights,
    ...consistencyToInsights(consistencySuggestions, input.locale),
  ];
  if (readinessScore && (input.activeProject || input.studio.project)) {
    insights.push(readinessToInsight(readinessScore, input.locale));
  }

  const actionGroups = v3.actionGroups.map((group) => ({
    ...group,
    actions: group.actions.map((action) =>
      enrichActionWithTool(action, toolMatch, executionPreview?.estimatedCredits)
    ),
  }));

  if (toolMatch && actionGroups.length === 0 && !toolMatch.blocked) {
    actionGroups.push({
      id: "v4_tool",
      label: nl(input.locale, "Aanbevolen actie", "Recommended action"),
      actions: [
        {
          id: toolMatch.bestTool.toolId,
          label: input.locale === "en" ? toolMatch.bestTool.displayNameEn : toolMatch.bestTool.displayNameNl,
          promptMessage: input.message,
          route: toolMatch.route,
          morphActionId: toolMatch.morphActionId,
          actionId: toolMatch.actionId,
          toolId: toolMatch.bestTool.toolId,
          estimatedCredits: executionPreview?.estimatedCredits,
          settings: toolMatch.recommendedSettings,
        },
      ],
    });
  }

  return {
    ...v3,
    version: 4,
    openingLine,
    body,
    actionGroups,
    insights: insights.slice(0, 5),
    toolMatch,
    executionPreview,
    readinessScore,
    consistencySuggestions,
  };
}

export function processAssistantV4Turn(input: AssistantV4TurnInput): AssistantV4TurnResult {
  const v3Turn = processAssistantV3Turn(input);
  if (!v3Turn.handled || !v3Turn.v3Response) {
    return { handled: v3Turn.handled, memoryPatch: v3Turn.memoryPatch };
  }

  const v4Response = enhanceAssistantV4Response(v3Turn.v3Response, input);
  const producerResponse = v3ResponseToProducerResponse(
    v4Response as unknown as import("@/types/assistant-v3").AssistantV3CopilotResponse
  );

  if (producerResponse.shortReply !== v4Response.openingLine) {
    producerResponse.shortReply = [v4Response.openingLine, v4Response.body].filter(Boolean).join(" ");
  }

  return {
    handled: true,
    memoryPatch: v3Turn.memoryPatch,
    v3Response: v4Response,
    producerResponse,
  };
}

export function buildAssistantV4PrefillRoute(preview: NonNullable<AssistantV4CopilotResponse["executionPreview"]>): string {
  return preview.route;
}

import {
  buildGeneralHelpInterpretation,
  clusterOptionActionId,
  clusterOptionRoute,
  type IntentClusterId,
} from "@/lib/assistant-intent-clusters";
import type { AssistantInterpretation, AssistantInterpretationContext } from "@/types/assistant-interpretation";
import type { ProducerResponse, ProducerResponseOption } from "@/types/assistant-producer";
import type { AssistantStudioContext } from "@/types/assistant-studio-brain";
import { buildLibraryMascotProducerOptions, enrichMascotInterpretationWithLibrary } from "@/lib/assistant-library-intelligence";
import { buildProducerProductionPlan } from "@/lib/assistant-producer-planner";
import { buildSyncAssistantBillingPreview } from "@/lib/assistant-billing-awareness";
import {
  buildCheapestPathReply,
  estimateProducerPlanCost,
  isCheapestPathQuestion,
} from "@/lib/assistant-cost-estimate";
import type { AssistantBillingContext } from "@/types/studio-billing";
import { buildExecutionChainForPreset } from "@/lib/assistant-execution-chain";

function isNl(locale?: string): boolean {
  return !locale || locale.startsWith("nl");
}

function mapAlternativesToOptions(
  interpretation: AssistantInterpretation,
  nl: boolean
): ProducerResponseOption[] {
  const fromAlternatives =
    interpretation.alternativeIntents?.map((alt, index) => ({
      id: `alt_${alt.intent}_${index}`,
      label: alt.label,
      promptMessage: alt.label,
      actionId: clusterOptionActionId(alt.intent),
      route: clusterOptionRoute(alt.intent),
    })) ?? [];

  if (fromAlternatives.length > 0) {
    return fromAlternatives.slice(0, 5);
  }

  const fromQuestions = interpretation.followUpQuestions.flatMap((question) =>
    question.options.slice(0, 3).map((option, index) => ({
      id: `${question.id}_${index}`,
      label: option,
      promptMessage: option,
    }))
  );

  return fromQuestions.slice(0, 5);
}

function producerShortReply(
  interpretation: AssistantInterpretation,
  context: AssistantInterpretationContext,
  clusterId?: IntentClusterId
): string {
  const nl = isNl(context.locale);

  if (clusterId === "mascot_variant") {
    const base = nl
      ? "Ik denk dat je een alternatieve versie van een mascotte wilt maken."
      : "I think you want to create an alternative version of a mascot.";
    const question = nl
      ? "Wil je een bestaande mascotte aanpassen of een nieuwe mascotte ontwerpen?"
      : "Do you want to adapt an existing mascot or design a new one?";
    return `${base} ${question}`;
  }

  if (interpretation.confidence === "low" || interpretation.detectedIntent === "producer_guidance") {
    if (includesHelpPhrase(interpretation.originalMessage)) {
      return nl ? "Zeker. Waar wil je mee starten?" : "Sure. What would you like to start with?";
    }
    return nl
      ? "Dit is de beste volgende actie — kies hieronder een richting."
      : "This is the best next action — pick a direction below.";
  }

  if (interpretation.confidence === "medium") {
    return nl
      ? `${interpretation.understoodGoal} Klopt dat? Kies hieronder een richting.`
      : `${interpretation.understoodGoal} Does that sound right? Pick a direction below.`;
  }

  return interpretation.understoodGoal;
}

function includesHelpPhrase(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes("kan je me helpen") ||
    text.includes("kun je me helpen") ||
    text.includes("can you help me") ||
    text.includes("help me")
  );
}

function producerQuestions(interpretation: AssistantInterpretation): string[] {
  return interpretation.followUpQuestions.map((q) => q.label).slice(0, 3);
}

function resolveBillingActionType(
  interpretation: AssistantInterpretation
): import("@/server/studio-account/studio-action-cost-registry").StudioActionType | string {
  if (interpretation.detectedIntent === "create_motion_video" || interpretation.targetModule === "motion") {
    return "motion_render";
  }
  if (interpretation.detectedIntent === "mascot_variant" || interpretation.targetModule === "characters") {
    return "character_generation";
  }
  if (interpretation.targetModule === "publish") {
    return "publish_export";
  }
  return "ai_analysis";
}

export function buildProducerResponse(input: {
  message: string;
  interpretation: AssistantInterpretation;
  context: AssistantInterpretationContext;
  clusterId?: IntentClusterId;
  studio?: AssistantStudioContext | null;
  billingContext?: AssistantBillingContext;
}): ProducerResponse {
  let interpretation = input.interpretation;
  const { context, clusterId, studio } = input;
  if (clusterId === "mascot_variant" && studio) {
    interpretation = enrichMascotInterpretationWithLibrary(interpretation, studio, context.locale);
  }
  const nl = isNl(context.locale);
  const requiresLogin = context.isAuthenticated === false;
  const options =
    clusterId === "mascot_variant" && studio && studio.characters.length > 0
      ? buildLibraryMascotProducerOptions(
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
          context.locale
        )
      : mapAlternativesToOptions(interpretation, nl);

  const canPrepare =
    interpretation.likelyActionId !== "unknown" &&
    interpretation.confidence !== "low" &&
    interpretation.missingInputs.length === 0;

  let shortReply = producerShortReply(interpretation, context, clusterId);

  if (requiresLogin && clusterId === "mascot_variant") {
    shortReply += nl
      ? " Je kunt het idee bekijken, maar om een mascotte op te slaan moet je inloggen."
      : " You can explore the idea, but you need to sign in to save a mascot.";
  }

  const mascotCount = context.snapshot?.library.characters.length ?? 0;
  if (clusterId === "mascot_variant" && mascotCount > 0 && !shortReply.includes("bibliotheek")) {
    shortReply += nl
      ? ` Ik zie dat je al mascottes/personages in je bibliotheek hebt. Wil je daar een variant van maken?`
      : ` I see you already have mascots/characters in your library. Want to make a variant from one of those?`;
  }

  if (options.length === 0) {
    options.push(
      ...(nl
        ? [
            { id: "photo", label: "Iets maken met een foto", promptMessage: "Iets maken met een foto" },
            { id: "video", label: "Een video maken", promptMessage: "Een video maken" },
            { id: "character", label: "Een personage maken", promptMessage: "Een personage maken" },
          ]
        : [
            { id: "photo", label: "Make something from a photo", promptMessage: "Make something from a photo" },
            { id: "video", label: "Make a video", promptMessage: "Make a video" },
            { id: "character", label: "Create a character", promptMessage: "Create a character" },
          ])
    );
  }

  const productionPlan = studio
    ? buildProducerProductionPlan({
        message: input.message,
        interpretation,
        studio,
        locale: context.locale,
      })
    : undefined;

  const costEstimate = productionPlan && studio
    ? estimateProducerPlanCost(productionPlan, studio, context.locale)
    : undefined;

  const executionChain =
    studio && interpretation.likelyPresetId
      ? buildExecutionChainForPreset(
          interpretation.likelyPresetId as import("@/types/motion-action-presets").MotionActionPresetId,
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
          context.locale
        ) ?? undefined
      : undefined;

  if (isCheapestPathQuestion(input.message) && studio) {
    shortReply = buildCheapestPathReply(studio, context.locale);
  }

  if (costEstimate) {
    shortReply = `${shortReply} ${costEstimate.summary}`.trim();
  }

  if (
    input.billingContext?.walletAvailableCredits != null &&
    interpretation.confidence !== "low"
  ) {
    const billingPreview = buildSyncAssistantBillingPreview({
      actionType: resolveBillingActionType(interpretation),
      planId: input.billingContext.studioPlan,
      availableCredits: input.billingContext.walletAvailableCredits,
      studio,
      locale: context.locale,
      overrideCredits: productionPlan?.estimatedCredits,
    });
    const billingSummary = nl ? billingPreview.summaryNl : billingPreview.summaryEn;
    shortReply = `${shortReply} ${billingSummary}`.trim();
    if (costEstimate) {
      costEstimate.estimatedCredits = billingPreview.estimatedCredits;
      costEstimate.summary = billingSummary;
    }
  }

  return {
    understoodGoal: interpretation.understoodGoal,
    confidence: interpretation.confidence,
    shortReply,
    options,
    questions: producerQuestions(interpretation),
    suggestedAction:
      interpretation.likelyActionId !== "unknown" ? interpretation.likelyActionId : undefined,
    suggestedRoute: interpretation.suggestedRoute,
    canPrepare,
    requiresLogin,
    missingInputs: interpretation.missingInputs,
    clusterId,
    productionPlan,
    costEstimate,
    executionChain: executionChain ?? undefined,
  };
}

export function isGenericAssistantFallbackMessageKey(messageKey: string): boolean {
  return messageKey === "assistant.reply.unknown";
}

export function producerResponseFromInterpretation(
  message: string,
  interpretation: AssistantInterpretation | null | undefined,
  context: AssistantInterpretationContext,
  studio?: AssistantStudioContext | null,
  billingContext?: AssistantBillingContext
): ProducerResponse {
  const resolved =
    interpretation ?? buildGeneralHelpInterpretation(message, context);

  const clusterId =
    resolved.detectedIntent === "mascot_variant"
      ? ("mascot_variant" as const)
      : resolved.detectedIntent === "producer_guidance"
        ? ("general_help" as const)
        : undefined;

  return buildProducerResponse({
    message,
    interpretation: resolved,
    context,
    clusterId,
    studio,
    billingContext,
  });
}

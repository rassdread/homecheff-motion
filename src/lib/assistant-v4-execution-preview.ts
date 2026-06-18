/**
 * Execution preview builder for Assistant V4.
 */

import { settingsToPreserveLabels } from "@/lib/assistant-v4-route-builder";
import { inferChangedTraits, profilePreserveLabels } from "@/lib/assistant-identity-preservation";
import type { AssistantRiskWarning } from "@/lib/assistant-v4-risk-warnings";
import type {
  AssistantExecutionPreview,
  AssistantToolMatchResult,
} from "@/types/assistant-v4";

function nl(locale: "nl" | "en", nlText: string, enText: string): string {
  return locale === "en" ? enText : nlText;
}

export function buildAssistantExecutionPreview(input: {
  locale: "nl" | "en";
  message: string;
  match: AssistantToolMatchResult | null;
  availableCredits: number;
  assetName?: string;
  partName?: string;
  riskWarnings?: AssistantRiskWarning[];
}): AssistantExecutionPreview | null {
  const { match, locale, availableCredits } = input;
  if (!match) {
    return null;
  }

  if (match.blocked) {
    return {
      toolId: match.bestTool.toolId,
      toolDisplayNameNl: match.bestTool.displayNameNl,
      toolDisplayNameEn: match.bestTool.displayNameEn,
      goal: input.message,
      changeSummaryNl: "Geblokkeerd",
      changeSummaryEn: "Blocked",
      preserveItems: [],
      estimatedCredits: 0,
      availableCredits,
      sufficientCredits: true,
      resultSummaryNl: match.blockedReason ?? "Deze actie is niet toegestaan.",
      resultSummaryEn: match.blockedReason ?? "This action is not allowed.",
      route: match.route,
      settings: match.recommendedSettings,
      status: "blocked",
      requiresConfirmation: false,
      ctas: [
        { id: "cancel", labelNl: "Begrepen", labelEn: "Got it" },
      ],
    };
  }

  if (match.unavailable) {
    return {
      toolId: match.bestTool.toolId,
      toolDisplayNameNl: match.bestTool.displayNameNl,
      toolDisplayNameEn: match.bestTool.displayNameEn,
      goal: input.message,
      changeSummaryNl: "Niet beschikbaar",
      changeSummaryEn: "Unavailable",
      preserveItems: [],
      estimatedCredits: match.estimatedCredits,
      availableCredits,
      sufficientCredits: availableCredits >= match.estimatedCredits,
      resultSummaryNl: match.unavailableReason ?? "Deze tool is nu niet beschikbaar.",
      resultSummaryEn: match.unavailableReason ?? "This tool is not available right now.",
      route: match.route,
      settings: match.recommendedSettings,
      status: "unavailable",
      requiresConfirmation: false,
      ctas: [{ id: "cancel", labelNl: "Annuleren", labelEn: "Cancel" }],
    };
  }

  const preserveItems = [
    ...new Set([
      ...settingsToPreserveLabels(match.recommendedSettings, locale),
      ...(match.identityProfile ? profilePreserveLabels(match.identityProfile, locale) : []),
      ...match.preserveConstraints,
    ]),
  ];

  const changedTraitLabels =
    match.identityDrift?.changedTraits ??
    (match.identityProfile ? inferChangedTraits(input.message, match.identityProfile) : []);

  const asset = input.assetName ?? "asset";
  const part = input.partName;
  const operation = String(match.recommendedSettings.operation ?? match.recommendedSettings.expression ?? "");
  const changeSummaryNl = part
    ? `${part} ${operation || "aanpassen"}`
    : match.bestTool.displayNameNl;
  const changeSummaryEn = part
    ? `${part} ${operation || "adjust"}`
    : match.bestTool.displayNameEn;

  const sufficientCredits = availableCredits >= match.estimatedCredits || match.estimatedCredits === 0;
  const requiresConfirmation = match.estimatedCredits > 0 && !match.bestTool.isFreeLocal;

  const primaryRisk = input.riskWarnings?.[0];
  const ctas: AssistantExecutionPreview["ctas"] = [];

  if (!sufficientCredits && match.estimatedCredits > 0) {
    ctas.push(
      { id: "buy_credits", labelNl: "Koop credits", labelEn: "Buy credits", route: "/pricing" },
      { id: "upgrade", labelNl: "Upgrade abonnement", labelEn: "Upgrade plan", route: "/pricing" }
    );
    if (match.alternativeTools[0]) {
      ctas.push({
        id: "cheaper_alternative",
        labelNl: "Goedkoper alternatief",
        labelEn: "Cheaper alternative",
        route: match.alternativeTools[0].route,
      });
    }
    ctas.push({ id: "cancel", labelNl: "Annuleren", labelEn: "Cancel" });
  } else if (requiresConfirmation) {
    ctas.push(
      { id: "execute", labelNl: "Uitvoeren", labelEn: "Execute", route: match.route },
      { id: "adjust", labelNl: "Instellingen aanpassen", labelEn: "Adjust settings" },
      { id: "cancel", labelNl: "Annuleren", labelEn: "Cancel" }
    );
  } else {
    ctas.push(
      { id: "execute", labelNl: "Open workflow", labelEn: "Open workflow", route: match.route },
      { id: "cancel", labelNl: "Annuleren", labelEn: "Cancel" }
    );
  }

  return {
    toolId: match.bestTool.toolId,
    toolDisplayNameNl: match.bestTool.displayNameNl,
    toolDisplayNameEn: match.bestTool.displayNameEn,
    goal: nl(locale, `${asset} — ${input.message}`, `${asset} — ${input.message}`),
    changeSummaryNl,
    changeSummaryEn,
    preserveItems,
    estimatedCredits: match.estimatedCredits,
    availableCredits,
    sufficientCredits,
    resultSummaryNl: nl(locale, "Nieuwe variant in de Editor", "New variant in the Editor"),
    resultSummaryEn: "New variant in the Editor",
    riskWarningNl: primaryRisk?.messageNl ?? match.identityDrift?.warningNl,
    riskWarningEn: primaryRisk?.messageEn ?? match.identityDrift?.warningEn,
    route: match.route,
    settings: match.recommendedSettings,
    status: sufficientCredits ? (requiresConfirmation ? "pending_confirmation" : "ready") : "pending_confirmation",
    requiresConfirmation,
    ctas,
    cheaperAlternativeToolId: match.alternativeTools[0]?.toolId,
    identityRetentionPercent: match.identityDrift?.identityRetentionPercent,
    changedTraitLabels: [...new Set(changedTraitLabels)],
    identityDriftWarningNl: match.identityDrift?.warningNl,
    identityDriftWarningEn: match.identityDrift?.warningEn,
  };
}

export function buildInsufficientCreditsMessage(
  locale: "nl" | "en",
  available: number,
  estimated: number
): string {
  return nl(
    locale,
    `Je hebt ${available} credits. Deze actie kost ongeveer ${estimated} credits.`,
    `You have ${available} credits. This action costs about ${estimated} credits.`
  );
}

export function buildToolAwareOpeningLine(input: {
  locale: "nl" | "en";
  preview: AssistantExecutionPreview;
  assetName?: string;
  partName?: string;
}): string {
  const { preview, locale, partName } = input;
  const toolName = locale === "en" ? preview.toolDisplayNameEn : preview.toolDisplayNameNl;
  const preserve =
    preview.preserveItems.length > 0
      ? preview.preserveItems.join(", ")
      : locale === "en"
        ? "unchanged elements"
        : "onveranderde onderdelen";

  if (partName && /enlarge|groter|eyes|ogen/i.test(`${preview.changeSummaryNl} ${preview.changeSummaryEn}`)) {
    return nl(
      locale,
      `Ik raad aan: ${partName.toLowerCase()} groter maken (${preserve} behouden).`,
      `I recommend: enlarge ${partName.toLowerCase()} (keeping ${preserve}).`
    );
  }

  if (preview.toolId === "pet_to_mascot") {
    return nl(
      locale,
      "Ik raad aan: je hond omzetten naar mascotte met ras en vacht behouden.",
      "I recommend: turn your dog into a mascot while preserving breed and fur."
    );
  }

  if (preview.toolId === "mascot_expression_morph") {
    const asset = input.assetName ?? (locale === "en" ? "the mascot" : "de mascotte");
    return nl(
      locale,
      `Ik raad aan: ${asset} vrolijker maken (wereldbol, outfit, pose behouden).`,
      `I recommend: make ${asset} happier (keeping globe, outfit, pose).`
    );
  }

  return nl(
    locale,
    `Ik raad aan: ${toolName.toLowerCase()} (±${preview.estimatedCredits} credits).`,
    `I recommend: ${toolName.toLowerCase()} (~${preview.estimatedCredits} credits).`
  );
}

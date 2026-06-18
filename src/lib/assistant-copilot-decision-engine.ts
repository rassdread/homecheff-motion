/**
 * Studio Copilot Clarity Mode — ranks actions and limits default UI surface.
 */

import type { AssistantV4DynamicAction } from "@/types/assistant-v4";
import type {
  AssistantClarityDecision,
  AssistantClarityPresentation,
  AssistantCopilotMode,
  CopilotDecisionAction,
  CopilotSecondaryGroup,
} from "@/types/assistant-clarity";
import type { AssistantV4CopilotResponse } from "@/types/assistant-v4";
import type { AssistantV4TurnInput } from "@/lib/assistant-v4-intelligence";

const MAX_PRIMARY = 3;
const MAX_SECONDARY_GROUPS = 6;
const MAX_WARNINGS_DEFAULT = 1;

function nl(locale: "nl" | "en", nlText: string, enText: string): string {
  return locale === "en" ? enText : nlText;
}

export function userRequestedAllOptions(message: string): boolean {
  return /alle opties|all options|toon alles|show all/i.test(message);
}

export function resolveCopilotMode(
  input: AssistantV4TurnInput,
  reasoningProfile?: "editor" | "producer"
): AssistantCopilotMode {
  const path = input.pathname ?? "";
  if (path.startsWith("/editor")) return "editor";
  if (path.startsWith("/publish")) return "publish";
  if (path.startsWith("/animate") || path.startsWith("/motion")) return "motion";
  if (input.activeProject || path.startsWith("/projects") || path.startsWith("/studio")) {
    return reasoningProfile === "editor" ? "editor" : "producer";
  }
  return "studio";
}

function actionFromV4(row: AssistantV4DynamicAction, locale: "nl" | "en"): CopilotDecisionAction {
  return {
    id: row.id,
    labelNl: row.label,
    labelEn: row.label,
    kind: row.route ? "route" : "prompt",
    route: row.route,
    promptMessage: row.promptMessage,
    toolId: row.toolId,
    estimatedCredits: row.estimatedCredits,
  };
}

function executeAction(locale: "nl" | "en"): CopilotDecisionAction {
  return {
    id: "execute",
    labelNl: "Uitvoeren",
    labelEn: "Execute",
    kind: "execute",
  };
}

function adjustAction(locale: "nl" | "en"): CopilotDecisionAction {
  return {
    id: "adjust",
    labelNl: "Instellingen aanpassen",
    labelEn: "Adjust settings",
    kind: "adjust",
  };
}

function moreOptionsAction(locale: "nl" | "en"): CopilotDecisionAction {
  return {
    id: "more_options",
    labelNl: "Meer opties",
    labelEn: "More options",
    kind: "more_options",
  };
}

function expertModeAction(locale: "nl" | "en"): CopilotDecisionAction {
  return {
    id: "expert_mode",
    labelNl: "Expertmodus",
    labelEn: "Expert mode",
    kind: "expert",
  };
}

function buildContextHeader(
  v4: AssistantV4CopilotResponse,
  input: AssistantV4TurnInput,
  mode: AssistantCopilotMode,
  locale: "nl" | "en"
): { nl: string; en: string } {
  const asset = v4.assetContext?.assetName;
  const part = v4.partContext?.partName;

  if (mode === "editor" && asset) {
    if (part) {
      return {
        nl: `${asset} geselecteerd · ${part} actief`,
        en: `${asset} selected · ${part} active`,
      };
    }
    return { nl: `${asset} geselecteerd`, en: `${asset} selected` };
  }

  if (mode === "producer" && v4.readinessScore) {
    const title = v4.projectInsight?.title ?? input.activeProject?.title ?? "Project";
    return {
      nl: `${title} · ${v4.readinessScore.scorePercent}% klaar`,
      en: `${title} · ${v4.readinessScore.scorePercent}% ready`,
    };
  }

  if (mode === "motion") {
    return {
      nl: asset ? `${asset} · Motion render` : "Motion · render instellingen",
      en: asset ? `${asset} · Motion render` : "Motion · render settings",
    };
  }

  if (mode === "publish") {
    const score = v4.readinessScore?.scorePercent;
    return {
      nl: score != null ? `Export · ${score}% klaar` : "Export · publicatie",
      en: score != null ? `Export · ${score}% ready` : "Export · publishing",
    };
  }

  if (asset) {
    return { nl: asset, en: asset };
  }
  return {
    nl: "Studio Copilot",
    en: "Studio Copilot",
  };
}

function buildRecommendation(
  v4: AssistantV4CopilotResponse,
  input: AssistantV4TurnInput,
  mode: AssistantCopilotMode,
  locale: "nl" | "en"
): { nl: string; en: string } {
  const preview = v4.executionPreview;
  if (preview && preview.status !== "blocked" && preview.status !== "unavailable") {
    const change = locale === "en" ? preview.changeSummaryEn : preview.changeSummaryNl;
    return {
      nl: `Ik raad aan: ${change.toLowerCase()}`,
      en: `I recommend: ${change.toLowerCase()}`,
    };
  }

  if (mode === "producer" && v4.readinessScore) {
    return {
      nl: `Dit is de beste volgende actie: ${v4.readinessScore.recommendedNextStepNl.toLowerCase()}`,
      en: `This is the best next action: ${v4.readinessScore.recommendedNextStepEn.toLowerCase()}`,
    };
  }

  if (v4.toolMatch && !v4.toolMatch.blocked) {
    const tool =
      locale === "en" ? v4.toolMatch.bestTool.displayNameEn : v4.toolMatch.bestTool.displayNameNl;
    return {
      nl: `Ik raad aan: ${tool.toLowerCase()}`,
      en: `I recommend: ${tool.toLowerCase()}`,
    };
  }

  if (v4.understoodGoal) {
    return {
      nl: `Ik raad aan: ${v4.understoodGoal.slice(0, 120)}`,
      en: `I recommend: ${v4.understoodGoal.slice(0, 120)}`,
    };
  }

  return {
    nl: "Dit is de beste volgende actie voor je huidige context.",
    en: "This is the best next action for your current context.",
  };
}

function collectWarnings(
  v4: AssistantV4CopilotResponse,
  locale: "nl" | "en"
): Array<{ nl: string; en: string; severity: number }> {
  const rows: Array<{ nl: string; en: string; severity: number }> = [];

  if (
    v4.executionPreview &&
    !v4.executionPreview.sufficientCredits &&
    v4.executionPreview.estimatedCredits > 0
  ) {
    rows.push({
      nl: `Je hebt ${v4.executionPreview.availableCredits} credits. Deze actie kost ongeveer ${v4.executionPreview.estimatedCredits} credits.`,
      en: `You have ${v4.executionPreview.availableCredits} credits. This action costs about ${v4.executionPreview.estimatedCredits} credits.`,
      severity: 4,
    });
  }

  if (v4.executionPreview?.identityDriftWarningNl) {
    rows.push({
      nl: v4.executionPreview.identityDriftWarningNl,
      en: v4.executionPreview.identityDriftWarningEn ?? v4.executionPreview.identityDriftWarningNl,
      severity: 5,
    });
  }

  if (v4.executionPreview?.riskWarningNl) {
    rows.push({
      nl: v4.executionPreview.riskWarningNl,
      en: v4.executionPreview.riskWarningEn ?? v4.executionPreview.riskWarningNl,
      severity: 3,
    });
  }

  for (const s of v4.consistencySuggestions) {
    if (s.severity === "warning") {
      rows.push({ nl: s.messageNl, en: s.messageEn, severity: 3 });
    }
  }

  for (const w of v4.toolMatch?.warnings ?? []) {
    rows.push({ nl: w, en: w, severity: 2 });
  }

  for (const insight of v4.insights) {
    if (insight.severity === "warning") {
      rows.push({ nl: insight.message, en: insight.message, severity: 2 });
    }
  }

  return rows.sort((a, b) => b.severity - a.severity);
}

function buildSecondaryGroups(
  v4: AssistantV4CopilotResponse,
  input: AssistantV4TurnInput,
  locale: "nl" | "en",
  excludeIds: Set<string>
): CopilotSecondaryGroup[] {
  const groups: CopilotSecondaryGroup[] = [];
  const mode = resolveCopilotMode(input, v4.reasoningProfile);

  if (mode === "editor" && (v4.assetContext?.assetType === "mascot" || /globe|mascot/i.test(v4.assetContext?.assetName ?? ""))) {
    const mascotGroups: Array<{ id: string; nl: string; en: string; prompts: string[] }> = [
      { id: "expression", nl: "Expressie", en: "Expression", prompts: ["maak hem vrolijker", "serieuzer gezicht"] },
      { id: "outfit", nl: "Outfit", en: "Outfit", prompts: ["chef outfit", "garden outfit", "designer outfit"] },
      { id: "pose", nl: "Pose", en: "Pose", prompts: ["andere pose", "sta rechtop"] },
      { id: "style", nl: "Stijl", en: "Style", prompts: ["cartoon stijl", "seasonal styling"] },
      { id: "props", nl: "Props", en: "Props", prompts: ["voeg gereedschap toe", "plantenmand"] },
    ];
    for (const row of mascotGroups) {
      groups.push({
        id: row.id,
        labelNl: row.nl,
        labelEn: row.en,
        actions: row.prompts.map((prompt, index) => ({
          id: `${row.id}_${index}`,
          labelNl: prompt,
          labelEn: prompt,
          kind: "prompt" as const,
          promptMessage: prompt,
        })),
      });
    }
    return groups.slice(0, MAX_SECONDARY_GROUPS);
  }

  for (const group of v4.actionGroups) {
    const actions = group.actions
      .filter((a) => !excludeIds.has(a.id))
      .slice(0, 4)
      .map((a) => actionFromV4(a, locale));
    if (actions.length === 0) continue;
    groups.push({
      id: group.id,
      labelNl: group.label,
      labelEn: group.label,
      actions,
    });
    if (groups.length >= MAX_SECONDARY_GROUPS) break;
  }

  if (v4.toolMatch?.alternativeTools.length) {
    groups.push({
      id: "alternatives",
      labelNl: "Alternatieven",
      labelEn: "Alternatives",
      actions: v4.toolMatch.alternativeTools.slice(0, 4).map((tool) => ({
        id: tool.toolId,
        labelNl: tool.displayNameNl,
        labelEn: tool.displayNameEn,
        kind: "route" as const,
        route: tool.route,
        toolId: tool.toolId,
        estimatedCredits: tool.estimatedCredits,
      })),
    });
  }

  return groups.slice(0, MAX_SECONDARY_GROUPS);
}

function rankPrimaryActions(
  v4: AssistantV4CopilotResponse,
  input: AssistantV4TurnInput,
  mode: AssistantCopilotMode,
  locale: "nl" | "en",
  showAll: boolean
): CopilotDecisionAction[] {
  const primary: CopilotDecisionAction[] = [];

  if (v4.executionPreview && v4.executionPreview.status !== "blocked") {
    if (!v4.executionPreview.sufficientCredits && v4.executionPreview.estimatedCredits > 0) {
      for (const cta of v4.executionPreview.ctas.filter((c) => c.id !== "cancel").slice(0, 2)) {
        primary.push({
          id: cta.id,
          labelNl: cta.labelNl,
          labelEn: cta.labelEn,
          kind: "route",
          route: cta.route,
        });
      }
    } else if (v4.executionPreview.sufficientCredits && v4.executionPreview.requiresConfirmation) {
      primary.push(executeAction(locale));
      primary.push(adjustAction(locale));
    } else if (v4.executionPreview.route) {
      primary.push({
        id: "open_workflow",
        labelNl: "Je kunt dit nu uitvoeren",
        labelEn: "You can run this now",
        kind: "execute",
        route: v4.executionPreview.route,
      });
    }
  } else if (v4.readinessScore?.recommendedRoute && mode === "producer") {
    primary.push({
      id: "readiness_next",
      labelNl: v4.readinessScore.recommendedNextStepNl.slice(0, 48),
      labelEn: v4.readinessScore.recommendedNextStepEn.slice(0, 48),
      kind: "route",
      route: v4.readinessScore.recommendedRoute,
    });
  } else {
    const top = v4.actionGroups.flatMap((g) => g.actions).slice(0, 2);
    for (const row of top) {
      primary.push(actionFromV4(row, locale));
    }
  }

  if (!showAll && primary.length < MAX_PRIMARY) {
    primary.push(moreOptionsAction(locale));
  }

  return primary.slice(0, showAll ? 12 : MAX_PRIMARY);
}

export function buildCopilotClarityDecision(
  v4: AssistantV4CopilotResponse,
  input: AssistantV4TurnInput
): AssistantClarityDecision {
  const locale = input.locale;
  const mode = resolveCopilotMode(input, v4.reasoningProfile);
  const showAll = userRequestedAllOptions(input.message);
  const contextHeader = buildContextHeader(v4, input, mode, locale);
  const recommendation = buildRecommendation(v4, input, mode, locale);
  const warnings = collectWarnings(v4, locale);
  const primaryActions = rankPrimaryActions(v4, input, mode, locale, showAll);
  const excludeIds = new Set(primaryActions.map((a) => a.id));
  const secondaryGroups = buildSecondaryGroups(v4, input, locale, excludeIds);

  const recommendedAction = primaryActions.find((a) => a.kind === "execute" || a.kind === "route") ?? primaryActions[0] ?? null;

  const expertDetails = {
    toolMatchSummary: v4.toolMatch
      ? `${v4.toolMatch.bestTool.toolId} · ±${v4.toolMatch.estimatedCredits} credits`
      : undefined,
    selectedParts: v4.partContext
      ? [v4.partContext.partName, ...v4.partContext.hierarchyPath].filter(Boolean)
      : v4.assetContext?.selectedParts ?? [],
    preserveConstraints: v4.toolMatch?.preserveConstraints ?? v4.executionPreview?.preserveItems ?? [],
    readinessDetails: v4.readinessScore
      ? nl(
          locale,
          `Score ${v4.readinessScore.scorePercent}% · ontbrekend: ${v4.readinessScore.missing.map((m) => m.labelNl).join(", ") || "niets"}`,
          `Score ${v4.readinessScore.scorePercent}% · missing: ${v4.readinessScore.missing.map((m) => m.labelEn).join(", ") || "none"}`
        )
      : undefined,
    consistencyWarnings: v4.consistencySuggestions.map((s) =>
      locale === "en" ? s.messageEn : s.messageNl
    ),
    creditBreakdown: v4.executionPreview
      ? nl(
          locale,
          `±${v4.executionPreview.estimatedCredits} credits · ${v4.executionPreview.availableCredits} beschikbaar`,
          `~${v4.executionPreview.estimatedCredits} credits · ${v4.executionPreview.availableCredits} available`
        )
      : undefined,
    alternativeTools: (v4.toolMatch?.alternativeTools ?? []).map((t) => t.toolId),
    allInsights: v4.insights.map((i) => i.message),
    fullActionGroups: v4.actionGroups,
  };

  return {
    mode,
    contextHeaderNl: contextHeader.nl,
    contextHeaderEn: contextHeader.en,
    recommendationNl: recommendation.nl,
    recommendationEn: recommendation.en,
    recommendedAction,
    primaryActions,
    secondaryGroups,
    expertDetails,
    defaultWarningNl: warnings[0]?.nl,
    defaultWarningEn: warnings[0]?.en,
    showAllOptions: showAll,
    warningCount: warnings.length,
  };
}

export function applyClarityToV4Response(
  v4: AssistantV4CopilotResponse,
  decision: AssistantClarityDecision,
  locale: "nl" | "en"
): AssistantV4CopilotResponse {
  const presentation: AssistantClarityPresentation = {
    decision,
    expertModeAction: expertModeAction(locale),
  };

  return {
    ...v4,
    openingLine: locale === "en" ? decision.recommendationEn : decision.recommendationNl,
    body: "",
    closingQuestion: undefined,
    insights: decision.showAllOptions
      ? v4.insights
      : v4.insights.filter((i) => i.severity === "warning").slice(0, MAX_WARNINGS_DEFAULT),
    actionGroups: decision.showAllOptions
      ? v4.actionGroups
      : v4.actionGroups.slice(0, 1).map((g) => ({
          ...g,
          actions: g.actions.slice(0, MAX_PRIMARY),
        })),
    clarityPresentation: presentation,
  };
}

export const COPILOT_CLARITY_LIMITS = {
  maxPrimary: MAX_PRIMARY,
  maxWarningsDefault: MAX_WARNINGS_DEFAULT,
  maxSecondaryGroups: MAX_SECONDARY_GROUPS,
};

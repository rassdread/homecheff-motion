/**
 * Workflow readiness + creative director insights for Assistant V3.5.
 */

import type { AssistantV3TurnInput } from "@/lib/assistant-v3-intelligence";
import type { AssistantV3CopilotInsight, AssistantV3ProjectInsight } from "@/types/assistant-v3";

function nl(locale: "nl" | "en", nlText: string, enText: string): string {
  return locale === "en" ? enText : nlText;
}

export function enhanceProjectWorkflowInsight(
  insight: AssistantV3ProjectInsight,
  input: AssistantV3TurnInput
): AssistantV3ProjectInsight {
  const projectId = insight.projectId;
  const scoped = input.snapshot.library;
  const translationCount = scoped.assets.filter(
    (r) => r.projectId === projectId && /translation|vertaling/i.test(r.assetName)
  ).length;
  const subtitleSignals = scoped.assets.filter(
    (r) => r.projectId === projectId && /subtitle|ondertitel|transcript/i.test(r.assetName)
  ).length;

  const missing = [...insight.missing];
  if (subtitleSignals === 0 && insight.videoCount > 0) {
    if (!missing.includes("subtitles")) {
      missing.push("subtitles");
    }
  }
  if (translationCount === 0 && insight.videoCount > 0 && input.locale === "nl") {
    if (!missing.includes("translation")) {
      missing.push("translation");
    }
  }

  let recommendedNextStep = insight.recommendedNextStep;
  if (missing.includes("subtitles") && !missing.includes("voice")) {
    recommendedNextStep = nl(input.locale, "Voeg ondertitels toe.", "Add subtitles.");
  }

  return {
    ...insight,
    subtitleCount: subtitleSignals,
    missing,
    recommendedNextStep,
  };
}

export function buildCreativeDirectorInsights(input: AssistantV3TurnInput): AssistantV3CopilotInsight[] {
  const insights: AssistantV3CopilotInsight[] = [];
  const project = input.activeProject ?? input.studio.project;
  if (!project) {
    return insights;
  }

  const characters = input.snapshot.library.characters.filter((r) => r.projectId === project.id);
  const uniqueStyles = new Set(
    characters.map((c) => (c.assetName + (c.promptSummary ?? "")).toLowerCase().slice(0, 40))
  );

  if (characters.length >= 2 && uniqueStyles.size >= 2) {
    insights.push({
      id: "character_inconsistency",
      message: nl(
        input.locale,
        "Je personages lijken visueel inconsistent over scènes — overweeg één referentiestijl.",
        "Your characters look visually inconsistent across scenes — consider one reference style."
      ),
      severity: "suggestion",
      optional: true,
    });
  }

  if (project.assetStats.videoCount > 0 && project.assetStats.exportCount === 0) {
    insights.push({
      id: "missing_cta_export",
      message: nl(
        input.locale,
        "Je story mist nog een publicatie/export met call-to-action.",
        "Your story is missing a publish/export with a call-to-action."
      ),
      severity: "suggestion",
      optional: true,
    });
  }

  const mascotCount = characters.filter((c) => /mascot|globe man|chef|garden|designer/i.test(c.assetName)).length;
  if (mascotCount >= 2) {
    insights.push({
      id: "mascot_style_drift",
      message: nl(
        input.locale,
        "Ik zie meerdere mascotte-stijlen — overweeg één consistente brand-variant.",
        "I see multiple mascot styles — consider one consistent brand variant."
      ),
      severity: "warning",
      optional: true,
    });
  }

  return insights.slice(0, 3);
}

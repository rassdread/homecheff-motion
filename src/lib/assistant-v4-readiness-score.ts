/**
 * Production readiness score for Assistant V4.
 */

import { buildAssistantActionRoute } from "@/lib/assistant-route-builder";
import { analyzeProjectCompletion, type AssistantV3TurnInput } from "@/lib/assistant-v3-intelligence";
import { enhanceProjectWorkflowInsight } from "@/lib/assistant-v3-workflow-reasoning";
import type { ProductionReadinessScore } from "@/types/assistant-v4";

export function computeProductionReadinessScore(
  input: AssistantV3TurnInput,
  availableCredits = 0
): ProductionReadinessScore | null {
  const project = input.activeProject ?? input.studio.project;
  if (!project) {
    return null;
  }

  const rawInsight = analyzeProjectCompletion(input);
  if (!rawInsight) {
    return null;
  }
  const insight = enhanceProjectWorkflowInsight(rawInsight, input);
  const scoped = input.snapshot.library;
  const voiceCount = scoped.voice.filter((r) => r.projectId === project.id).length;
  const musicCount = scoped.music.filter((r) => r.projectId === project.id).length;
  const hasMusic = musicCount > 0;
  const hasSubtitles = insight.subtitleCount > 0;
  const hasTranslation = !insight.missing.includes("translation");
  const creditsSufficient = availableCredits >= 30 || project.assetStats.videoCount === 0;

  const items = [
    {
      id: "scenes",
      labelNl: "Scènes",
      labelEn: "Scenes",
      ready: insight.videoCount > 0 || insight.sceneCountEstimate > 0,
      weight: 15,
    },
    {
      id: "characters",
      labelNl: "Personages",
      labelEn: "Characters",
      ready: insight.characterCount > 0,
      weight: 15,
    },
    {
      id: "style",
      labelNl: "Stijl",
      labelEn: "Style",
      ready: insight.characterCount > 0 || insight.videoCount > 0,
      weight: 10,
    },
    {
      id: "assets_complete",
      labelNl: "Assets compleet",
      labelEn: "Assets complete",
      ready: insight.characterCount > 0 && insight.videoCount > 0,
      weight: 10,
    },
    {
      id: "voice",
      labelNl: "Voice-over",
      labelEn: "Voice-over",
      ready: voiceCount > 0,
      weight: 15,
    },
    {
      id: "music",
      labelNl: "Muziek/geluid",
      labelEn: "Music/sound",
      ready: hasMusic,
      weight: 8,
    },
    {
      id: "subtitles",
      labelNl: "Ondertitels",
      labelEn: "Subtitles",
      ready: hasSubtitles,
      weight: 10,
    },
    {
      id: "translation",
      labelNl: "Vertaling",
      labelEn: "Translation",
      ready: hasTranslation,
      weight: 7,
    },
    {
      id: "export",
      labelNl: "Export",
      labelEn: "Export",
      ready: insight.exportCount > 0,
      weight: 10,
    },
    {
      id: "credits",
      labelNl: "Credits voldoende",
      labelEn: "Credits sufficient",
      ready: creditsSufficient,
      weight: 0,
    },
  ];

  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const earned = items.reduce((sum, i) => sum + (i.ready ? i.weight : 0), 0);
  const scorePercent = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

  const ready = items.filter((i) => i.ready && i.weight > 0);
  const missing = items.filter((i) => !i.ready && i.weight > 0);

  let recommendedNextStepNl = insight.recommendedNextStep;
  let recommendedNextStepEn = insight.recommendedNextStep;
  let recommendedRoute = insight.recommendedRoute;
  let recommendedActionId = insight.recommendedActionId;

  if (insight.missing.includes("voice")) {
    recommendedNextStepNl = "Genereer voice-over.";
    recommendedNextStepEn = "Generate voice-over.";
    recommendedActionId = "prepare_music";
    recommendedRoute = buildAssistantActionRoute("prepare_music", { projectId: project.id });
  } else if (insight.missing.includes("subtitles")) {
    recommendedNextStepNl = "Voeg ondertitels toe.";
    recommendedNextStepEn = "Add subtitles.";
    recommendedActionId = "create_publish_export";
    recommendedRoute = buildAssistantActionRoute("create_publish_export", { projectId: project.id });
  } else if (insight.missing.includes("export")) {
    recommendedNextStepNl = "Publiceer of exporteer de video.";
    recommendedNextStepEn = "Publish or export the video.";
    recommendedActionId = "create_publish_export";
    recommendedRoute = buildAssistantActionRoute("create_publish_export", { projectId: project.id });
  }

  return {
    scorePercent,
    ready,
    missing,
    recommendedNextStepNl,
    recommendedNextStepEn,
    recommendedRoute,
    recommendedActionId,
    creditsSufficient,
  };
}

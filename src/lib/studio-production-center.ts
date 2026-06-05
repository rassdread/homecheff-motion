/**
 * Studio V29 — AI Production Center orchestrator.
 */

import {
  buildProductionCostBreakdown,
  formatCostEur,
  type ProductionCostBreakdown,
} from "@/lib/studio-production-costs";
import {
  buildAssetReadiness,
  buildProductionWarnings,
  computeReadinessScore,
  type AssetReadinessItem,
  type ProductionWarning,
} from "@/lib/studio-production-readiness";
import type { ProductionProviderReport } from "@/lib/studio-production-providers";
import { buildProductionScoreReport, type ProductionScoreReport } from "@/lib/studio-production-score";
import { buildMusicDirectorPlan, isMusicPlanReady } from "@/lib/studio-music-director";
import { buildSoundDirectorPlan, isSoundPlanReady } from "@/lib/studio-sound-director";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { analyzeSceneImagePlanner } from "@/lib/studio-scene-image-planner";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import {
  sceneHasCompletedImage,
  resolveSceneDisplayImage,
} from "@/lib/studio-movie-scene-image";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type ProductionChecklistItem = {
  id: string;
  labelKey: string;
  passed: boolean;
};

export type ProductionSummaryExport = {
  projectTitle: string;
  sceneCount: number;
  storyScore: number;
  directorScore: number;
  voiceScore: number;
  visualScore: number;
  readinessScore: number;
  productionScore: number;
  qualityLabelKey: string;
  estimatedCostEur: string;
  warningCount: number;
  blockingCount: number;
  lines: string[];
};

export type ProductionCenterReport = {
  scores: ProductionScoreReport;
  assets: AssetReadinessItem[];
  warnings: ProductionWarning[];
  checklist: ProductionChecklistItem[];
  costs: ProductionCostBreakdown;
  providers: ProductionProviderReport | null;
  summary: ProductionSummaryExport;
  canStartImageGeneration: boolean;
  canStartVoiceGeneration: boolean;
  canStartVideoGeneration: boolean;
};

export function buildProductionChecklist(storyboard: StudioStoryboardDetail): ProductionChecklistItem[] {
  const scenes = storyboard.scenes ?? [];
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const intelligence = analyzeStoryIntelligence(storyboardToFlowInput(storyboard), directorProfile);
  const imagePlan = analyzeSceneImagePlanner({ storyboard, directorProfile });
  const voiceReport = analyzeVoiceDirector(storyboard);
  const musicPlan = buildMusicDirectorPlan(storyboard);
  const soundPlan = buildSoundDirectorPlan(storyboard);

  const hasStructure = scenes.length >= 2 && intelligence.storyHealthScore >= 45;
  const hasShotPlan = intelligence.plan.length === scenes.length && scenes.length > 0;
  const hasDirector =
    Boolean(storyboard.directorProfile?.trim()) ||
    Boolean(storyboard.aiDirectorPrompt?.trim());
  const sceneImagesReady = scenes.every((s) => sceneHasCompletedImage(s));
  const sceneImagesSelected = scenes.every((s) => Boolean(resolveSceneDisplayImage(s)));
  const voicePlanReady =
    !storyboard.voiceEnabled ||
    (voiceReport.settingsValid && voiceReport.script.fullNarration.trim().length > 20);
  const videoConfigReady = scenes.length >= 2 && scenes.every((s) => s.durationSeconds > 0);
  const musicPlanReady =
    musicPlan.enabled && isMusicPlanReady(musicPlan) && musicPlan.sceneCues.length > 0;
  const soundPlanReady =
    soundPlan.enabled && isSoundPlanReady(soundPlan) && soundPlan.sceneCues.length > 0;

  return [
    {
      id: "story_structure",
      labelKey: "studio.production.checklist.storyStructure",
      passed: hasStructure,
    },
    {
      id: "shot_plan",
      labelKey: "studio.production.checklist.shotPlan",
      passed: hasShotPlan,
    },
    {
      id: "director_mode",
      labelKey: "studio.production.checklist.directorMode",
      passed: hasDirector,
    },
    {
      id: "scene_images",
      labelKey: "studio.production.checklist.sceneImages",
      passed: sceneImagesReady && sceneImagesSelected,
    },
    {
      id: "voice_plan",
      labelKey: "studio.production.checklist.voicePlan",
      passed: voicePlanReady,
    },
    {
      id: "music_plan",
      labelKey: "studio.production.checklist.musicPlan",
      passed: musicPlanReady,
    },
    {
      id: "sound_plan",
      labelKey: "studio.production.checklist.soundPlan",
      passed: soundPlanReady,
    },
    {
      id: "video_config",
      labelKey: "studio.production.checklist.videoConfig",
      passed: videoConfigReady,
    },
  ];
}

export function buildProductionSummaryExport(params: {
  storyboard: StudioStoryboardDetail;
  scores: ProductionScoreReport;
  costs: ProductionCostBreakdown;
  warnings: ProductionWarning[];
}): ProductionSummaryExport {
  const blockingCount = params.warnings.filter((w) => w.severity === "blocking").length;
  const lines = [
    `Project: ${params.storyboard.title}`,
    `Scenes: ${params.storyboard.scenes.length}`,
    `Story score: ${params.scores.storyScore}/100`,
    `Director score: ${params.scores.directorScore}/100`,
    `Voice score: ${params.scores.voiceScore}/100`,
    `Visual score: ${params.scores.visualScore}/100`,
    `Readiness score: ${params.scores.readinessScore}/100`,
    `Production score: ${params.scores.overallProductionScore}/100`,
    `Estimated cost: ${formatCostEur(params.costs.totalCostEur)}`,
    `Warnings: ${params.warnings.length} (${blockingCount} blocking)`,
  ];
  return {
    projectTitle: params.storyboard.title,
    sceneCount: params.storyboard.scenes.length,
    storyScore: params.scores.storyScore,
    directorScore: params.scores.directorScore,
    voiceScore: params.scores.voiceScore,
    visualScore: params.scores.visualScore,
    readinessScore: params.scores.readinessScore,
    productionScore: params.scores.overallProductionScore,
    qualityLabelKey: params.scores.qualityLabelKey,
    estimatedCostEur: formatCostEur(params.costs.totalCostEur),
    warningCount: params.warnings.length,
    blockingCount,
    lines,
  };
}

export function buildProductionCenterReport(params: {
  storyboard: StudioStoryboardDetail;
  providers?: ProductionProviderReport | null;
}): ProductionCenterReport {
  const storyboard = params.storyboard;
  const scores = buildProductionScoreReport(storyboard);
  const assets = buildAssetReadiness(storyboard);
  const warnings = buildProductionWarnings(storyboard);
  const checklist = buildProductionChecklist(storyboard);
  const voiceReport = analyzeVoiceDirector(storyboard);

  const costs = buildProductionCostBreakdown({
    storyboard,
    voiceDurationSeconds: voiceReport.timing.estimatedSeconds,
    voiceScriptCharacters: voiceReport.script.fullNarration.length,
  });

  const providers = params.providers ?? null;

  const openaiOk =
    !providers || providers.providers.find((p) => p.id === "openai")?.status === "connected";
  const elevenOk =
    !providers || providers.providers.find((p) => p.id === "elevenlabs")?.status === "connected";
  const viduOk =
    !providers || providers.providers.find((p) => p.id === "vidu")?.status === "connected";

  if (scores.overallProductionScore < 50) {
    warnings.push({
      code: "low_production_score",
      severity: "warning",
      messageKey: "studio.production.warning.lowProductionScore",
      params: { score: scores.overallProductionScore, threshold: 50 },
    });
  }

  const summary = buildProductionSummaryExport({
    storyboard,
    scores,
    costs,
    warnings,
  });

  return {
    scores,
    assets,
    warnings,
    checklist,
    costs,
    providers,
    summary,
    canStartImageGeneration: openaiOk && assets.find((a) => a.id === "image")?.level !== "not_ready",
    canStartVoiceGeneration:
      openaiOk &&
      (!storyboard.voiceEnabled || (elevenOk && assets.find((a) => a.id === "voice")?.level === "ready")),
    canStartVideoGeneration: viduOk && assets.find((a) => a.id === "video")?.level !== "not_ready",
  };
}

export function formatProductionSummaryText(summary: ProductionSummaryExport): string {
  return summary.lines.join("\n");
}

/**
 * Unified analysis cost engine — upfront credits before execution.
 * Pricing derived from observed staging COGS × 65% target gross margin.
 */

import { resolveMotionAnalysisCache } from "@/lib/motion-analysis-cache";
import { buildMusicVideoProductionPlan } from "@/lib/studio-music-video-plan";
import {
  buildProductionPricingEstimate,
  cogsUsdToCustomerCredits,
  computeProductionCogs,
  grossMarginAtWorstPack,
  OBSERVED_ANALYSIS_USD,
  resolveProductionPricingShell,
} from "@/lib/studio-production-pricing-engine";
import { buildVideoPlanContract } from "@/lib/studio-video-plan-contract";
import { buildUniqueAssetLearningPlan } from "@/lib/studio-unique-asset-learning";
import { VIDEO_PLAN_PHASE_KEYS } from "@/types/studio-video-plan-contract";
import type { AudioAnalysisProfile, StudioAnalysisPlan, StudioVideoIntent } from "@/types/studio-video-production";

const ANALYSIS_TYPES = [
  "image_analysis",
  "audio_analysis",
  "video_analysis",
  "style_dna",
  "motion_identity",
  "character_intelligence",
  "motion_ready",
  "brand_protection",
  "subtitle_analysis",
  "speaker_analysis",
] as const;

export type StudioAnalysisPlannerInput = {
  intent: StudioVideoIntent;
  imageCount?: number;
  photoCount?: number;
  targetDurationSeconds?: number;
  hasUploadedAudio?: boolean;
  hasUploadedVideo?: boolean;
  characterCount?: number;
  characterId?: string;
  mascotCount?: number;
  logoCount?: number;
  productCount?: number;
  audioProfile?: AudioAnalysisProfile;
  cachedAnalysisSources?: string[];
  motionReadyCharacterIds?: string[];
  /** Product commercial with uploaded logo/product (no OpenAI scene gen). */
  hasCommercialUploads?: boolean;
};

function analysesForIntent(intent: StudioVideoIntent, input: StudioAnalysisPlannerInput) {
  const types: Array<(typeof ANALYSIS_TYPES)[number]> = [];

  switch (intent) {
    case "music_video":
      types.push("audio_analysis", "image_analysis");
      break;
    case "product_commercial":
      types.push("image_analysis", "brand_protection", "motion_identity");
      if (input.characterId || (input.characterCount ?? 0) > 0) {
        types.push("character_intelligence", "style_dna");
      }
      break;
    case "podcast_video":
      types.push("audio_analysis", "speaker_analysis", "subtitle_analysis");
      break;
    case "travel_vlog":
      types.push("image_analysis", "motion_identity");
      if (
        input.characterId ||
        (input.characterCount ?? 0) > 0 ||
        (input.motionReadyCharacterIds?.length ?? 0) > 0
      ) {
        types.push("character_intelligence");
      }
      break;
    case "slideshow":
    case "photo_story":
      types.push("image_analysis");
      break;
    case "documentary":
    case "presentation_video":
      types.push("image_analysis", "motion_identity");
      break;
    default:
      types.push("image_analysis", "motion_identity");
  }

  if (input.hasUploadedVideo) {
    types.push("video_analysis");
  }
  if ((input.characterCount ?? 0) > 0 && !types.includes("character_intelligence")) {
    types.push("character_intelligence");
  }
  if (input.characterId && !types.includes("character_intelligence")) {
    types.push("character_intelligence", "style_dna");
  }
  if ((input.mascotCount ?? 0) > 0) {
    types.push("brand_protection");
  }

  return [...new Set(types)];
}

function isAnalysisCached(
  type: (typeof ANALYSIS_TYPES)[number],
  input: StudioAnalysisPlannerInput
): { cached: boolean; reusableFrom?: string } {
  const sources = input.cachedAnalysisSources ?? [];
  if (type === "motion_ready" || type === "character_intelligence") {
    if ((input.motionReadyCharacterIds?.length ?? 0) > 0) {
      return { cached: true, reusableFrom: "motion_ready" };
    }
  }
  if (type === "style_dna" && sources.includes("asset_style_dna")) {
    return { cached: true, reusableFrom: "style_dna" };
  }
  if (type === "motion_identity" && (sources.includes("motion_identity_profile") || sources.includes("motion_ready"))) {
    return { cached: true, reusableFrom: sources.includes("motion_identity_profile") ? "motion_identity" : "motion_ready" };
  }
  if (type === "character_intelligence" && sources.includes("character_studio")) {
    return { cached: true, reusableFrom: "character_studio" };
  }
  if (type === "image_analysis" && sources.includes("reference_analysis")) {
    return { cached: true, reusableFrom: "vision_analysis" };
  }
  return { cached: false };
}

/** Legacy fixed-credit labels — internal audit reference only. */
const LEGACY_ANALYSIS_CREDITS: Record<(typeof ANALYSIS_TYPES)[number], number> = {
  image_analysis: 3,
  audio_analysis: 8,
  video_analysis: 10,
  style_dna: 5,
  motion_identity: 4,
  character_intelligence: 6,
  motion_ready: 0,
  brand_protection: 2,
  subtitle_analysis: 4,
  speaker_analysis: 6,
};

const USER_LINE_LEARNING = VIDEO_PLAN_PHASE_KEYS.learning;
const USER_LINE_SCENES = VIDEO_PLAN_PHASE_KEYS.scenes;
const USER_LINE_RENDER = VIDEO_PLAN_PHASE_KEYS.rendering;
const USER_LINE_FINISHING = VIDEO_PLAN_PHASE_KEYS.finishing;

/** @deprecated Pre-rebalance fixed intent pricing — for before/after reports only. */
export function buildStudioAnalysisPlanLegacy(input: StudioAnalysisPlannerInput): StudioAnalysisPlan {
  const types = analysesForIntent(input.intent, input);
  const requiredAnalyses = types.map((type) => {
    const cache = isAnalysisCached(type, input);
    return {
      type,
      labelKey: USER_LINE_LEARNING,
      credits: cache.cached ? 0 : LEGACY_ANALYSIS_CREDITS[type],
      cached: cache.cached,
      reusableFrom: cache.reusableFrom,
    };
  });
  const analysisCredits = requiredAnalyses.reduce((sum, a) => sum + a.credits, 0);

  let renderCredits = 40;
  let estimatedVideoSeconds = 30;
  let estimatedRenderMinutes = 5;
  let sceneCount = 4;
  let batchCount = 1;

  if (input.intent === "music_video" && input.audioProfile) {
    const mv = buildMusicVideoProductionPlan({ audioProfile: input.audioProfile });
    renderCredits = Math.max(1, mv.estimatedCredits - analysisCredits - 5);
    estimatedVideoSeconds = mv.estimatedDurationSeconds;
    estimatedRenderMinutes = mv.estimatedRenderMinutes;
    sceneCount = mv.sceneCount;
    batchCount = mv.mergePlan.batchCount;
  } else if (input.intent === "travel_vlog") {
    renderCredits = Math.max(1, 149 - analysisCredits - 5);
    estimatedVideoSeconds = 180;
    sceneCount = input.photoCount ?? input.imageCount ?? 4;
    batchCount = Math.ceil(sceneCount / 6);
  } else if (input.intent === "product_commercial") {
    renderCredits = Math.max(1, 53 - analysisCredits - 5);
    estimatedVideoSeconds = 30;
    sceneCount = 4;
    batchCount = 1;
  } else {
    const shell = resolveProductionPricingShell({
      intent: input.intent,
      audioProfile: input.audioProfile,
      imageCount: input.imageCount,
      photoCount: input.photoCount,
      targetDurationSeconds: input.targetDurationSeconds,
      characterId: input.characterId,
    });
    sceneCount = shell.sceneCount;
    batchCount = shell.batchCount;
    estimatedVideoSeconds = shell.estimatedVideoSeconds;
    estimatedRenderMinutes = shell.estimatedRenderMinutes;
    renderCredits = Math.max(1, shell.sceneCount * 12);
  }

  const publishCredits = 5;
  const totalCredits = analysisCredits + renderCredits + publishCredits;
  return {
    intent: input.intent,
    requiredAnalyses,
    cachedAnalyses: requiredAnalyses.filter((a) => a.cached),
    analysisCredits,
    renderCredits,
    publishCredits,
    totalCredits,
    estimatedRenderMinutes,
    estimatedVideoSeconds,
    sceneCount,
    batchCount,
    userCostLines: [
      { labelKey: USER_LINE_LEARNING, credits: analysisCredits },
      { labelKey: USER_LINE_RENDER, credits: renderCredits + publishCredits },
    ],
  };
}

export function buildStudioAnalysisPlan(input: StudioAnalysisPlannerInput): StudioAnalysisPlan {
  const contract = buildVideoPlanContract(input);
  const types = analysesForIntent(input.intent, input);
  const requiredAnalyses = types.map((type) => {
    const cache = isAnalysisCached(type, input);
    const analysisUsd = cache.cached ? 0 : (OBSERVED_ANALYSIS_USD[type] ?? 0);
    return {
      type,
      labelKey: USER_LINE_LEARNING,
      credits: cogsUsdToCustomerCredits(analysisUsd),
      cached: cache.cached,
      reusableFrom: cache.reusableFrom,
    };
  });

  const cachedAnalyses = requiredAnalyses.filter((a) => a.cached);

  const hasCommercialUploads =
    input.hasCommercialUploads ??
    ((input.logoCount ?? 0) > 0 || (input.productCount ?? 0) > 0);

  const shell = resolveProductionPricingShell({
    intent: input.intent,
    audioProfile: input.audioProfile,
    imageCount: input.imageCount,
    photoCount: input.photoCount,
    targetDurationSeconds: input.targetDurationSeconds,
    characterId: input.characterId,
    hasCommercialUploads,
    usesCharacterLedCommercial:
      input.intent === "product_commercial" && Boolean(input.characterId),
  });

  const learningPlan = buildUniqueAssetLearningPlan({
    photoCount: input.photoCount ?? input.imageCount,
    logoCount: input.logoCount,
    productCount: input.productCount,
    characterCount: input.characterId ? 1 : input.characterCount,
    mascotCount: input.mascotCount,
    audioCount: input.hasUploadedAudio || input.audioProfile ? 1 : 0,
    videoCount: input.hasUploadedVideo ? 1 : 0,
    cachedAnalysisSources: input.cachedAnalysisSources,
  });

  const pricing = buildProductionPricingEstimate({
    shell,
    learningPlan,
    includeFinishing: true,
    audioDurationSeconds: input.audioProfile?.durationSeconds,
    needsPodcastStt: input.intent === "podcast_video",
  });

  const cogs = computeProductionCogs({
    shell,
    learningPlan,
    includeFinishing: true,
    audioDurationSeconds: input.audioProfile?.durationSeconds,
    needsPodcastStt: input.intent === "podcast_video",
  });
  const margin = grossMarginAtWorstPack(contract.totalCredits, cogs.totalUsd);

  const userCostLines = contract.phases.map((phase) => ({
    labelKey: phase.titleKey,
    credits: phase.credits,
  }));

  return {
    intent: input.intent,
    requiredAnalyses,
    cachedAnalyses,
    analysisCredits: pricing.learningCredits,
    renderCredits: pricing.sceneCredits + pricing.renderCredits,
    publishCredits: pricing.finishingCredits,
    totalCredits: contract.totalCredits,
    estimatedRenderMinutes: shell.estimatedRenderMinutes,
    estimatedVideoSeconds: shell.estimatedVideoSeconds,
    sceneCount: shell.sceneCount,
    batchCount: shell.batchCount,
    userCostLines,
    videoPlanContract: contract,
    pricingEstimate: {
      estimatedCogsUsd: cogs.totalUsd,
      viduUsd: cogs.viduUsd,
      openaiUsd: cogs.openAiScenesUsd,
      analysisUsd: cogs.analysisUsd,
      blobUsd: cogs.blobUsd,
      mergeUsd: cogs.mergeUsd,
      exportUsd: cogs.exportUsd,
      retryBufferUsd: cogs.retryBufferUsd,
      targetGrossMargin: pricing.targetGrossMargin,
      grossMarginAtWorstPack: margin,
      cacheSavingsUsd: contract.cacheSavingsUsd,
    },
  };
}

export function resolveCachedAnalysisSourcesFromMotionCache(params: {
  references: Array<{ styleDna?: unknown; visionAnalysis?: unknown; motionReady?: boolean }>;
  motionReadyAnalysis?: { styleDna?: unknown; vision?: unknown } | null;
  characterStudioAnalysis?: { styleDna?: unknown; vision?: unknown } | null;
}): string[] {
  const result = resolveMotionAnalysisCache({
    references: params.references as Parameters<typeof resolveMotionAnalysisCache>[0]["references"],
    motionReadyAnalysis: params.motionReadyAnalysis as Parameters<
      typeof resolveMotionAnalysisCache
    >[0]["motionReadyAnalysis"],
    characterStudioAnalysis: params.characterStudioAnalysis as Parameters<
      typeof resolveMotionAnalysisCache
    >[0]["characterStudioAnalysis"],
  });
  return result.sources;
}

export function createStudioWorkflowTransactionId(): string {
  return `swf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

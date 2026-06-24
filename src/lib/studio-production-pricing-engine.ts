/**
 * Cost-based Studio production pricing — observed COGS × target margin → credits.
 */

import { buildLongFormProductionPlan, resolveLongFormTargetFromSeconds } from "@/lib/studio-long-form-duration";
import { buildMusicVideoProductionPlan } from "@/lib/studio-music-video-plan";
import { buildPhotoMoviePlan } from "@/lib/studio-photo-movie-plan";
import {
  OBSERVED_BLOB_USD_PER_ASSET,
  OBSERVED_BLOB_USD_PER_PRODUCTION,
  OBSERVED_ELEVENLABS_STT_USD_PER_MINUTE,
  OBSERVED_EXPORT_USD_PER_OUTPUT,
  OBSERVED_MERGE_USD_PER_BATCH,
  OBSERVED_OPENAI_USD_PER_GENERATED_SCENE,
  OBSERVED_OPENAI_VISION_USD,
  OBSERVED_RETRY_BUFFER_FRACTION,
  OBSERVED_VIDU_USD_PER_SCENE_MUSIC,
  OBSERVED_VIDU_USD_PER_SCENE_UPLOAD,
  PRICING_EUR_TO_USD,
  TARGET_GROSS_MARGIN,
  WORST_CASE_EUR_PER_CREDIT,
} from "@/lib/studio-production-pricing-observed";
import type { UniqueAssetLearningPlan } from "@/lib/studio-unique-asset-learning";
import { splitSceneIndicesIntoBalancedBatches } from "@/lib/studio-render-batch-planner";
import { studioVideoIntentDefaultDuration } from "@/lib/studio-video-intents";
import type { AudioAnalysisProfile, StudioVideoIntent } from "@/types/studio-video-production";

export type ProductionPricingShell = {
  sceneCount: number;
  batchCount: number;
  estimatedVideoSeconds: number;
  estimatedRenderMinutes: number;
  openAiSceneCount: number;
  viduUsdPerScene: number;
  ffmpegMergeRequired: boolean;
};

export type ProductionCogsBreakdown = {
  analysisUsd: number;
  openAiScenesUsd: number;
  viduUsd: number;
  mergeUsd: number;
  exportUsd: number;
  voiceUsd: number;
  blobUsd: number;
  retryBufferUsd: number;
  totalUsd: number;
};

export type ProductionPricingEstimate = ProductionCogsBreakdown & {
  targetGrossMargin: number;
  targetRevenueUsd: number;
  sceneCount: number;
  batchCount: number;
  learningCredits: number;
  sceneCredits: number;
  renderCredits: number;
  finishingCredits: number;
  totalCredits: number;
};

/** Observed analysis COGS (USD) — charged only on cache miss. */
export const OBSERVED_ANALYSIS_USD: Record<string, number> = {
  image_analysis: OBSERVED_OPENAI_VISION_USD,
  audio_analysis: OBSERVED_OPENAI_VISION_USD,
  video_analysis: OBSERVED_OPENAI_VISION_USD * 2,
  style_dna: OBSERVED_OPENAI_VISION_USD,
  motion_identity: OBSERVED_OPENAI_VISION_USD,
  character_intelligence: OBSERVED_OPENAI_VISION_USD,
  brand_protection: OBSERVED_OPENAI_VISION_USD,
  subtitle_analysis: OBSERVED_OPENAI_VISION_USD,
  speaker_analysis: OBSERVED_OPENAI_VISION_USD,
  motion_ready: 0,
};

export function worstCaseRevenueUsdPerCredit(): number {
  return WORST_CASE_EUR_PER_CREDIT / PRICING_EUR_TO_USD;
}

/** COGS → customer credits at worst pack price with TARGET_GROSS_MARGIN. */
export function cogsUsdToCustomerCredits(cogsUsd: number): number {
  if (cogsUsd <= 0) {
    return 0;
  }
  const targetRevenueUsd = cogsUsd / (1 - TARGET_GROSS_MARGIN);
  return Math.max(1, Math.ceil(targetRevenueUsd / worstCaseRevenueUsdPerCredit()));
}

export function grossMarginAtWorstPack(credits: number, cogsUsd: number): number {
  if (credits <= 0) {
    return 0;
  }
  const revenueUsd = credits * worstCaseRevenueUsdPerCredit();
  return (revenueUsd - cogsUsd) / revenueUsd;
}

export function resolveProductionPricingShell(input: {
  intent: StudioVideoIntent;
  audioProfile?: AudioAnalysisProfile;
  imageCount?: number;
  photoCount?: number;
  targetDurationSeconds?: number;
  characterId?: string;
  hasCommercialUploads?: boolean;
  usesCharacterLedCommercial?: boolean;
}): ProductionPricingShell {
  const photoCount = Math.max(0, input.photoCount ?? input.imageCount ?? 0);

  if (input.intent === "music_video" && input.audioProfile) {
    const mv = buildMusicVideoProductionPlan({ audioProfile: input.audioProfile });
    const batchCount = splitSceneIndicesIntoBalancedBatches(mv.sceneCount).length;
    return {
      sceneCount: mv.sceneCount,
      batchCount,
      estimatedVideoSeconds: mv.estimatedDurationSeconds,
      estimatedRenderMinutes: mv.estimatedRenderMinutes,
      openAiSceneCount: mv.sceneCount,
      viduUsdPerScene: OBSERVED_VIDU_USD_PER_SCENE_MUSIC,
      ffmpegMergeRequired: mv.mergePlan.ffmpegMergeRequired,
    };
  }

  if (
    input.intent === "travel_vlog" ||
    input.intent === "slideshow" ||
    input.intent === "photo_story"
  ) {
    const count = Math.max(4, photoCount || 4);
    const plan = buildPhotoMoviePlan({ photoCount: count, intent: input.intent });
    const batchCount = splitSceneIndicesIntoBalancedBatches(plan.sceneCount).length;
    return {
      sceneCount: plan.sceneCount,
      batchCount,
      estimatedVideoSeconds: plan.targetSeconds,
      estimatedRenderMinutes: plan.estimatedRenderMinutes,
      openAiSceneCount: 0,
      viduUsdPerScene: OBSERVED_VIDU_USD_PER_SCENE_UPLOAD,
      ffmpegMergeRequired: plan.ffmpegMergeRequired,
    };
  }

  const targetSeconds =
    input.targetDurationSeconds ?? studioVideoIntentDefaultDuration(input.intent);
  const lf = buildLongFormProductionPlan(resolveLongFormTargetFromSeconds(targetSeconds));
  const batchCount = splitSceneIndicesIntoBalancedBatches(lf.sceneCount).length;

  const usesUploads =
    input.hasCommercialUploads === true ||
    (input.intent === "product_commercial" && !input.usesCharacterLedCommercial);

  let openAiSceneCount = 0;
  if (!usesUploads) {
    if (
      input.intent === "documentary" ||
      input.intent === "presentation_video" ||
      input.usesCharacterLedCommercial ||
      Boolean(input.characterId)
    ) {
      openAiSceneCount = lf.sceneCount;
    }
  }

  return {
    sceneCount: lf.sceneCount,
    batchCount,
    estimatedVideoSeconds: lf.targetSeconds,
    estimatedRenderMinutes: lf.estimatedRenderMinutes,
    openAiSceneCount,
    viduUsdPerScene: OBSERVED_VIDU_USD_PER_SCENE_UPLOAD,
    ffmpegMergeRequired: lf.ffmpegMergeRequired,
  };
}

export function computeProductionCogs(params: {
  shell: ProductionPricingShell;
  learningPlan?: UniqueAssetLearningPlan;
  uncachedAnalysisTypes?: string[];
  includeFinishing?: boolean;
  audioDurationSeconds?: number;
  needsPodcastStt?: boolean;
}): ProductionCogsBreakdown {
  const uncached = params.uncachedAnalysisTypes ?? [];

  let analysisUsd = 0;
  if (params.learningPlan) {
    analysisUsd += params.learningPlan.totalImagesToAnalyze * OBSERVED_OPENAI_VISION_USD;
    analysisUsd += params.learningPlan.totalAudioToAnalyze * OBSERVED_OPENAI_VISION_USD;
    analysisUsd += params.learningPlan.totalVideoToAnalyze * OBSERVED_OPENAI_VISION_USD * 2;
    analysisUsd += params.learningPlan.totalUniqueProfilesBillable * OBSERVED_OPENAI_VISION_USD;
  } else {
    analysisUsd = uncached.reduce(
      (sum, type) => sum + (OBSERVED_ANALYSIS_USD[type] ?? OBSERVED_OPENAI_VISION_USD),
      0
    );
  }

  if (params.needsPodcastStt && params.audioDurationSeconds) {
    analysisUsd +=
      (params.audioDurationSeconds / 60) * (OBSERVED_ELEVENLABS_STT_USD_PER_MINUTE * 60);
  }

  const openAiScenesUsd = params.shell.openAiSceneCount * OBSERVED_OPENAI_USD_PER_GENERATED_SCENE;
  const viduUsd = params.shell.sceneCount * params.shell.viduUsdPerScene;
  const mergeUsd =
    params.shell.ffmpegMergeRequired && params.shell.batchCount > 1
      ? OBSERVED_MERGE_USD_PER_BATCH * Math.max(0, params.shell.batchCount - 1)
      : 0;
  const exportUsd = params.includeFinishing !== false ? OBSERVED_EXPORT_USD_PER_OUTPUT : 0;
  const voiceUsd = 0;
  const assetCount =
    (params.learningPlan?.totalImagesToAnalyze ?? 0) +
    params.shell.sceneCount +
    (params.includeFinishing !== false ? 2 : 0);
  const blobUsd =
    OBSERVED_BLOB_USD_PER_PRODUCTION + assetCount * OBSERVED_BLOB_USD_PER_ASSET;
  const baseUsd = analysisUsd + openAiScenesUsd + viduUsd + mergeUsd + exportUsd + voiceUsd + blobUsd;
  const retryBufferUsd = baseUsd * OBSERVED_RETRY_BUFFER_FRACTION;

  return {
    analysisUsd,
    openAiScenesUsd,
    viduUsd,
    mergeUsd,
    exportUsd,
    voiceUsd,
    blobUsd,
    retryBufferUsd,
    totalUsd: baseUsd + retryBufferUsd,
  };
}

export function buildProductionPricingEstimate(params: {
  shell: ProductionPricingShell;
  learningPlan?: UniqueAssetLearningPlan;
  uncachedAnalysisTypes?: string[];
  includeFinishing?: boolean;
  audioDurationSeconds?: number;
  needsPodcastStt?: boolean;
}): ProductionPricingEstimate {
  const cogs = computeProductionCogs(params);
  const totalCredits = cogsUsdToCustomerCredits(cogs.totalUsd);
  const targetRevenueUsd = totalCredits * worstCaseRevenueUsdPerCredit();

  let learningCredits = 0;
  let sceneCredits = 0;
  let finishingCredits = 0;
  if (cogs.totalUsd > 0 && totalCredits > 0) {
    if (cogs.analysisUsd > 0) {
      learningCredits = Math.max(1, Math.round(totalCredits * (cogs.analysisUsd / cogs.totalUsd)));
    }
    if (cogs.openAiScenesUsd > 0) {
      sceneCredits = Math.max(
        learningCredits > 0 ? 0 : 1,
        Math.round(totalCredits * (cogs.openAiScenesUsd / cogs.totalUsd))
      );
    }
    const finishingUsd = cogs.mergeUsd + cogs.exportUsd + cogs.voiceUsd + cogs.retryBufferUsd;
    if (finishingUsd > 0) {
      finishingCredits = Math.max(1, Math.round(totalCredits * (finishingUsd / cogs.totalUsd)));
    }
  }
  const renderCredits = Math.max(
    0,
    totalCredits - learningCredits - sceneCredits - finishingCredits
  );

  return {
    ...cogs,
    targetGrossMargin: TARGET_GROSS_MARGIN,
    targetRevenueUsd,
    sceneCount: params.shell.sceneCount,
    batchCount: params.shell.batchCount,
    learningCredits,
    sceneCredits,
    renderCredits: renderCredits || totalCredits,
    finishingCredits,
    totalCredits,
  };
}

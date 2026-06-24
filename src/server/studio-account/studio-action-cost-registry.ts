/**
 * Central registry for all Studio billable actions.
 * Credits are based on reservedCost + margin, not actual provider cost alone.
 */

export const STUDIO_ACTION_TYPES = [
  "ai_analysis",
  "storyboard_generation",
  "prompt_improvement",
  "voice_suggestion",
  "music_suggestion",
  "character_generation",
  "location_generation",
  "prop_generation",
  "world_generation",
  "scene_generation",
  "voice_generation",
  "voice_clone",
  "subtitle_transcription",
  "music_generation",
  "sfx_generation",
  "assistant_interpret",
  "ocr_scan",
  "vision_analysis",
  "premium_vision_analysis",
  "motion_render",
  "publish_photo_story",
  "publish_slideshow",
  "publish_voice_message",
  "publish_poster_export",
  "publish_mp4_export",
  "translation_export",
  "image_generation",
  "image_edit",
  "fusion_render",
  "transformation_session",
  "studio_orchestrator_production",
] as const;

export type StudioActionType = (typeof STUDIO_ACTION_TYPES)[number];

export type StudioConfirmationCategory = "auto" | "confirm" | "blocked_free";

export type StudioActionCostEntry = {
  actionType: StudioActionType;
  labelKey: string;
  service: "studio" | "motion" | "publish" | "editor";
  provider: string;
  /** Actual provider cost estimate (USD) */
  actualCostEstimateUsd: number;
  /** Reserved cost (USD) — basis for credit pricing */
  reservedCostUsd: number;
  /** Default credit cost derived from reserved cost + margin */
  defaultCreditCost: number;
  minimumCreditCost: number;
  confirmationCategory: StudioConfirmationCategory;
  /** Provider-cost action — blocked for free accounts without credits */
  requiresProviderCost: boolean;
};

/** Margin multiplier applied to reserved cost when converting to credits. */
export const CREDIT_MARGIN_MULTIPLIER = 2.5;
/** USD per credit unit for pricing conversion */
export const USD_PER_CREDIT = 0.005;

export function usdToCredits(usd: number, minimum = 1): number {
  const raw = Math.ceil((usd * CREDIT_MARGIN_MULTIPLIER) / USD_PER_CREDIT);
  return Math.max(minimum, raw);
}

function entry(
  actionType: StudioActionType,
  labelKey: string,
  service: StudioActionCostEntry["service"],
  provider: string,
  reservedCostUsd: number,
  actualCostEstimateUsd?: number,
  minimumCreditCost = 1,
  creditCostOverride?: number
): StudioActionCostEntry {
  const defaultCreditCost = creditCostOverride ?? usdToCredits(reservedCostUsd, minimumCreditCost);
  return {
    actionType,
    labelKey,
    service,
    provider,
    actualCostEstimateUsd: actualCostEstimateUsd ?? reservedCostUsd,
    reservedCostUsd,
    defaultCreditCost,
    minimumCreditCost,
    confirmationCategory: defaultCreditCost >= 100 ? "confirm" : "auto",
    requiresProviderCost: true,
  };
}

export const STUDIO_ACTION_COST_REGISTRY: Record<StudioActionType, StudioActionCostEntry> = {
  ai_analysis: entry("ai_analysis", "account.action.aiAnalysis", "studio", "openai", 0.005, 0.003),
  storyboard_generation: entry(
    "storyboard_generation",
    "account.action.storyboardGeneration",
    "studio",
    "openai",
    0.02
  ),
  prompt_improvement: entry(
    "prompt_improvement",
    "account.action.promptImprovement",
    "studio",
    "openai",
    0.008
  ),
  voice_suggestion: entry(
    "voice_suggestion",
    "account.action.voiceSuggestion",
    "studio",
    "openai",
    0.005
  ),
  music_suggestion: entry(
    "music_suggestion",
    "account.action.musicSuggestion",
    "studio",
    "openai",
    0.005
  ),
  character_generation: entry(
    "character_generation",
    "account.action.characterGeneration",
    "studio",
    "replicate",
    0.04
  ),
  location_generation: entry(
    "location_generation",
    "account.action.locationGeneration",
    "studio",
    "replicate",
    0.04
  ),
  prop_generation: entry("prop_generation", "account.action.propGeneration", "studio", "replicate", 0.04),
  world_generation: entry("world_generation", "account.action.worldGeneration", "studio", "replicate", 0.05),
  scene_generation: entry("scene_generation", "account.action.sceneGeneration", "studio", "replicate", 0.06),
  voice_generation: entry(
    "voice_generation",
    "account.action.voiceGeneration",
    "studio",
    "elevenlabs",
    0.03
  ),
  voice_clone: entry(
    "voice_clone",
    "account.action.voiceClone",
    "studio",
    "elevenlabs",
    1.0,
    1.0,
    1,
    400
  ),
  subtitle_transcription: entry(
    "subtitle_transcription",
    "account.action.subtitleTranscription",
    "studio",
    "elevenlabs",
    0.02
  ),
  music_generation: entry(
    "music_generation",
    "account.action.musicGeneration",
    "studio",
    "elevenlabs",
    0.08
  ),
  sfx_generation: entry(
    "sfx_generation",
    "account.action.sfxGeneration",
    "studio",
    "elevenlabs",
    0.04
  ),
  assistant_interpret: entry(
    "assistant_interpret",
    "account.action.assistantInterpret",
    "studio",
    "openai",
    0.003
  ),
  ocr_scan: entry("ocr_scan", "account.action.ocrScan", "editor", "vision", 0.008),
  vision_analysis: entry(
    "vision_analysis",
    "account.action.visionAnalysis",
    "studio",
    "openai",
    0.01
  ),
  premium_vision_analysis: entry(
    "premium_vision_analysis",
    "account.action.premiumVisionAnalysis",
    "editor",
    "openai",
    0.025,
    0.024,
    5,
    5
  ),
  motion_render: entry("motion_render", "account.action.motionRender", "motion", "vidu", 0.9, 0.7, 180),
  publish_photo_story: entry(
    "publish_photo_story",
    "account.action.publishPhotoStory",
    "publish",
    "ffmpeg",
    0.02
  ),
  publish_slideshow: entry(
    "publish_slideshow",
    "account.action.publishSlideshow",
    "publish",
    "ffmpeg",
    0.03
  ),
  publish_voice_message: entry(
    "publish_voice_message",
    "account.action.publishVoiceMessage",
    "publish",
    "ffmpeg",
    0.02
  ),
  publish_poster_export: entry(
    "publish_poster_export",
    "account.action.publishPosterExport",
    "publish",
    "ffmpeg",
    0.015
  ),
  publish_mp4_export: entry(
    "publish_mp4_export",
    "account.action.publishMp4Export",
    "publish",
    "ffmpeg",
    0.04
  ),
  translation_export: entry(
    "translation_export",
    "account.action.translationExport",
    "motion",
    "openai",
    0.05
  ),
  image_generation: entry(
    "image_generation",
    "account.action.imageGeneration",
    "editor",
    "replicate",
    0.04
  ),
  fusion_render: entry(
    "fusion_render",
    "account.action.fusionRender",
    "editor",
    "openai",
    0.04,
    0.04,
    15,
    25
  ),
  image_edit: entry("image_edit", "account.action.imageEdit", "editor", "openai", 0.03),
  transformation_session: entry(
    "transformation_session",
    "account.action.transformationSession",
    "editor",
    "replicate",
    0.06
  ),
  studio_orchestrator_production: entry(
    "studio_orchestrator_production",
    "studio.orchestrator.cost.videoCreation",
    "studio",
    "openai",
    0.12,
    0.08,
    5,
    50
  ),
};

export function getActionCost(actionType: string): StudioActionCostEntry | null {
  if (actionType in STUDIO_ACTION_COST_REGISTRY) {
    return STUDIO_ACTION_COST_REGISTRY[actionType as StudioActionType];
  }
  return null;
}

export function listAllActionCosts(): StudioActionCostEntry[] {
  return STUDIO_ACTION_TYPES.map((t) => STUDIO_ACTION_COST_REGISTRY[t]);
}

export function estimateMarginUsd(reservedCostUsd: number, creditCost: number): number {
  const revenueUsd = creditCost * USD_PER_CREDIT;
  return revenueUsd - reservedCostUsd;
}

/**
 * Complete registry of every Studio provider cost source.
 * Each entry declares provider, billing category, estimated USD, and cache eligibility.
 */

import { INTERNAL_MERGE_ESTIMATE_USD, OPENAI_OCR_ESTIMATE_USD } from "@/server/admin/render-analytics-cost";
import {
  ELEVENLABS_STT_PER_MINUTE_USD,
  ELEVENLABS_VOICE_CLONE_ESTIMATE_USD,
  OPENAI_DALLE3_IMAGE_USD,
  OPENAI_VISION_BASE_USD,
} from "@/lib/studio-cost-estimates";
import {
  OBSERVED_BLOB_USD_PER_PRODUCTION,
  OBSERVED_OPENAI_USD_PER_GENERATED_SCENE,
  OBSERVED_OPENAI_VISION_USD,
  OBSERVED_VIDU_USD_PER_SCENE_MUSIC,
  OBSERVED_VIDU_USD_PER_SCENE_UPLOAD,
} from "@/lib/studio-production-pricing-observed";
import { COST_ACTION } from "@/server/provider-cost/cost-event-types";

export type StudioCostProvider =
  | "openai"
  | "google_vision"
  | "vidu"
  | "elevenlabs"
  | "replicate"
  | "ffmpeg"
  | "vercel_blob";

export type StudioBillingCategory =
  | "orchestrator_bundle"
  | "post_production_contract"
  | "standalone_action"
  | "instrumentation_only";

export type StudioCostInventoryEntry = {
  id: string;
  feature: string;
  provider: StudioCostProvider;
  costAction: string;
  billingCategory: StudioBillingCategory;
  estimatedUsdPerUnit: number;
  unit: "request" | "scene" | "second" | "minute" | "credit" | "byte" | "merge";
  cacheEligible: boolean;
  cacheKeyHint?: string;
};

/** Authoritative inventory — every paid runtime action must map here. */
export const STUDIO_PROVIDER_COST_INVENTORY: StudioCostInventoryEntry[] = [
  {
    id: "openai_scene_generation",
    feature: "Scene image generation",
    provider: "openai",
    costAction: COST_ACTION.OPENAI_SCENE_IMAGE,
    billingCategory: "orchestrator_bundle",
    estimatedUsdPerUnit: OBSERVED_OPENAI_USD_PER_GENERATED_SCENE,
    unit: "scene",
    cacheEligible: false,
  },
  {
    id: "openai_vision_per_image",
    feature: "Vision analysis per image",
    provider: "openai",
    costAction: COST_ACTION.OPENAI_VISION,
    billingCategory: "orchestrator_bundle",
    estimatedUsdPerUnit: OBSERVED_OPENAI_VISION_USD,
    unit: "request",
    cacheEligible: true,
    cacheKeyHint: "reference_analysis",
  },
  {
    id: "openai_style_dna",
    feature: "Style DNA extraction",
    provider: "openai",
    costAction: COST_ACTION.OPENAI_CHARACTER_ANALYSIS,
    billingCategory: "orchestrator_bundle",
    estimatedUsdPerUnit: OBSERVED_OPENAI_VISION_USD,
    unit: "request",
    cacheEligible: true,
    cacheKeyHint: "asset_style_dna",
  },
  {
    id: "openai_character_analysis",
    feature: "Character identity analysis",
    provider: "openai",
    costAction: COST_ACTION.OPENAI_CHARACTER_ANALYSIS,
    billingCategory: "orchestrator_bundle",
    estimatedUsdPerUnit: OBSERVED_OPENAI_VISION_USD,
    unit: "request",
    cacheEligible: true,
    cacheKeyHint: "character_studio",
  },
  {
    id: "openai_ocr",
    feature: "OCR / baked text detection",
    provider: "openai",
    costAction: COST_ACTION.OPENAI_OCR,
    billingCategory: "standalone_action",
    estimatedUsdPerUnit: OPENAI_OCR_ESTIMATE_USD,
    unit: "request",
    cacheEligible: true,
  },
  {
    id: "openai_translation",
    feature: "Subtitle / text translation",
    provider: "openai",
    costAction: COST_ACTION.OPENAI_TRANSLATION,
    billingCategory: "post_production_contract",
    estimatedUsdPerUnit: OPENAI_VISION_BASE_USD,
    unit: "request",
    cacheEligible: false,
  },
  {
    id: "vidu_render_scene",
    feature: "Vidu render per scene",
    provider: "vidu",
    costAction: COST_ACTION.VIDU_RENDER,
    billingCategory: "orchestrator_bundle",
    estimatedUsdPerUnit: OBSERVED_VIDU_USD_PER_SCENE_UPLOAD,
    unit: "scene",
    cacheEligible: false,
  },
  {
    id: "vidu_render_music_scene",
    feature: "Vidu music video scene",
    provider: "vidu",
    costAction: COST_ACTION.VIDU_RENDER,
    billingCategory: "orchestrator_bundle",
    estimatedUsdPerUnit: OBSERVED_VIDU_USD_PER_SCENE_MUSIC,
    unit: "scene",
    cacheEligible: false,
  },
  {
    id: "elevenlabs_stt",
    feature: "Speech-to-text / subtitles",
    provider: "elevenlabs",
    costAction: COST_ACTION.ELEVENLABS_STT,
    billingCategory: "post_production_contract",
    estimatedUsdPerUnit: ELEVENLABS_STT_PER_MINUTE_USD,
    unit: "second",
    cacheEligible: false,
  },
  {
    id: "elevenlabs_tts",
    feature: "Voice synthesis",
    provider: "elevenlabs",
    costAction: COST_ACTION.ELEVENLABS_TTS,
    billingCategory: "post_production_contract",
    estimatedUsdPerUnit: 0.03,
    unit: "request",
    cacheEligible: true,
    cacheKeyHint: "voice_preview_cache",
  },
  {
    id: "elevenlabs_clone",
    feature: "Voice cloning",
    provider: "elevenlabs",
    costAction: COST_ACTION.ELEVENLABS_CLONE,
    billingCategory: "standalone_action",
    estimatedUsdPerUnit: ELEVENLABS_VOICE_CLONE_ESTIMATE_USD,
    unit: "request",
    cacheEligible: true,
  },
  {
    id: "elevenlabs_music",
    feature: "Music generation",
    provider: "elevenlabs",
    costAction: COST_ACTION.ELEVENLABS_MUSIC,
    billingCategory: "post_production_contract",
    estimatedUsdPerUnit: 0.08,
    unit: "request",
    cacheEligible: true,
  },
  {
    id: "elevenlabs_sfx",
    feature: "Sound effects",
    provider: "elevenlabs",
    costAction: COST_ACTION.ELEVENLABS_SFX,
    billingCategory: "post_production_contract",
    estimatedUsdPerUnit: 0.04,
    unit: "request",
    cacheEligible: false,
  },
  {
    id: "replicate_segment",
    feature: "Editor segmentation",
    provider: "replicate",
    costAction: COST_ACTION.REPLICATE_SEGMENT,
    billingCategory: "standalone_action",
    estimatedUsdPerUnit: 0.02,
    unit: "request",
    cacheEligible: false,
  },
  {
    id: "ffmpeg_merge",
    feature: "Multi-batch video merge",
    provider: "ffmpeg",
    costAction: COST_ACTION.INTERNAL_MERGE,
    billingCategory: "orchestrator_bundle",
    estimatedUsdPerUnit: INTERNAL_MERGE_ESTIMATE_USD,
    unit: "merge",
    cacheEligible: false,
  },
  {
    id: "ffmpeg_export",
    feature: "Publish MP4 export",
    provider: "ffmpeg",
    costAction: COST_ACTION.VIDEO_EXPORT,
    billingCategory: "orchestrator_bundle",
    estimatedUsdPerUnit: 0.02,
    unit: "request",
    cacheEligible: false,
  },
  {
    id: "ffmpeg_language_export",
    feature: "Language export render",
    provider: "ffmpeg",
    costAction: COST_ACTION.LANGUAGE_EXPORT,
    billingCategory: "post_production_contract",
    estimatedUsdPerUnit: 0.03,
    unit: "request",
    cacheEligible: false,
  },
  {
    id: "blob_upload",
    feature: "Asset storage upload",
    provider: "vercel_blob",
    costAction: COST_ACTION.STORAGE_UPLOAD,
    billingCategory: "orchestrator_bundle",
    estimatedUsdPerUnit: OBSERVED_BLOB_USD_PER_PRODUCTION,
    unit: "request",
    cacheEligible: false,
  },
  {
    id: "openai_dalle_character",
    feature: "Character reference generation",
    provider: "openai",
    costAction: COST_ACTION.OPENAI_SCENE_IMAGE,
    billingCategory: "standalone_action",
    estimatedUsdPerUnit: OPENAI_DALLE3_IMAGE_USD,
    unit: "request",
    cacheEligible: false,
  },
];

const INVENTORY_BY_ID = new Map(STUDIO_PROVIDER_COST_INVENTORY.map((e) => [e.id, e]));

export function getStudioCostInventoryEntry(id: string): StudioCostInventoryEntry | undefined {
  return INVENTORY_BY_ID.get(id);
}

export function listInventoryForBillingCategory(
  category: StudioBillingCategory
): StudioCostInventoryEntry[] {
  return STUDIO_PROVIDER_COST_INVENTORY.filter((e) => e.billingCategory === category);
}

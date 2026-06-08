import { CREDIT_USD } from "@/lib/animation-presets";
import {
  ELEVENLABS_VOICE_CLONE_ESTIMATE_USD,
  OPENAI_DALLE3_IMAGE_USD,
  OPENAI_VISION_BASE_USD,
} from "@/lib/studio-cost-estimates";
import { OPENAI_OCR_ESTIMATE_USD, INTERNAL_MERGE_ESTIMATE_USD } from "@/server/admin/render-analytics-cost";
import { BLOB_STORAGE_USD_PER_GB_MONTH_DEFAULT } from "@/lib/blob-storage-pricing";

/** Provider cost action types. */
export const COST_ACTION = {
  VIDU_RENDER: "vidu_render",
  OPENAI_OCR: "openai_ocr",
  OPENAI_SCENE_IMAGE: "openai_scene_image",
  OPENAI_VISION: "openai_vision",
  OPENAI_CHARACTER_ANALYSIS: "openai_character_analysis",
  OPENAI_TRANSLATION: "openai_translation",
  ELEVENLABS_TTS: "elevenlabs_tts",
  ELEVENLABS_STT: "elevenlabs_stt",
  ELEVENLABS_CLONE: "elevenlabs_clone",
  VOICE_PREVIEW_CACHE_HIT: "voice_preview_cache_hit",
  TEXT_RERENDER: "text_rerender",
  LANGUAGE_EXPORT: "language_export",
  VIDEO_EXPORT: "video_export",
  STORAGE_UPLOAD: "storage_upload",
  INTERNAL_MERGE: "internal_merge",
} as const;

export type CostActionType = (typeof COST_ACTION)[keyof typeof COST_ACTION];

/** Studio instrumentation events — never sync to CustomerBillingEvent. */
export const INSTRUMENTATION_ONLY_ACTIONS: ReadonlySet<CostActionType> = new Set([
  COST_ACTION.OPENAI_OCR,
  COST_ACTION.OPENAI_SCENE_IMAGE,
  COST_ACTION.OPENAI_VISION,
  COST_ACTION.OPENAI_CHARACTER_ANALYSIS,
  COST_ACTION.OPENAI_TRANSLATION,
  COST_ACTION.ELEVENLABS_TTS,
  COST_ACTION.ELEVENLABS_STT,
  COST_ACTION.ELEVENLABS_CLONE,
  COST_ACTION.VOICE_PREVIEW_CACHE_HIT,
  COST_ACTION.STORAGE_UPLOAD,
  COST_ACTION.INTERNAL_MERGE,
]);

export const COST_UNIT = {
  CREDITS: "credits",
  USD: "usd",
  TOKENS: "tokens",
  SECONDS: "seconds",
  GB: "gb",
  BYTES: "bytes",
  REQUEST: "request",
  API_CALLS: "request",
  UNKNOWN: "unknown",
} as const;

export type CostUnitType = (typeof COST_UNIT)[keyof typeof COST_UNIT];

/** Default unit costs (USD per unit). */
export const UNIT_COST_USD: Record<string, number> = {
  vidu_credit: CREDIT_USD,
  openai_ocr_call: OPENAI_OCR_ESTIMATE_USD,
  openai_scene_image: OPENAI_DALLE3_IMAGE_USD,
  openai_vision_call: OPENAI_VISION_BASE_USD,
  openai_character_analysis_call: OPENAI_VISION_BASE_USD,
  elevenlabs_clone_call: ELEVENLABS_VOICE_CLONE_ESTIMATE_USD,
  internal_merge: INTERNAL_MERGE_ESTIMATE_USD,
  language_export: 0,
  text_rerender: 0,
  video_export: 0,
  /** Monthly storage cost per byte (prorated daily). */
  storage_byte_day:
    BLOB_STORAGE_USD_PER_GB_MONTH_DEFAULT / (1024 ** 3) / 30,
};

export type CostAccuracy = "exact" | "estimated" | "pending";

/** Actions that may appear on the user-facing /mijn-verbruik page. */
export const CUSTOMER_FACING_BILLING_ACTIONS: ReadonlySet<string> = new Set([
  COST_ACTION.VIDU_RENDER,
  COST_ACTION.TEXT_RERENDER,
  COST_ACTION.LANGUAGE_EXPORT,
  COST_ACTION.VIDEO_EXPORT,
  "full_export",
]);

export function isCustomerFacingBillingAction(actionType: string): boolean {
  if (!actionType.trim()) {
    return false;
  }
  if (INSTRUMENTATION_ONLY_ACTIONS.has(actionType as CostActionType)) {
    return false;
  }
  return CUSTOMER_FACING_BILLING_ACTIONS.has(actionType);
}

export function resolveCostAccuracy(row: {
  isEstimated: boolean;
  unitsUsed: number | null;
  completedAt: Date | null | undefined;
  status: string;
}): CostAccuracy {
  if (row.status === "pending" || (row.unitsUsed == null && !row.completedAt)) {
    return "pending";
  }
  if (row.isEstimated) {
    return "estimated";
  }
  return "exact";
}

export function unitsToTotalCostUsd(units: number, unitCostUsd: number): number {
  if (!Number.isFinite(units) || units <= 0) {
    return 0;
  }
  return Math.round(units * unitCostUsd * 10000) / 10000;
}

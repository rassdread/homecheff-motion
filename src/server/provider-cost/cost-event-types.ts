import { CREDIT_USD } from "@/lib/animation-presets";
import { OPENAI_OCR_ESTIMATE_USD, INTERNAL_MERGE_ESTIMATE_USD } from "@/server/admin/render-analytics-cost";
import { BLOB_STORAGE_USD_PER_GB_MONTH_DEFAULT } from "@/lib/blob-storage-pricing";

/** Provider cost action types. */
export const COST_ACTION = {
  VIDU_RENDER: "vidu_render",
  OPENAI_OCR: "openai_ocr",
  TEXT_RERENDER: "text_rerender",
  LANGUAGE_EXPORT: "language_export",
  VIDEO_EXPORT: "video_export",
  STORAGE_UPLOAD: "storage_upload",
  INTERNAL_MERGE: "internal_merge",
} as const;

export type CostActionType = (typeof COST_ACTION)[keyof typeof COST_ACTION];

export const COST_UNIT = {
  CREDITS: "credits",
  USD: "usd",
  TOKENS: "tokens",
  BYTES: "bytes",
  API_CALLS: "api_calls",
} as const;

export type CostUnitType = (typeof COST_UNIT)[keyof typeof COST_UNIT];

/** Default unit costs (USD per unit). */
export const UNIT_COST_USD: Record<string, number> = {
  vidu_credit: CREDIT_USD,
  openai_ocr_call: OPENAI_OCR_ESTIMATE_USD,
  internal_merge: INTERNAL_MERGE_ESTIMATE_USD,
  language_export: 0,
  text_rerender: 0,
  video_export: 0,
  /** Monthly storage cost per byte (prorated daily). */
  storage_byte_day:
    BLOB_STORAGE_USD_PER_GB_MONTH_DEFAULT / (1024 ** 3) / 30,
};

export type CostAccuracy = "exact" | "estimated" | "pending";

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

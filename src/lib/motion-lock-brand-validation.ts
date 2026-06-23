/**
 * Sprint G — brand region validation (no vision API; template + variance heuristics).
 */

import type {
  MotionLockAssetValidation,
  MotionLockAssetVerdict,
  MotionLockValidationResult,
} from "@/types/motion-lock-layer";
import type { PostCompositePixelBounds } from "@/types/brand-asset-protection";

export const MOTION_LOCK_CONFIDENCE_FAIL = 0.42;
export const MOTION_LOCK_CONFIDENCE_WARN = 0.58;

export function regionPixelVariance(grayscale: Buffer): number {
  if (grayscale.length === 0) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < grayscale.length; i += 1) {
    sum += grayscale[i] ?? 0;
  }
  const mean = sum / grayscale.length;
  let variance = 0;
  for (let i = 0; i < grayscale.length; i += 1) {
    const d = (grayscale[i] ?? 0) - mean;
    variance += d * d;
  }
  return variance / grayscale.length;
}

export function normalizedRegionMatchScore(region: Buffer, reference: Buffer): number {
  const len = Math.min(region.length, reference.length);
  if (len === 0) {
    return 0;
  }
  let mad = 0;
  for (let i = 0; i < len; i += 1) {
    mad += Math.abs((region[i] ?? 0) - (reference[i] ?? 0));
  }
  mad /= len;
  return Math.max(0, Math.min(1, 1 - mad / 96));
}

export function verdictFromConfidence(confidence: number): MotionLockAssetVerdict {
  if (confidence < MOTION_LOCK_CONFIDENCE_FAIL) {
    return "FAIL";
  }
  if (confidence < MOTION_LOCK_CONFIDENCE_WARN) {
    return "WARN";
  }
  return "PASS";
}

export function validateBrandRegionInFrame(input: {
  assetId: string;
  regionGrayscale: Buffer;
  logoGrayscale: Buffer;
  frameRole?: "start" | "middle" | "end";
  samplePercent?: number;
}): MotionLockAssetValidation {
  const variance = regionPixelVariance(input.regionGrayscale);
  const match = normalizedRegionMatchScore(input.regionGrayscale, input.logoGrayscale);

  if (variance < 120) {
    return {
      assetId: input.assetId,
      validationResult: "FAIL",
      confidence: Math.min(match, 0.25),
      reason: "brand_region_low_variance_missing",
      frameRole: input.frameRole,
      samplePercent: input.samplePercent,
    };
  }

  if (match < MOTION_LOCK_CONFIDENCE_FAIL) {
    return {
      assetId: input.assetId,
      validationResult: "FAIL",
      confidence: match,
      reason: "brand_logo_not_recognizable",
      frameRole: input.frameRole,
      samplePercent: input.samplePercent,
    };
  }

  const verdict = verdictFromConfidence(match);
  return {
    assetId: input.assetId,
    validationResult: verdict,
    confidence: match,
    reason:
      verdict === "WARN" ? "brand_logo_partial_match" : "brand_logo_present",
    frameRole: input.frameRole,
    samplePercent: input.samplePercent,
  };
}

export function aggregateMotionLockValidation(
  assetResults: MotionLockAssetValidation[]
): MotionLockValidationResult {
  const byAsset = new Map<string, MotionLockAssetValidation[]>();
  for (const row of assetResults) {
    const list = byAsset.get(row.assetId) ?? [];
    list.push(row);
    byAsset.set(row.assetId, list);
  }

  const assetsMissing: string[] = [];
  const assetsDegraded: string[] = [];
  const worstPerAsset: MotionLockAssetValidation[] = [];

  for (const [assetId, rows] of byAsset) {
    const worst = rows.reduce((a, b) => (a.confidence <= b.confidence ? a : b));
    worstPerAsset.push(worst);
    if (worst.validationResult === "FAIL") {
      assetsMissing.push(assetId);
    } else if (worst.validationResult === "WARN") {
      assetsDegraded.push(assetId);
    }
  }

  const confidence =
    worstPerAsset.length > 0
      ? worstPerAsset.reduce((sum, row) => sum + row.confidence, 0) / worstPerAsset.length
      : 1;

  const enforcementRequired = assetsMissing.length > 0 || confidence < MOTION_LOCK_CONFIDENCE_FAIL;

  return {
    passed: assetsMissing.length === 0 && confidence >= MOTION_LOCK_CONFIDENCE_FAIL,
    assetsChecked: byAsset.size,
    assetsMissing,
    assetsDegraded,
    confidence,
    assetResults,
    enforcementRequired,
  };
}

export function clampPixelBounds(
  bounds: PostCompositePixelBounds,
  width: number,
  height: number
): PostCompositePixelBounds {
  const left = Math.max(0, Math.min(width - 1, bounds.left));
  const top = Math.max(0, Math.min(height - 1, bounds.top));
  const w = Math.max(1, Math.min(width - left, bounds.width));
  const h = Math.max(1, Math.min(height - top, bounds.height));
  return { left, top, width: w, height: h };
}

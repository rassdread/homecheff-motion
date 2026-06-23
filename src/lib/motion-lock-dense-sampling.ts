/**
 * Sprint H — dense segment sampling (11 points, no optical flow).
 */

import type {
  MotionLockAssetValidation,
  MotionLockAssetVerdict,
  MotionLockValidationResult,
} from "@/types/motion-lock-layer";

export const MOTION_LOCK_SAMPLE_POINTS = [
  0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
] as const;

export type MotionLockSamplePoint = (typeof MOTION_LOCK_SAMPLE_POINTS)[number];

export type MotionLockSegmentSamplingSummary = {
  sampleCount: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  worstConfidence: number;
  segmentVerdict: MotionLockAssetVerdict;
};

const VERDICT_RANK: Record<MotionLockAssetVerdict, number> = {
  PASS: 0,
  WARN: 1,
  FAIL: 2,
};

export function worstVerdict(
  a: MotionLockAssetVerdict,
  b: MotionLockAssetVerdict
): MotionLockAssetVerdict {
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

export function segmentVerdictFromSampleCounts(input: {
  passCount: number;
  warnCount: number;
  failCount: number;
}): MotionLockAssetVerdict {
  if (input.failCount > 0) {
    return "FAIL";
  }
  if (input.warnCount > 0) {
    return "WARN";
  }
  return "PASS";
}

export function summarizeDenseSegmentSampling(
  assetResults: MotionLockAssetValidation[]
): MotionLockSegmentSamplingSummary {
  const bySample = new Map<number, MotionLockAssetValidation[]>();

  for (const row of assetResults) {
    const percent = row.samplePercent ?? samplePercentFromLegacyFrameRole(row.frameRole);
    const list = bySample.get(percent) ?? [];
    list.push(row);
    bySample.set(percent, list);
  }

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let worstConfidence = 1;

  for (const rows of bySample.values()) {
    const sampleVerdict = rows.reduce<MotionLockAssetVerdict>(
      (worst, row) => worstVerdict(worst, row.validationResult),
      "PASS"
    );
    const sampleConfidence = rows.reduce(
      (min, row) => Math.min(min, row.confidence),
      1
    );
    worstConfidence = Math.min(worstConfidence, sampleConfidence);

    if (sampleVerdict === "FAIL") {
      failCount += 1;
    } else if (sampleVerdict === "WARN") {
      warnCount += 1;
    } else {
      passCount += 1;
    }
  }

  const sampleCount = bySample.size || MOTION_LOCK_SAMPLE_POINTS.length;

  return {
    sampleCount,
    passCount,
    warnCount,
    failCount,
    worstConfidence: bySample.size > 0 ? worstConfidence : 1,
    segmentVerdict: segmentVerdictFromSampleCounts({ passCount, warnCount, failCount }),
  };
}

function samplePercentFromLegacyFrameRole(
  role: MotionLockAssetValidation["frameRole"]
): number {
  if (role === "start") {
    return 0;
  }
  if (role === "end") {
    return 1;
  }
  return 0.5;
}

export function aggregateDenseMotionLockValidation(
  assetResults: MotionLockAssetValidation[]
): MotionLockValidationResult {
  const sampling = summarizeDenseSegmentSampling(assetResults);

  const byAsset = new Map<string, MotionLockAssetValidation[]>();
  for (const row of assetResults) {
    const list = byAsset.get(row.assetId) ?? [];
    list.push(row);
    byAsset.set(row.assetId, list);
  }

  const assetsMissing: string[] = [];
  const assetsDegraded: string[] = [];

  for (const [assetId, rows] of byAsset) {
    const worst = rows.reduce((a, b) =>
      VERDICT_RANK[a.validationResult] >= VERDICT_RANK[b.validationResult] ? a : b
    );
    if (worst.validationResult === "FAIL") {
      assetsMissing.push(assetId);
    } else if (worst.validationResult === "WARN") {
      assetsDegraded.push(assetId);
    }
  }

  const enforcementRequired = sampling.failCount > 0;

  return {
    passed: sampling.segmentVerdict === "PASS",
    assetsChecked: byAsset.size,
    assetsMissing,
    assetsDegraded,
    confidence: sampling.worstConfidence,
    assetResults,
    enforcementRequired,
    sampling,
  };
}

export function resolveSampleTimes(durationSec: number, fps: number): number[] {
  const frameOffset = Math.max(0, durationSec - 1 / (fps > 0 ? fps : 30));
  return MOTION_LOCK_SAMPLE_POINTS.map((point) =>
    point >= 1 ? frameOffset : Math.max(0, durationSec * point)
  );
}

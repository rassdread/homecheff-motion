import type { BrandLockedAsset, BrandMotionLockValidationMode } from "@/types/brand-asset-protection";
import type { MotionLockSegmentTrackingReport } from "@/types/motion-lock-tracking";

export const MOTION_LOCK_ENFORCEMENT_MODES = [
  "none",
  "post_composite_overlay",
] as const;

export type MotionLockEnforcementMode = (typeof MOTION_LOCK_ENFORCEMENT_MODES)[number];

export const MOTION_LOCK_ASSET_VERDICTS = ["PASS", "WARN", "FAIL"] as const;

export type MotionLockAssetVerdict = (typeof MOTION_LOCK_ASSET_VERDICTS)[number];

export type MotionLockSegment = {
  segmentId: string;
  segmentIndex: number;
  brandLockedAssets: BrandLockedAsset[];
  validationMode: BrandMotionLockValidationMode;
  enforcementMode: MotionLockEnforcementMode;
  sourceVideoUrl: string;
};

export type MotionLockAssetValidation = {
  assetId: string;
  validationResult: MotionLockAssetVerdict;
  confidence: number;
  reason: string;
  /** Legacy 3-point roles (Sprint G); dense sampling uses samplePercent. */
  frameRole?: "start" | "middle" | "end";
  /** Sprint H — normalized position along segment timeline (0–1). */
  samplePercent?: number;
};

export type MotionLockSegmentSamplingSummary = {
  sampleCount: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  worstConfidence: number;
  segmentVerdict: MotionLockAssetVerdict;
};

export type MotionLockValidationResult = {
  passed: boolean;
  assetsChecked: number;
  assetsMissing: string[];
  assetsDegraded: string[];
  confidence: number;
  assetResults: MotionLockAssetValidation[];
  enforcementRequired: boolean;
  /** Sprint H — dense sampling summary when 11-point validation ran. */
  sampling?: MotionLockSegmentSamplingSummary;
};

export type MotionLockSegmentReport = {
  segmentId: string;
  segmentIndex: number;
  validation: MotionLockValidationResult;
  validationPassed: boolean;
  enforcementApplied: boolean;
  correctedVideoPath?: string;
  sourceVideoUrl: string;
  /** Sprint H — per-segment dense sampling rollup. */
  sampling?: MotionLockSegmentSamplingSummary;
  /** Sprint I — dynamic quad tracking enforcement report. */
  tracking?: MotionLockSegmentTrackingReport;
};

export type MotionLockProjectReport = {
  projectId: string;
  segmentsChecked: number;
  segmentsCorrected: number;
  assetsLocked: number;
  segments: MotionLockSegmentReport[];
  generatedAt: string;
};

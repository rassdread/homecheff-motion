import type { BrandAssetQuad } from "@/types/brand-asset-protection";

export const MOTION_LOCK_TRACKING_MODES = ["static", "quad_interpolation"] as const;

export type MotionLockTrackingMode = (typeof MOTION_LOCK_TRACKING_MODES)[number];

export type MotionTrackedQuad = {
  frameIndex: number;
  progress: number;
  quad: BrandAssetQuad;
};

export type MotionTrackingResult = {
  trackingMode: MotionLockTrackingMode;
  trackedFrames: number;
  quads: MotionTrackedQuad[];
};

export type MotionLockSegmentTrackingReport = {
  trackingMode: MotionLockTrackingMode;
  trackedSamples: number;
  perspectiveWarpApplied: boolean;
  enforcementApplied: boolean;
  dynamicWarpCount: number;
  trackedAssetIds: string[];
};

export type MotionLockTrackingMetrics = {
  trackingModeUsage: {
    static: number;
    quad_interpolation: number;
  };
  surfaceTypeBreakdown: Record<string, number>;
  quadTrackingSuccessRate: number;
  dynamicWarpCount: number;
  trackedAssets: number;
};

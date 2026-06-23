/**
 * Sprint I — tracking telemetry for Motion Lock metrics.
 */

import type { MotionLockProjectReport, MotionLockSegmentReport } from "@/types/motion-lock-layer";
import type { MotionLockTrackingMetrics } from "@/types/motion-lock-tracking";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";
import {
  listTrackableAssets,
  resolveMotionLockAssetTrackingMode,
  resolveSegmentTrackingMode,
} from "@/lib/motion-lock-quad-tracking";

export function buildMotionLockTrackingMetrics(input: {
  brandLockedAssets: BrandLockedAsset[];
  workflowType: string;
  report: MotionLockProjectReport;
}): MotionLockTrackingMetrics {
  let staticCount = 0;
  let quadInterpolationCount = 0;
  const surfaceTypeBreakdown: Record<string, number> = {};
  let dynamicWarpCount = 0;
  let trackedSuccess = 0;
  let trackedAttempts = 0;

  for (const asset of input.brandLockedAssets) {
    const mode = resolveMotionLockAssetTrackingMode(asset, input.workflowType);
    if (mode === "quad_interpolation") {
      quadInterpolationCount += 1;
    } else {
      staticCount += 1;
    }
    const surface = asset.surfaceType ?? "unknown";
    surfaceTypeBreakdown[surface] = (surfaceTypeBreakdown[surface] ?? 0) + 1;
  }

  for (const segment of input.report.segments) {
    if (segment.tracking?.trackingMode === "quad_interpolation") {
      trackedAttempts += 1;
      if (segment.tracking.perspectiveWarpApplied) {
        trackedSuccess += 1;
      }
      dynamicWarpCount += segment.tracking.dynamicWarpCount;
    }
  }

  const trackable = listTrackableAssets(input.brandLockedAssets, input.workflowType);

  return {
    trackingModeUsage: {
      static: staticCount,
      quad_interpolation: quadInterpolationCount,
    },
    surfaceTypeBreakdown,
    quadTrackingSuccessRate:
      trackedAttempts > 0 ? trackedSuccess / trackedAttempts : trackable.length > 0 ? 1 : 0,
    dynamicWarpCount,
    trackedAssets: trackable.length,
  };
}

export function summarizeSegmentTrackingReport(input: {
  brandLockedAssets: BrandLockedAsset[];
  workflowType: string;
  enforcementApplied: boolean;
  perspectiveWarpApplied: boolean;
  dynamicWarpCount: number;
  trackedAssetIds: string[];
}): MotionLockSegmentReport["tracking"] {
  const trackingMode = resolveSegmentTrackingMode(input.brandLockedAssets, input.workflowType);
  return {
    trackingMode,
    trackedSamples: trackingMode === "quad_interpolation" ? 11 : 0,
    perspectiveWarpApplied: input.perspectiveWarpApplied,
    enforcementApplied: input.enforcementApplied,
    dynamicWarpCount: input.dynamicWarpCount,
    trackedAssetIds: input.trackedAssetIds,
  };
}

export function mergeTrackingIntoAggregate(
  aggregate: { trackingModeUsage: { static: number; quad_interpolation: number } },
  row: MotionLockTrackingMetrics
): void {
  aggregate.trackingModeUsage.static += row.trackingModeUsage.static;
  aggregate.trackingModeUsage.quad_interpolation += row.trackingModeUsage.quad_interpolation;
}

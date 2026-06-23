/**
 * Sprint I — geometric quad interpolation (no optical flow / AI).
 */

import { MOTION_LOCK_SAMPLE_POINTS } from "@/lib/motion-lock-dense-sampling";
import type {
  BrandAssetQuad,
  BrandLockedAsset,
  BrandPlacementSurfaceType,
} from "@/types/brand-asset-protection";
import type {
  MotionLockTrackingMode,
  MotionTrackedQuad,
  MotionTrackingResult,
} from "@/types/motion-lock-tracking";

export const MOTION_LOCK_STATIC_ONLY_SURFACES = new Set<BrandPlacementSurfaceType>([
  "shirt",
  "vehicle",
  "mug",
  "cup",
]);

export const MOTION_LOCK_QUAD_TRACKING_SURFACES = new Set<BrandPlacementSurfaceType>([
  "billboard",
  "poster",
  "signage",
  "packaging",
  "product_label",
  "wall",
]);

type Point = { x: number; y: number };

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  const p = clamp01(t);
  return {
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
  };
}

export function lerpQuad(start: BrandAssetQuad, end: BrandAssetQuad, t: number): BrandAssetQuad {
  return {
    topLeft: lerpPoint(start.topLeft, end.topLeft, t),
    topRight: lerpPoint(start.topRight, end.topRight, t),
    bottomRight: lerpPoint(start.bottomRight, end.bottomRight, t),
    bottomLeft: lerpPoint(start.bottomLeft, end.bottomLeft, t),
  };
}

export function predictTrackedQuad(input: {
  progress: number;
  startQuad: BrandAssetQuad;
  midQuad: BrandAssetQuad;
  endQuad: BrandAssetQuad;
}): BrandAssetQuad {
  const progress = clamp01(input.progress);
  if (progress <= 0.5) {
    return lerpQuad(input.startQuad, input.midQuad, progress / 0.5);
  }
  return lerpQuad(input.midQuad, input.endQuad, (progress - 0.5) / 0.5);
}

export function isQuadTrackingSurfaceType(
  surfaceType: BrandPlacementSurfaceType | undefined,
  workflowType?: string
): boolean {
  if (surfaceType && MOTION_LOCK_STATIC_ONLY_SURFACES.has(surfaceType)) {
    return false;
  }
  if (surfaceType && MOTION_LOCK_QUAD_TRACKING_SURFACES.has(surfaceType)) {
    return true;
  }
  if (workflowType === "product_branding") {
    return true;
  }
  return false;
}

export function resolveMotionLockAssetTrackingMode(
  asset: BrandLockedAsset,
  workflowType?: string
): MotionLockTrackingMode {
  if (!asset.quad || !asset.targetBounds) {
    return "static";
  }
  if (!isQuadTrackingSurfaceType(asset.surfaceType, workflowType)) {
    return "static";
  }
  return "quad_interpolation";
}

export function resolveKeyframeQuadsForAsset(
  assets: BrandLockedAsset[],
  assetId: string
): { startQuad: BrandAssetQuad; midQuad: BrandAssetQuad; endQuad: BrandAssetQuad } | null {
  const related = assets.filter((row) => row.assetId === assetId && row.quad);
  const fallback = related[0]?.quad;
  if (!fallback) {
    return null;
  }

  const startQuad =
    related.find((row) => row.keyframeRole === "start")?.quad ??
    related.find((row) => !row.keyframeRole)?.quad ??
    fallback;
  const midQuad =
    related.find((row) => row.keyframeRole === "middle")?.quad ?? startQuad;
  const endQuad =
    related.find((row) => row.keyframeRole === "end")?.quad ?? startQuad;

  return { startQuad, midQuad, endQuad };
}

export function buildMotionTrackingResult(input: {
  startQuad: BrandAssetQuad;
  midQuad: BrandAssetQuad;
  endQuad: BrandAssetQuad;
  samplePoints?: readonly number[];
}): MotionTrackingResult {
  const points = input.samplePoints ?? MOTION_LOCK_SAMPLE_POINTS;
  const quads: MotionTrackedQuad[] = points.map((progress, frameIndex) => ({
    frameIndex,
    progress,
    quad: predictTrackedQuad({
      progress,
      startQuad: input.startQuad,
      midQuad: input.midQuad,
      endQuad: input.endQuad,
    }),
  }));

  return {
    trackingMode: "quad_interpolation",
    trackedFrames: quads.length,
    quads,
  };
}

export function resolveSegmentTrackingMode(
  assets: BrandLockedAsset[],
  workflowType?: string
): MotionLockTrackingMode {
  return assets.some((asset) => resolveMotionLockAssetTrackingMode(asset, workflowType) === "quad_interpolation")
    ? "quad_interpolation"
    : "static";
}

export function listTrackableAssets(
  assets: BrandLockedAsset[],
  workflowType?: string
): BrandLockedAsset[] {
  return assets.filter(
    (asset) => resolveMotionLockAssetTrackingMode(asset, workflowType) === "quad_interpolation"
  );
}

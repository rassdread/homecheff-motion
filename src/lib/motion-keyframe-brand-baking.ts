/**
 * Sprint F — Motion keyframe brand baking (client-safe resolver + planning).
 * BrandLockedAsset is the single source of truth; BrandPlacement is fallback only.
 */

import type { BrandPlacement } from "@/types/studio-asset-placement";
import type {
  BrandLockedAsset,
  MotionKeyframeBrandAsset,
  MotionKeyframeBrandProtectionLog,
  MotionProjectKeyframeBrandLog,
} from "@/types/brand-asset-protection";

export function shouldBakeBrandLockedAsset(asset: BrandLockedAsset): boolean {
  if (!asset.motionLocked) {
    return false;
  }
  return asset.validationMode === "post_composite" || asset.validationMode === "keyframe_bake";
}

export function resolveMotionKeyframeBrandAssets(
  assets: BrandLockedAsset[]
): MotionKeyframeBrandAsset[] {
  return assets.filter(shouldBakeBrandLockedAsset).map((asset) => ({
    assetId: asset.assetId,
    assetUrl: asset.assetUrl,
    preserveExact: asset.preserveExact,
    preserveMode: asset.preserveMode,
    validationMode: asset.validationMode,
    targetObjectId: asset.targetObjectId,
    targetBounds: asset.targetBounds,
    quad: asset.quad,
    placementMode: asset.placementMode,
    surfaceType: asset.surfaceType,
    surfaceShape: asset.surfaceShape,
    quadSource: asset.quadSource,
    sceneId: asset.sceneId,
    segmentIndex: asset.segmentIndex,
    keyframeRole: asset.keyframeRole,
  }));
}

export function brandLockedAssetMatchesKeyframe(params: {
  asset: MotionKeyframeBrandAsset;
  sceneId?: string | null;
  segmentIndex: number;
  keyframeRole: "start" | "middle" | "end";
}): boolean {
  if (params.asset.sceneId && params.sceneId && params.asset.sceneId !== params.sceneId) {
    return false;
  }
  if (
    params.asset.segmentIndex !== undefined &&
    params.asset.segmentIndex !== params.segmentIndex
  ) {
    return false;
  }
  if (params.asset.keyframeRole && params.asset.keyframeRole !== params.keyframeRole) {
    return false;
  }
  return true;
}

export function resolveKeyframeBrandAssetsForFrame(
  assets: MotionKeyframeBrandAsset[],
  params: {
    sceneId?: string | null;
    segmentIndex: number;
    keyframeRole: "start" | "middle" | "end";
  }
): MotionKeyframeBrandAsset[] {
  if (assets.length === 0) {
    return [];
  }
  const scoped = assets.filter((asset) => brandLockedAssetMatchesKeyframe({ asset, ...params }));
  return scoped.length > 0 ? scoped : assets;
}

export function resolveKeyframeRoleForImageIndex(
  imageIndex: number,
  imageCount: number
): "start" | "middle" | "end" {
  if (imageIndex <= 0) {
    return "start";
  }
  if (imageIndex >= imageCount - 1) {
    return "end";
  }
  return "middle";
}

/** BrandLockedAsset wins over Studio BrandPlacement zone metadata. */
export function resolveBrandPlacementsForMotion(input: {
  brandLockedAssets?: BrandLockedAsset[];
  brandPlacements?: BrandPlacement[];
}): {
  source: "brand_locked" | "brand_placement" | "none";
  lockedAssets: MotionKeyframeBrandAsset[];
  placements: BrandPlacement[];
} {
  const lockedAssets = resolveMotionKeyframeBrandAssets(input.brandLockedAssets ?? []);
  if (lockedAssets.length > 0) {
    return { source: "brand_locked", lockedAssets, placements: [] };
  }
  const placements = input.brandPlacements ?? [];
  if (placements.length > 0) {
    return { source: "brand_placement", lockedAssets: [], placements };
  }
  return { source: "none", lockedAssets: [], placements: [] };
}

export function buildMotionProjectKeyframeBrandLog(input: {
  brandLockedAssets: BrandLockedAsset[];
  keyframeBrandProtectionApplied: boolean;
}): MotionProjectKeyframeBrandLog {
  return {
    brandLockedAssets: input.brandLockedAssets.length,
    keyframeBrandProtectionApplied: input.keyframeBrandProtectionApplied,
  };
}

export function logMotionKeyframeBaking(
  context: Record<string, unknown>,
  log: MotionKeyframeBrandProtectionLog
): void {
  console.info("[motion-keyframe-baking]", {
    ...context,
    assetsLocked: log.assetsLocked,
    keyframesProcessed: log.keyframesProcessed,
    perspectiveWarpApplied: log.perspectiveWarpApplied,
    postCompositeApplied: log.postCompositeApplied,
    appliedAssetIds: log.appliedAssetIds,
    skippedAssetIds: log.skippedAssetIds,
    warningCount: log.warnings.length,
  });
}

export function logMotionProjectKeyframeBrand(
  context: Record<string, unknown>,
  log: MotionProjectKeyframeBrandLog
): void {
  console.info("[motion-keyframe-baking]", {
    ...context,
    brandLockedAssets: log.brandLockedAssets,
    keyframeBrandProtectionApplied: log.keyframeBrandProtectionApplied,
  });
}

/**
 * Vidu payload audit — documents what reaches the provider after Sprint F.
 * Pixel compositing on keyframes; prompts are supplementary only.
 */
export function describeViduKeyframeBrandProtection(input: {
  startFrameProtected: boolean;
  middleFramesProtected: number;
  endFrameProtected: boolean;
  perspectiveWarpApplied: boolean;
  postCompositeApplied: boolean;
  originalAssetUrlsUsed: string[];
}): Record<string, unknown> {
  return {
    viduInputAudit: {
      startFrame: input.startFrameProtected ? "brand_protected" : "raw_preview",
      middleFrames: input.middleFramesProtected,
      endFrame: input.endFrameProtected ? "brand_protected" : "raw_preview",
      perspectiveWarpApplied: input.perspectiveWarpApplied,
      postCompositeApplied: input.postCompositeApplied,
      originalLogoAssetsUsed: input.originalAssetUrlsUsed,
      promptOnlyFallback: false,
    },
  };
}

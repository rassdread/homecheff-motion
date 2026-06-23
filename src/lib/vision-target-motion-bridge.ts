/**
 * Sprint K1.9 — motion handoff reads the same vision target as branding.
 */

import type { BrandLockedAsset, LogoPlacementBlueprint } from "@/types/brand-asset-protection";

export function applyVisionTargetRefsToBrandLockedAssets(
  assets: BrandLockedAsset[],
  blueprint: LogoPlacementBlueprint | null | undefined
): BrandLockedAsset[] {
  if (!blueprint) {
    return assets;
  }

  return assets.map((asset) => ({
    ...asset,
    targetObjectId: blueprint.targetObjectId,
    targetBounds: blueprint.targetBounds,
    quad: blueprint.quad ?? asset.quad,
    hierarchyNodeId: blueprint.hierarchyNodeId,
    partId: blueprint.partId,
    normalizedTargetKey: blueprint.normalizedTargetKey,
    placementMode: blueprint.placementMode ?? asset.placementMode,
    surfaceType: blueprint.surfaceType ?? asset.surfaceType,
    surfaceShape: blueprint.surfaceShape ?? asset.surfaceShape,
    quadSource: blueprint.quadSource ?? asset.quadSource,
  }));
}

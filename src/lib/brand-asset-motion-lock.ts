/**
 * Sprint E — Brand Asset Motion Lock payload bridge.
 * Maps ProtectedBrandAsset (single source of truth) → BrandLockedAsset for Motion handoff.
 *
 * BrandPlacement consolidation (Sprint E audit — do not remove BrandPlacement yet):
 * - BrandPlacement: Studio zone metadata (TOP_RIGHT, depth, scale) — no assetUrl/quad/bounds.
 * - BrandLockedAsset: Image protection geometry + preserve modes from fusion render.
 * - Overlap: both describe brand visibility in a scene; BrandPlacement is prompt/planning only.
 * - Conflict: zone labels can disagree with pixel quad placement — Motion Lock Layer (Sprint F+)
 *   must prefer BrandLockedAsset when present.
 * - Migration path: map BrandPlacement.zone + sceneId → optional hint on BrandLockedAsset.sceneId;
 *   eventually derive planning hints from locked assets, not parallel placement truth.
 */

import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type { EditorInstructionStudioState } from "@/types/editor-instruction-studio";
import type {
  BrandAssetProtectionResult,
  BrandLockedAsset,
  BrandMotionLockLog,
  BrandMotionLockTrackingMode,
  BrandMotionLockValidationMode,
  ProtectedBrandAsset,
} from "@/types/brand-asset-protection";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import {
  sanitizeMotionHandoffForStorage,
} from "@/lib/studio-motion-handoff-storage";
import { applyVisionTargetRefsToBrandLockedAssets } from "@/lib/vision-target-motion-bridge";

export function resolveTrackingModeForProtectedAsset(
  asset: ProtectedBrandAsset
): BrandMotionLockTrackingMode {
  if (asset.placementMode === "perspective_warp") {
    return "perspective_segment";
  }
  if (asset.preserveMode === "post_composite") {
    return "affine_segment";
  }
  return "static";
}

export function resolveValidationModeForProtectedAsset(
  asset: ProtectedBrandAsset
): BrandMotionLockValidationMode {
  if (asset.preserveMode === "post_composite") {
    return "post_composite";
  }
  if (asset.preserveMode === "reference_asset") {
    return "keyframe_bake";
  }
  return "prompt_only";
}

export function mapProtectedAssetToBrandLockedAsset(
  asset: ProtectedBrandAsset,
  options?: {
    targetObjectId?: string;
    hierarchyNodeId?: string;
    partId?: string;
    normalizedTargetKey?: string;
    sceneId?: string;
    segmentIndex?: number;
    keyframeRole?: BrandLockedAsset["keyframeRole"];
  }
): BrandLockedAsset {
  return {
    assetId: asset.id,
    assetUrl: asset.sourceUrl.trim(),
    motionLocked: true,
    preserveExact: asset.mustRemainExact,
    preserveMode: asset.preserveMode,
    targetObjectId: options?.targetObjectId,
    targetBounds: asset.targetBounds,
    quad: asset.quad,
    hierarchyNodeId: options?.hierarchyNodeId,
    partId: options?.partId,
    normalizedTargetKey: options?.normalizedTargetKey,
    placementMode: asset.placementMode,
    surfaceType: asset.surfaceType,
    surfaceShape: asset.surfaceShape,
    quadSource: asset.quadSource,
    trackingMode: resolveTrackingModeForProtectedAsset(asset),
    validationMode: resolveValidationModeForProtectedAsset(asset),
    sceneId: options?.sceneId,
    segmentIndex: options?.segmentIndex,
    keyframeRole: options?.keyframeRole,
  };
}

export function collectProtectedAssetsForMotionLock(
  protection: BrandAssetProtectionResult
): ProtectedBrandAsset[] {
  const byId = new Map<string, ProtectedBrandAsset>();
  for (const asset of [
    ...protection.assets,
    ...protection.postCompositeAssets,
    ...protection.referenceAssets,
  ]) {
    const url = asset.sourceUrl?.trim();
    if (!url) {
      continue;
    }
    byId.set(asset.id, asset);
  }
  return [...byId.values()];
}

export function buildBrandLockedAssetsFromProtection(
  protection: BrandAssetProtectionResult | null | undefined,
  options?: {
    targetObjectId?: string;
    hierarchyNodeId?: string;
    partId?: string;
    normalizedTargetKey?: string;
    sceneId?: string;
  }
): BrandLockedAsset[] {
  if (!protection?.active) {
    return [];
  }
  return collectProtectedAssetsForMotionLock(protection).map((asset) =>
    mapProtectedAssetToBrandLockedAsset(asset, {
      targetObjectId: options?.targetObjectId,
      hierarchyNodeId: options?.hierarchyNodeId,
      partId: options?.partId,
      normalizedTargetKey: options?.normalizedTargetKey,
      sceneId: options?.sceneId,
    })
  );
}

export function buildBrandMotionLockLog(assets: BrandLockedAsset[]): BrandMotionLockLog {
  const trackingModesUsed = [...new Set(assets.map((a) => a.trackingMode))];
  const validationModesUsed = [...new Set(assets.map((a) => a.validationMode))];
  const quadSourcesUsed = [
    ...new Set(
      assets.map((a) => a.quadSource).filter((s): s is NonNullable<typeof s> => Boolean(s))
    ),
  ];
  return {
    assetsLocked: assets.length,
    trackingModesUsed,
    validationModesUsed,
    quadSourcesUsed,
  };
}

export function logBrandMotionLock(
  context: Record<string, unknown>,
  assets: BrandLockedAsset[]
): void {
  if (assets.length === 0) {
    return;
  }
  const log = buildBrandMotionLockLog(assets);
  console.info("[brand-motion-lock]", {
    ...context,
    assetsLocked: log.assetsLocked,
    trackingModes: log.trackingModesUsed,
    validationModes: log.validationModesUsed,
    quadSources: log.quadSourcesUsed,
  });
}

export function logBrandLockedAssetsPersisted(
  context: Record<string, unknown>,
  persisted: boolean
): void {
  console.info("[brand-motion-lock]", {
    ...context,
    brandLockedAssetsPersisted: persisted,
  });
}

export function resolveBrandLockedAssetsFromFusionPayload(
  payload: FusionRenderPayload | null | undefined
): BrandLockedAsset[] {
  return buildBrandLockedAssetsFromProtection(payload?.brandProtection);
}

export function resolveBrandLockedAssetsFromInstructionStudioState(
  state: EditorInstructionStudioState | undefined
): BrandLockedAsset[] {
  if (!state) {
    return [];
  }
  const fromRenderPayload = resolveBrandLockedAssetsFromFusionPayload(
    state.fusionIntelligence?.renderPayload
  );
  if (fromRenderPayload.length > 0) {
    return fromRenderPayload;
  }
  const blueprint = state.logoPlacementBlueprint;
  if (!blueprint?.logoAssetUrl?.trim()) {
    return [];
  }
  const protection = buildBrandAssetProtectionLayer({
    workflowType: "logo_placement",
    logoPlacement: blueprint,
    logoAssets: [{ referenceId: "logo", url: blueprint.logoAssetUrl }],
  });
  return applyVisionTargetRefsToBrandLockedAssets(
    buildBrandLockedAssetsFromProtection(protection, {
      targetObjectId: blueprint.targetObjectId,
      hierarchyNodeId: blueprint.hierarchyNodeId,
      partId: blueprint.partId,
      normalizedTargetKey: blueprint.normalizedTargetKey,
    }),
    blueprint
  );
}

export function readBrandLockedAssetsFromHandoffJson(raw: unknown): BrandLockedAsset[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return [];
  }
  const assets = (raw as Record<string, unknown>).brandLockedAssets;
  if (!Array.isArray(assets)) {
    return [];
  }
  return assets.filter(
    (entry): entry is BrandLockedAsset =>
      Boolean(entry) &&
      typeof entry === "object" &&
      typeof (entry as BrandLockedAsset).assetId === "string" &&
      typeof (entry as BrandLockedAsset).assetUrl === "string"
  );
}

export function attachBrandMotionLockToHandoffPayload(
  payload: MotionHandoffPayload,
  assets: BrandLockedAsset[]
): MotionHandoffPayload {
  if (assets.length === 0) {
    return payload;
  }
  const existing = payload.brandLockedAssets ?? [];
  const mergedById = new Map<string, BrandLockedAsset>();
  for (const asset of [...existing, ...assets]) {
    mergedById.set(asset.assetId, asset);
  }
  const brandLockedAssets = [...mergedById.values()];
  return {
    ...payload,
    brandLockedAssets,
    brandMotionLockLog: buildBrandMotionLockLog(brandLockedAssets),
  };
}

export function attachBrandMotionLockToHandoffRecord(
  record: Record<string, unknown>,
  assets: BrandLockedAsset[]
): Record<string, unknown> {
  if (assets.length === 0) {
    return record;
  }
  const existing = readBrandLockedAssetsFromHandoffJson(record);
  const mergedById = new Map<string, BrandLockedAsset>();
  for (const asset of [...existing, ...assets]) {
    mergedById.set(asset.assetId, asset);
  }
  const brandLockedAssets = [...mergedById.values()];
  return {
    ...record,
    brandLockedAssets,
    brandMotionLockLog: buildBrandMotionLockLog(brandLockedAssets),
  };
}

export function mergeBrandLockedAssetsIntoStudioHandoffJson(
  existing: unknown,
  assets: BrandLockedAsset[],
  storyboardId: string
): Record<string, unknown> {
  if (assets.length === 0) {
    return existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  }
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {
          version: MOTION_HANDOFF_PAYLOAD_VERSION,
          storyboardId: storyboardId.trim() || "editor-brand-lock",
        };
  return sanitizeMotionHandoffForStorage(
    attachBrandMotionLockToHandoffRecord(base, assets)
  );
}

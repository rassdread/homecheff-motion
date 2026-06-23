/**
 * Client-safe post-composite planning — bounds remapping, quads, and overlay plans (no sharp).
 */

import {
  generatePlacementQuad,
  normalizedQuadToPixelQuad,
} from "@/lib/brand-asset-quad-generator";
import type {
  BrandAssetBounds,
  BrandAssetProtectionResult,
  BrandAssetQuad,
  LogoPlacementMode,
  PostCompositeFitMode,
  PostCompositeOverlayPlan,
  PostCompositePixelBounds,
  ProtectedBrandAsset,
  QuadGenerationSource,
} from "@/types/brand-asset-protection";

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function normalizedBoundsToPixelBounds(
  bounds: BrandAssetBounds,
  imageWidth: number,
  imageHeight: number
): PostCompositePixelBounds {
  const x = clamp01(bounds.x);
  const y = clamp01(bounds.y);
  const width = clamp01(bounds.width);
  const height = clamp01(bounds.height);
  const w = Math.max(1, imageWidth);
  const h = Math.max(1, imageHeight);

  const pixelWidth = Math.max(1, Math.round(width * w));
  const pixelHeight = Math.max(1, Math.round(height * h));
  const maxLeft = Math.max(0, w - pixelWidth);
  const maxTop = Math.max(0, h - pixelHeight);

  return {
    left: Math.min(maxLeft, Math.max(0, Math.round(x * w))),
    top: Math.min(maxTop, Math.max(0, Math.round(y * h))),
    width: pixelWidth,
    height: pixelHeight,
  };
}

export function defaultLogoPlacementBounds(position?: string): BrandAssetBounds {
  switch (position) {
    case "top-left":
      return { x: 0.05, y: 0.05, width: 0.22, height: 0.15, exact: false };
    case "bottom-left":
      return { x: 0.05, y: 0.8, width: 0.22, height: 0.15, exact: false };
    case "bottom-right":
      return { x: 0.72, y: 0.8, width: 0.22, height: 0.15, exact: false };
    case "center":
      return { x: 0.35, y: 0.4, width: 0.3, height: 0.2, exact: false };
    case "custom":
      return { x: 0.25, y: 0.28, width: 0.5, height: 0.35, exact: false };
    case "top-right":
    default:
      return { x: 0.72, y: 0.05, width: 0.22, height: 0.15, exact: false };
  }
}

export function resolveProtectedAssetBounds(
  asset: ProtectedBrandAsset,
  generationSettings?: Record<string, unknown>
): BrandAssetBounds | null {
  if (asset.targetBounds) {
    return asset.targetBounds;
  }
  if (asset.originalBounds) {
    return asset.originalBounds;
  }
  const position =
    typeof generationSettings?.position === "string" ? generationSettings.position : undefined;
  if (asset.preserveMode === "post_composite") {
    return defaultLogoPlacementBounds(position);
  }
  return null;
}

function resolvePlacementMode(
  asset: ProtectedBrandAsset,
  generationSettings?: Record<string, unknown>
): LogoPlacementMode {
  if (asset.placementMode) {
    return asset.placementMode;
  }
  const fromSettings = generationSettings?.logoPlacementMode;
  if (fromSettings === "perspective_warp" || fromSettings === "fit_to_target") {
    return fromSettings;
  }
  if (asset.quad) {
    return "perspective_warp";
  }
  return "fit_to_target";
}

function resolveAssetQuad(
  asset: ProtectedBrandAsset,
  bounds: BrandAssetBounds,
  generationSettings?: Record<string, unknown>
): { quad: BrandAssetQuad; quadSource: QuadGenerationSource; placementMode: LogoPlacementMode } {
  if (asset.quad) {
    return {
      quad: asset.quad,
      quadSource: asset.quadSource ?? "user",
      placementMode: resolvePlacementMode(asset, generationSettings),
    };
  }

  const generated = generatePlacementQuad({
    bbox: bounds,
    objectCategory: typeof generationSettings?.logoPlacementTargetLabel === "string" ? undefined : undefined,
    objectLabel: asset.label ?? (generationSettings?.logoPlacementTargetLabel as string | undefined),
    surfaceType: asset.surfaceType,
    placementMode: resolvePlacementMode(asset, generationSettings),
  });

  return {
    quad: generated.quad,
    quadSource: generated.source,
    placementMode: generated.placementMode,
  };
}

export function buildPostCompositeOverlayPlans(input: {
  protection: BrandAssetProtectionResult;
  sourceImageWidth: number;
  sourceImageHeight: number;
  outputImageWidth: number;
  outputImageHeight: number;
  generationSettings?: Record<string, unknown>;
  fitMode?: PostCompositeFitMode;
}): PostCompositeOverlayPlan[] {
  const fitMode = input.fitMode ?? "contain";
  const plans: PostCompositeOverlayPlan[] = [];

  for (const asset of input.protection.postCompositeAssets) {
    const bounds = resolveProtectedAssetBounds(asset, input.generationSettings);
    if (!bounds) {
      continue;
    }
    const pixelBounds = normalizedBoundsToPixelBounds(
      bounds,
      input.outputImageWidth,
      input.outputImageHeight
    );
    const { quad, quadSource, placementMode } = resolveAssetQuad(
      asset,
      bounds,
      input.generationSettings
    );
    const pixelQuad = normalizedQuadToPixelQuad(
      quad,
      input.outputImageWidth,
      input.outputImageHeight
    );

    plans.push({
      assetId: asset.id,
      sourceUrl: asset.sourceUrl,
      label: asset.label,
      normalizedBounds: bounds,
      pixelBounds,
      quad,
      pixelQuad,
      placementMode,
      surfaceType: asset.surfaceType,
      surfaceShape: asset.surfaceShape,
      quadSource,
      sourceImageWidth: input.sourceImageWidth,
      sourceImageHeight: input.sourceImageHeight,
      outputImageWidth: input.outputImageWidth,
      outputImageHeight: input.outputImageHeight,
      fitMode,
      opacity: 1,
      rotationDeg: 0,
      curveMesh: asset.curveMesh,
    });
  }

  return plans;
}

export function brandLockedAssetToProtectedAsset(
  asset: import("@/types/brand-asset-protection").MotionKeyframeBrandAsset
): ProtectedBrandAsset {
  return {
    id: asset.assetId,
    assetType: asset.preserveMode === "reference_asset" ? "mascot_mark" : "logo",
    sourceUrl: asset.assetUrl,
    targetBounds: asset.targetBounds,
    quad: asset.quad,
    placementMode: asset.placementMode,
    surfaceType: asset.surfaceType,
    surfaceShape: asset.surfaceShape,
    quadSource: asset.quadSource,
    preserveMode: asset.preserveMode,
    mustRemainExact: asset.preserveExact,
    allowedTransforms: ["scale", "rotate", "perspective", "perspective_transform", "shadow", "blend"],
    forbiddenTransforms: ["redraw", "rewrite_text", "change_colors", "simplify", "simplify_logo", "hallucinate"],
    curveMesh: { enabled: false },
  };
}

export function buildPostCompositeOverlayPlansFromBrandLockedAssets(input: {
  assets: import("@/types/brand-asset-protection").MotionKeyframeBrandAsset[];
  sourceImageWidth: number;
  sourceImageHeight: number;
  outputImageWidth?: number;
  outputImageHeight?: number;
  generationSettings?: Record<string, unknown>;
  fitMode?: PostCompositeFitMode;
}): PostCompositeOverlayPlan[] {
  const protectedAssets = input.assets.map(brandLockedAssetToProtectedAsset);
  const protection: BrandAssetProtectionResult = {
    assets: protectedAssets,
    active: protectedAssets.length > 0,
    preserveLogoExact: protectedAssets.every((a) => a.mustRemainExact),
    renderInstructions: [],
    promptRules: [],
    postCompositeAssets: protectedAssets,
    referenceAssets: [],
    overlayPlans: [],
    log: {
      protectedBrandAssetsCount: protectedAssets.length,
      protectionModesUsed: [...new Set(protectedAssets.map((a) => a.preserveMode))],
      postCompositeApplied: false,
      validationPassed: true,
      validationWarnings: [],
    },
  };
  return buildPostCompositeOverlayPlans({
    protection,
    sourceImageWidth: input.sourceImageWidth,
    sourceImageHeight: input.sourceImageHeight,
    outputImageWidth: input.outputImageWidth ?? input.sourceImageWidth,
    outputImageHeight: input.outputImageHeight ?? input.sourceImageHeight,
    generationSettings: input.generationSettings,
    fitMode: input.fitMode,
  });
}

export function computeLogoDrawSize(input: {
  logoWidth: number;
  logoHeight: number;
  boxWidth: number;
  boxHeight: number;
  fitMode: PostCompositeFitMode;
}): { width: number; height: number; leftOffset: number; topOffset: number } {
  const logoW = Math.max(1, input.logoWidth);
  const logoH = Math.max(1, input.logoHeight);
  const boxW = Math.max(1, input.boxWidth);
  const boxH = Math.max(1, input.boxHeight);
  const logoAspect = logoW / logoH;
  const boxAspect = boxW / boxH;

  let width = boxW;
  let height = boxH;

  if (input.fitMode === "contain") {
    if (logoAspect > boxAspect) {
      width = boxW;
      height = Math.max(1, Math.round(boxW / logoAspect));
    } else {
      height = boxH;
      width = Math.max(1, Math.round(boxH * logoAspect));
    }
  } else if (logoAspect > boxAspect) {
    width = Math.max(1, Math.round(boxH * logoAspect));
    height = boxH;
  } else {
    width = boxW;
    height = Math.max(1, Math.round(boxW / logoAspect));
  }

  const leftOffset = Math.max(0, Math.round((boxW - width) / 2));
  const topOffset = Math.max(0, Math.round((boxH - height) / 2));
  return { width, height, leftOffset, topOffset };
}

/**
 * Server-side brand asset post-composite — perspective warp + sharp compositing.
 */

import { fetchSourceImageBuffer } from "@/lib/openai-image-generation";
import { warpLogoBufferToQuad } from "@/lib/brand-asset-perspective-warp";
import {
  buildPostCompositeOverlayPlans,
  computeLogoDrawSize,
} from "@/lib/brand-asset-post-composite-plan";
import type {
  BrandAssetProtectionResult,
  PostCompositeApplyResult,
  PostCompositeFitMode,
  PostCompositeOverlayPlan,
} from "@/types/brand-asset-protection";

export {
  buildPostCompositeOverlayPlans,
  clamp01,
  computeLogoDrawSize,
  defaultLogoPlacementBounds,
  normalizedBoundsToPixelBounds,
  resolveProtectedAssetBounds,
} from "@/lib/brand-asset-post-composite-plan";

async function loadSharp() {
  const mod = await import("sharp");
  return mod.default;
}

export async function normalizeRenderBufferToSourceDimensions(input: {
  renderBuffer: Buffer;
  sourceImageWidth: number;
  sourceImageHeight: number;
}): Promise<Buffer> {
  const sharp = await loadSharp();
  const meta = await sharp(input.renderBuffer).metadata();
  const outputW = meta.width ?? input.sourceImageWidth;
  const outputH = meta.height ?? input.sourceImageHeight;

  if (outputW === input.sourceImageWidth && outputH === input.sourceImageHeight) {
    return input.renderBuffer;
  }

  return sharp(input.renderBuffer)
    .resize(input.sourceImageWidth, input.sourceImageHeight, {
      fit: "fill",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
}

async function compositeWarpedLogo(input: {
  working: Buffer;
  logoBuffer: Buffer;
  plan: PostCompositeOverlayPlan;
  outputWidth: number;
  outputHeight: number;
}): Promise<{ buffer: Buffer; warped: boolean; warnings: string[] }> {
  if (input.plan.placementMode !== "perspective_warp" || !input.plan.pixelQuad) {
    return { buffer: input.working, warped: false, warnings: [] };
  }

  const warp = await warpLogoBufferToQuad({
    logoBuffer: input.logoBuffer,
    pixelQuad: input.plan.pixelQuad,
    canvasWidth: input.outputWidth,
    canvasHeight: input.outputHeight,
  });

  if (!warp.applied) {
    return { buffer: input.working, warped: false, warnings: warp.warnings };
  }

  const sharp = await loadSharp();
  const buffer = await sharp(input.working)
    .composite([
      {
        input: warp.buffer,
        left: 0,
        top: 0,
        blend: "over",
      },
    ])
    .png()
    .toBuffer();

  return { buffer, warped: true, warnings: warp.warnings };
}

export async function applyBrandAssetPostComposite(input: {
  renderBuffer: Buffer;
  plans: PostCompositeOverlayPlan[];
  sourceImageWidth: number;
  sourceImageHeight: number;
}): Promise<PostCompositeApplyResult> {
  const warnings: string[] = [];
  const appliedAssetIds: string[] = [];
  const skippedAssetIds: string[] = [];
  const perspectiveWarpAssetIds: string[] = [];

  if (!input.plans.length) {
    return {
      buffer: input.renderBuffer,
      applied: false,
      appliedAssetIds,
      skippedAssetIds,
      warnings,
      perspectiveWarpApplied: false,
      perspectiveWarpAssetIds,
    };
  }

  let sharp: Awaited<ReturnType<typeof loadSharp>>;
  try {
    sharp = await loadSharp();
  } catch (error) {
    warnings.push(
      `sharp unavailable: ${error instanceof Error ? error.message : "unknown"}`
    );
    return {
      buffer: input.renderBuffer,
      applied: false,
      appliedAssetIds,
      skippedAssetIds: input.plans.map((plan) => plan.assetId),
      warnings,
      perspectiveWarpApplied: false,
      perspectiveWarpAssetIds,
    };
  }

  let working = await normalizeRenderBufferToSourceDimensions({
    renderBuffer: input.renderBuffer,
    sourceImageWidth: input.sourceImageWidth,
    sourceImageHeight: input.sourceImageHeight,
  });

  const outputWidth = input.sourceImageWidth;
  const outputHeight = input.sourceImageHeight;

  for (const plan of input.plans) {
    try {
      const logoSource = await fetchSourceImageBuffer(plan.sourceUrl);

      if (plan.placementMode === "perspective_warp" && plan.pixelQuad) {
        const warped = await compositeWarpedLogo({
          working,
          logoBuffer: logoSource.buffer,
          plan,
          outputWidth,
          outputHeight,
        });
        working = warped.buffer;
        warnings.push(...warped.warnings);
        if (warped.warped) {
          perspectiveWarpAssetIds.push(plan.assetId);
          plan.perspectiveWarpApplied = true;
        } else {
          warnings.push(`Perspective warp failed for ${plan.assetId}; falling back to bbox composite.`);
        }
      }

      if (plan.perspectiveWarpApplied) {
        appliedAssetIds.push(plan.assetId);
        continue;
      }

      const logoMeta = await sharp(logoSource.buffer).metadata();
      const logoW = logoMeta.width ?? 1;
      const logoH = logoMeta.height ?? 1;
      const draw = computeLogoDrawSize({
        logoWidth: logoW,
        logoHeight: logoH,
        boxWidth: plan.pixelBounds.width,
        boxHeight: plan.pixelBounds.height,
        fitMode: plan.fitMode,
      });

      let logoBuffer = await sharp(logoSource.buffer)
        .ensureAlpha()
        .resize(draw.width, draw.height, {
          fit: "fill",
          withoutEnlargement: false,
        })
        .png()
        .toBuffer();

      if (plan.opacity < 1) {
        logoBuffer = await sharp(logoBuffer)
          .ensureAlpha()
          .composite([
            {
              input: Buffer.from([255, 255, 255, Math.round(plan.opacity * 255)]),
              raw: { width: 1, height: 1, channels: 4 },
              blend: "dest-in",
            },
          ])
          .png()
          .toBuffer();
      }

      const left = plan.pixelBounds.left + draw.leftOffset;
      const top = plan.pixelBounds.top + draw.topOffset;

      working = await sharp(working)
        .composite([
          {
            input: logoBuffer,
            left,
            top,
            blend: "over",
          },
        ])
        .png()
        .toBuffer();

      appliedAssetIds.push(plan.assetId);
    } catch (error) {
      skippedAssetIds.push(plan.assetId);
      warnings.push(
        `Failed to composite ${plan.assetId}: ${error instanceof Error ? error.message : "unknown"}`
      );
    }
  }

  return {
    buffer: working,
    applied: appliedAssetIds.length > 0,
    appliedAssetIds,
    skippedAssetIds,
    warnings,
    perspectiveWarpApplied: perspectiveWarpAssetIds.length > 0,
    perspectiveWarpAssetIds,
  };
}

export async function applyBrandProtectionPostComposite(input: {
  renderBuffer: Buffer;
  protection?: BrandAssetProtectionResult | null;
  sourceImageWidth: number;
  sourceImageHeight: number;
  generationSettings?: Record<string, unknown>;
  fitMode?: PostCompositeFitMode;
}): Promise<
  PostCompositeApplyResult & {
    overlayPlans: PostCompositeOverlayPlan[];
  }
> {
  if (!input.protection?.postCompositeAssets.length) {
    return {
      buffer: input.renderBuffer,
      applied: false,
      appliedAssetIds: [],
      skippedAssetIds: [],
      warnings: [],
      overlayPlans: [],
      perspectiveWarpApplied: false,
      perspectiveWarpAssetIds: [],
    };
  }

  const normalized = await normalizeRenderBufferToSourceDimensions({
    renderBuffer: input.renderBuffer,
    sourceImageWidth: input.sourceImageWidth,
    sourceImageHeight: input.sourceImageHeight,
  });

  const overlayPlans = buildPostCompositeOverlayPlans({
    protection: input.protection,
    sourceImageWidth: input.sourceImageWidth,
    sourceImageHeight: input.sourceImageHeight,
    outputImageWidth: input.sourceImageWidth,
    outputImageHeight: input.sourceImageHeight,
    generationSettings: input.generationSettings,
    fitMode: input.fitMode,
  });

  const result = await applyBrandAssetPostComposite({
    renderBuffer: normalized,
    plans: overlayPlans,
    sourceImageWidth: input.sourceImageWidth,
    sourceImageHeight: input.sourceImageHeight,
  });

  return { ...result, overlayPlans };
}

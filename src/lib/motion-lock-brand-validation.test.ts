import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateMotionLockValidation,
  normalizedRegionMatchScore,
  regionPixelVariance,
  validateBrandRegionInFrame,
  verdictFromConfidence,
} from "@/lib/motion-lock-brand-validation";
import { buildLogoPlacementBlueprint } from "@/lib/logo-placement-blueprint";
import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import { buildBrandLockedAssetsFromProtection } from "@/lib/brand-asset-motion-lock";
import { resolveMotionKeyframeBrandAssets } from "@/lib/motion-keyframe-brand-baking";
import { buildPostCompositeOverlayPlansFromBrandLockedAssets } from "@/lib/brand-asset-post-composite-plan";
import { buildMotionLockSegment } from "@/server/instant-premium/motion-lock-segment-service";
import { seedCategoryOutputSettings } from "@/lib/editor-fusion-archetypes";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";

function lockedFromLogoPlacement() {
  const blueprint = buildLogoPlacementBlueprint({
    targetObject: {
      id: "pack",
      label: "Pack",
      bounds: { x: 0.2, y: 0.3, width: 0.5, height: 0.4, exact: true },
      category: "package",
    },
    logoAssetUrl: "https://example.com/pack-logo.png",
    surfaceType: "packaging",
    placementMode: "perspective_warp",
    quad: {
      topLeft: { x: 0.2, y: 0.3 },
      topRight: { x: 0.7, y: 0.3 },
      bottomRight: { x: 0.7, y: 0.7 },
      bottomLeft: { x: 0.2, y: 0.7 },
    },
  });
  const protection = buildBrandAssetProtectionLayer({
    workflowType: "logo_placement",
    logoPlacement: blueprint,
  });
  return buildBrandLockedAssetsFromProtection(protection);
}

describe("motion lock brand validation (Sprint G)", () => {
  it("detects identical region as high confidence", () => {
    const patch = Buffer.alloc(32 * 32, 180);
    const score = normalizedRegionMatchScore(patch, patch);
    assert.ok(score > 0.9);
    assert.equal(verdictFromConfidence(score), "PASS");
  });

  it("detects empty region as missing brand", () => {
    const empty = Buffer.alloc(32 * 32, 12);
    const logo = Buffer.alloc(32 * 32, 200);
    const result = validateBrandRegionInFrame({
      assetId: "logo",
      regionGrayscale: empty,
      logoGrayscale: logo,
      frameRole: "middle",
    });
    assert.equal(result.validationResult, "FAIL");
    assert.ok(result.confidence < 0.42);
  });

  it("aggregates FAIL across representative frames", () => {
    const aggregated = aggregateMotionLockValidation([
      {
        assetId: "logo",
        validationResult: "PASS",
        confidence: 0.8,
        reason: "ok",
        frameRole: "start",
      },
      {
        assetId: "logo",
        validationResult: "FAIL",
        confidence: 0.2,
        reason: "missing",
        frameRole: "middle",
      },
    ]);
    assert.equal(aggregated.passed, false);
    assert.equal(aggregated.enforcementRequired, true);
    assert.deepEqual(aggregated.assetsMissing, ["logo"]);
  });

  it("buildMotionLockSegment uses BrandLockedAsset without duplication", () => {
    const assets = lockedFromLogoPlacement();
    const segment = buildMotionLockSegment({
      segmentId: "tr-1",
      segmentIndex: 0,
      sourceVideoUrl: "https://example.com/seg.mp4",
      brandLockedAssets: assets,
    });
    assert.equal(segment.brandLockedAssets.length, assets.length);
    assert.equal(segment.enforcementMode, "post_composite_overlay");
    assert.equal(segment.sourceVideoUrl, "https://example.com/seg.mp4");
  });

  it("1. product branding overlay plans for validation", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "product_branding",
      logoAssets: [{ referenceId: "logo", url: "https://example.com/logo.png" }],
      generationSettings: seedCategoryOutputSettings("product_branding"),
    });
    const plans = buildPostCompositeOverlayPlansFromBrandLockedAssets({
      assets: resolveMotionKeyframeBrandAssets(buildBrandLockedAssetsFromProtection(protection)),
      sourceImageWidth: 1080,
      sourceImageHeight: 1920,
    });
    assert.equal(plans.length, 1);
  });

  it("2. packaging workflow plans", () => {
    const plans = buildPostCompositeOverlayPlansFromBrandLockedAssets({
      assets: resolveMotionKeyframeBrandAssets(lockedFromLogoPlacement()),
      sourceImageWidth: 1080,
      sourceImageHeight: 1920,
    });
    assert.ok(plans.length >= 1);
  });

  it("3. billboard quad plans", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "b",
        label: "Board",
        bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.4, exact: true },
      },
      logoAssetUrl: "https://example.com/logo.png",
      placementMode: "perspective_warp",
      quad: {
        topLeft: { x: 0.1, y: 0.1 },
        topRight: { x: 0.9, y: 0.1 },
        bottomRight: { x: 0.9, y: 0.5 },
        bottomLeft: { x: 0.1, y: 0.5 },
      },
    });
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: blueprint,
    });
    const plans = buildPostCompositeOverlayPlansFromBrandLockedAssets({
      assets: resolveMotionKeyframeBrandAssets(buildBrandLockedAssetsFromProtection(protection)),
      sourceImageWidth: 1920,
      sourceImageHeight: 1080,
    });
    assert.equal(plans[0]?.placementMode, "perspective_warp");
  });

  it("4-7. sponsor, label, mascot locked assets resolve for lock segment", () => {
    const samples: BrandLockedAsset[] = [
      {
        assetId: "sponsor",
        assetUrl: "https://example.com/sponsor.png",
        motionLocked: true,
        preserveExact: true,
        preserveMode: "post_composite",
        targetBounds: { x: 0.7, y: 0.05, width: 0.2, height: 0.1, exact: true },
        trackingMode: "affine_segment",
        validationMode: "post_composite",
        surfaceType: "signage",
      },
      {
        assetId: "label",
        assetUrl: "https://example.com/label.png",
        motionLocked: true,
        preserveExact: true,
        preserveMode: "post_composite",
        targetBounds: { x: 0.2, y: 0.5, width: 0.5, height: 0.1, exact: true },
        trackingMode: "affine_segment",
        validationMode: "post_composite",
        surfaceType: "product_label",
      },
      {
        assetId: "mascot",
        assetUrl: "https://example.com/emblem.png",
        motionLocked: true,
        preserveExact: true,
        preserveMode: "reference_asset",
        trackingMode: "static",
        validationMode: "keyframe_bake",
      },
    ];
    for (const assets of [samples.slice(0, 1), samples.slice(1, 2), samples.slice(2, 3)]) {
      const segment = buildMotionLockSegment({
        segmentId: "t",
        segmentIndex: 0,
        sourceVideoUrl: "https://example.com/v.mp4",
        brandLockedAssets: assets,
      });
      assert.ok(segment.brandLockedAssets.length > 0);
    }
  });

  it("region variance detects flat empty patches", () => {
    assert.ok(regionPixelVariance(Buffer.alloc(100, 5)) < 120);
    const noisy = Buffer.alloc(100);
    for (let i = 0; i < noisy.length; i += 1) {
      noisy[i] = (i * 17) % 256;
    }
    assert.ok(regionPixelVariance(noisy) > 120);
  });
});

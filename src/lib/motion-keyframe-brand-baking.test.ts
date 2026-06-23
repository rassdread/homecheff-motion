import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLogoPlacementBlueprint } from "@/lib/logo-placement-blueprint";
import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import { buildBrandLockedAssetsFromProtection } from "@/lib/brand-asset-motion-lock";
import {
  brandLockedAssetMatchesKeyframe,
  resolveBrandPlacementsForMotion,
  resolveKeyframeBrandAssetsForFrame,
  resolveKeyframeRoleForImageIndex,
  resolveMotionKeyframeBrandAssets,
  shouldBakeBrandLockedAsset,
} from "@/lib/motion-keyframe-brand-baking";
import { buildPostCompositeOverlayPlansFromBrandLockedAssets } from "@/lib/brand-asset-post-composite-plan";
import { seedCategoryOutputSettings } from "@/lib/editor-fusion-archetypes";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";
import type { BrandPlacement } from "@/types/studio-asset-placement";

function lockedFromBlueprint(
  blueprint: ReturnType<typeof buildLogoPlacementBlueprint>
): BrandLockedAsset[] {
  const protection = buildBrandAssetProtectionLayer({
    workflowType: "logo_placement",
    logoPlacement: blueprint,
  });
  return buildBrandLockedAssetsFromProtection(protection);
}

describe("motion keyframe brand baking (Sprint F)", () => {
  it("resolveMotionKeyframeBrandAssets keeps geometry fields", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "shirt",
        label: "Shirt",
        bounds: { x: 0.3, y: 0.4, width: 0.2, height: 0.15, exact: true },
      },
      logoAssetUrl: "https://example.com/logo.png",
      placementMode: "perspective_warp",
      surfaceType: "shirt",
      quad: {
        topLeft: { x: 0.3, y: 0.4 },
        topRight: { x: 0.5, y: 0.4 },
        bottomRight: { x: 0.5, y: 0.55 },
        bottomLeft: { x: 0.3, y: 0.55 },
      },
    });
    const keyframeAssets = resolveMotionKeyframeBrandAssets(lockedFromBlueprint(blueprint));
    const asset = keyframeAssets.find((a) => a.placementMode === "perspective_warp")!;
    assert.equal(asset.assetUrl, blueprint.logoAssetUrl);
    assert.ok(asset.quad);
    assert.equal(asset.preserveExact, true);
  });

  it("skips prompt_only assets for keyframe baking", () => {
    const asset: BrandLockedAsset = {
      assetId: "prompt",
      assetUrl: "https://example.com/logo.png",
      motionLocked: true,
      preserveExact: false,
      preserveMode: "prompt_only",
      trackingMode: "static",
      validationMode: "prompt_only",
    };
    assert.equal(shouldBakeBrandLockedAsset(asset), false);
    assert.equal(resolveMotionKeyframeBrandAssets([asset]).length, 0);
  });

  it("BrandLockedAsset wins over BrandPlacement", () => {
    const locked: BrandLockedAsset = {
      assetId: "logo",
      assetUrl: "https://example.com/logo.png",
      motionLocked: true,
      preserveExact: true,
      preserveMode: "post_composite",
      trackingMode: "affine_segment",
      validationMode: "post_composite",
    };
    const placements: BrandPlacement[] = [
      {
        sceneId: "s1",
        brandId: "b1",
        brandName: "Zone Brand",
        zone: "TOP_RIGHT",
        depth: "FOREGROUND",
        scale: "MEDIUM",
        hierarchyScore: 0.8,
        placementPriority: 1,
        summaryKey: "studio.assetPlacement.brand",
      },
    ];
    const resolved = resolveBrandPlacementsForMotion({
      brandLockedAssets: [locked],
      brandPlacements: placements,
    });
    assert.equal(resolved.source, "brand_locked");
    assert.equal(resolved.placements.length, 0);
  });

  it("buildPostCompositeOverlayPlansFromBrandLockedAssets uses perspective quad", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "board",
        label: "Billboard",
        bounds: { x: 0.1, y: 0.2, width: 0.7, height: 0.4, exact: true },
      },
      logoAssetUrl: "https://example.com/billboard-logo.png",
      placementMode: "perspective_warp",
      surfaceType: "billboard",
      quad: {
        topLeft: { x: 0.1, y: 0.2 },
        topRight: { x: 0.8, y: 0.2 },
        bottomRight: { x: 0.8, y: 0.6 },
        bottomLeft: { x: 0.1, y: 0.6 },
      },
    });
    const plans = buildPostCompositeOverlayPlansFromBrandLockedAssets({
      assets: resolveMotionKeyframeBrandAssets(lockedFromBlueprint(blueprint)),
      sourceImageWidth: 1080,
      sourceImageHeight: 1920,
    });
    assert.equal(plans.length, 1);
    assert.equal(plans[0]?.placementMode, "perspective_warp");
    assert.ok(plans[0]?.pixelQuad);
  });

  it("1. product branding keyframe asset is bakeable", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "product_branding",
      logoAssets: [{ referenceId: "logo", url: "https://example.com/logo.png" }],
      generationSettings: seedCategoryOutputSettings("product_branding"),
    });
    const assets = resolveMotionKeyframeBrandAssets(
      buildBrandLockedAssetsFromProtection(protection)
    );
    assert.equal(assets[0]?.validationMode, "post_composite");
  });

  it("2. packaging surface preserved", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "pack",
        label: "Pack",
        bounds: { x: 0.2, y: 0.3, width: 0.5, height: 0.4, exact: true },
        category: "package",
      },
      logoAssetUrl: "https://example.com/pack.png",
      surfaceType: "packaging",
    });
    const assets = resolveMotionKeyframeBrandAssets(lockedFromBlueprint(blueprint));
    assert.ok(assets.some((a) => a.surfaceType === "packaging"));
  });

  it("3. billboard perspective warp overlay plan", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "board",
        label: "Board",
        bounds: { x: 0.15, y: 0.1, width: 0.7, height: 0.35, exact: true },
      },
      logoAssetUrl: "https://example.com/logo.png",
      placementMode: "perspective_warp",
      surfaceType: "billboard",
      quad: {
        topLeft: { x: 0.15, y: 0.1 },
        topRight: { x: 0.85, y: 0.1 },
        bottomRight: { x: 0.85, y: 0.45 },
        bottomLeft: { x: 0.15, y: 0.45 },
      },
    });
    const plans = buildPostCompositeOverlayPlansFromBrandLockedAssets({
      assets: resolveMotionKeyframeBrandAssets(lockedFromBlueprint(blueprint)),
      sourceImageWidth: 1920,
      sourceImageHeight: 1080,
    });
    assert.equal(plans[0]?.placementMode, "perspective_warp");
    assert.ok(plans[0]?.pixelQuad);
  });

  it("4. logo placement workflow", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "shirt",
        label: "Shirt",
        bounds: { x: 0.3, y: 0.4, width: 0.2, height: 0.15, exact: true },
      },
      logoAssetUrl: "https://example.com/logo.png",
      placementMode: "perspective_warp",
      quad: {
        topLeft: { x: 0.3, y: 0.4 },
        topRight: { x: 0.5, y: 0.4 },
        bottomRight: { x: 0.5, y: 0.55 },
        bottomLeft: { x: 0.3, y: 0.55 },
      },
    });
    assert.ok(resolveMotionKeyframeBrandAssets(lockedFromBlueprint(blueprint)).length > 0);
  });

  it("5. mascot emblem keyframe_bake is included", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "mascot_transform",
      logoAssets: [
        {
          referenceId: "emblem",
          url: "https://example.com/mascot-emblem.png",
          name: "Emblem",
        },
      ],
    });
    const assets = resolveMotionKeyframeBrandAssets(
      buildBrandLockedAssetsFromProtection(protection)
    );
    assert.ok(assets.some((a) => a.validationMode === "keyframe_bake"));
  });

  it("6. sponsor logo post_composite bakes", () => {
    const locked: BrandLockedAsset = {
      assetId: "sponsor",
      assetUrl: "https://example.com/sponsor.png",
      motionLocked: true,
      preserveExact: true,
      preserveMode: "post_composite",
      targetBounds: { x: 0.7, y: 0.05, width: 0.22, height: 0.12, exact: true },
      trackingMode: "affine_segment",
      validationMode: "post_composite",
      surfaceType: "signage",
    };
    assert.equal(resolveMotionKeyframeBrandAssets([locked]).length, 1);
  });

  it("7. product label builds overlay plan", () => {
    const locked: BrandLockedAsset = {
      assetId: "label",
      assetUrl: "https://example.com/label.png",
      motionLocked: true,
      preserveExact: true,
      preserveMode: "post_composite",
      targetBounds: { x: 0.25, y: 0.55, width: 0.5, height: 0.1, exact: true },
      trackingMode: "affine_segment",
      validationMode: "post_composite",
      surfaceType: "product_label",
    };
    const plans = buildPostCompositeOverlayPlansFromBrandLockedAssets({
      assets: resolveMotionKeyframeBrandAssets([locked]),
      sourceImageWidth: 1000,
      sourceImageHeight: 1000,
    });
    assert.equal(plans.length, 1);
    assert.equal(plans[0]?.surfaceType, "product_label");
  });

  it("filters keyframe assets by segment and role when scoped", () => {
    const assets = resolveMotionKeyframeBrandAssets([
      {
        assetId: "a",
        assetUrl: "https://example.com/a.png",
        motionLocked: true,
        preserveExact: true,
        preserveMode: "post_composite",
        trackingMode: "static",
        validationMode: "post_composite",
        segmentIndex: 1,
        keyframeRole: "middle",
      },
      {
        assetId: "b",
        assetUrl: "https://example.com/b.png",
        motionLocked: true,
        preserveExact: true,
        preserveMode: "post_composite",
        trackingMode: "static",
        validationMode: "post_composite",
        segmentIndex: 0,
        keyframeRole: "start",
      },
    ]);
    const scoped = resolveKeyframeBrandAssetsForFrame(assets, {
      segmentIndex: 1,
      keyframeRole: "middle",
    });
    assert.equal(scoped[0]?.assetId, "a");
  });

  it("resolveKeyframeRoleForImageIndex maps start middle end", () => {
    assert.equal(resolveKeyframeRoleForImageIndex(0, 3), "start");
    assert.equal(resolveKeyframeRoleForImageIndex(1, 3), "middle");
    assert.equal(resolveKeyframeRoleForImageIndex(2, 3), "end");
  });

  it("brandLockedAssetMatchesKeyframe respects sceneId", () => {
    assert.equal(
      brandLockedAssetMatchesKeyframe({
        asset: {
          assetId: "x",
          assetUrl: "https://example.com/x.png",
          preserveExact: true,
          preserveMode: "post_composite",
          validationMode: "post_composite",
          sceneId: "scene-a",
        },
        sceneId: "scene-b",
        segmentIndex: 0,
        keyframeRole: "start",
      }),
      false
    );
  });
});

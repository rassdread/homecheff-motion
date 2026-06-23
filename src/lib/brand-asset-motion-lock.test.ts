import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachBrandMotionLockToHandoffPayload,
  buildBrandLockedAssetsFromProtection,
  buildBrandMotionLockLog,
  mapProtectedAssetToBrandLockedAsset,
  mergeBrandLockedAssetsIntoStudioHandoffJson,
  resolveBrandLockedAssetsFromFusionPayload,
} from "@/lib/brand-asset-motion-lock";
import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import { buildFusionRenderPayload } from "@/lib/editor-fusion-render-payload";
import { buildLogoPlacementBlueprint } from "@/lib/logo-placement-blueprint";
import { seedCategoryOutputSettings } from "@/lib/editor-fusion-archetypes";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";
import { sanitizeMotionHandoffForStorage } from "@/lib/studio-motion-handoff-storage";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { ProtectedBrandAsset } from "@/types/brand-asset-protection";

function mockDoc(name = "product.png") {
  return createEditorDocumentFromUpload({
    name,
    backgroundUrl: "https://example.com/product.png",
    storageKey: "product.png",
  });
}

function assertLockedAssetFields(
  locked: ReturnType<typeof mapProtectedAssetToBrandLockedAsset>,
  source: ProtectedBrandAsset
) {
  assert.equal(locked.assetId, source.id);
  assert.equal(locked.assetUrl, source.sourceUrl);
  assert.equal(locked.preserveExact, source.mustRemainExact);
  assert.equal(locked.preserveMode, source.preserveMode);
  assert.equal(locked.motionLocked, true);
  if (source.targetBounds) {
    assert.deepEqual(locked.targetBounds, source.targetBounds);
  }
  if (source.quad) {
    assert.deepEqual(locked.quad, source.quad);
  }
  if (source.placementMode) {
    assert.equal(locked.placementMode, source.placementMode);
  }
  if (source.surfaceType) {
    assert.equal(locked.surfaceType, source.surfaceType);
  }
  if (source.quadSource) {
    assert.equal(locked.quadSource, source.quadSource);
  }
}

describe("brand asset motion lock bridge (Sprint E)", () => {
  it("maps perspective_warp post_composite to perspective_segment + post_composite validation", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "billboard_1",
        label: "Billboard",
        bounds: { x: 0.2, y: 0.1, width: 0.5, height: 0.3, exact: true },
      },
      logoAssetUrl: "https://example.com/logo.png",
      placementMode: "perspective_warp",
      surfaceType: "billboard",
      quad: {
        topLeft: { x: 0.2, y: 0.1 },
        topRight: { x: 0.7, y: 0.1 },
        bottomRight: { x: 0.7, y: 0.4 },
        bottomLeft: { x: 0.2, y: 0.4 },
      },
    });
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: blueprint,
    });
    const locked = buildBrandLockedAssetsFromProtection(protection).find(
      (a) => a.placementMode === "perspective_warp"
    )!;
    assert.equal(locked.trackingMode, "perspective_segment");
    assert.equal(locked.validationMode, "post_composite");
    const placementAsset = protection.postCompositeAssets.find(
      (a) => a.placementMode === "perspective_warp"
    )!;
    assertLockedAssetFields(locked, placementAsset);
  });

  it("1. product branding preserves logo asset through fusion payload bridge", () => {
    const doc = mockDoc();
    const plan = createInitialFusionPlan(doc, "product_branding");
    plan.references = [
      {
        id: "logo_1",
        type: "logo",
        url: "https://example.com/logo.png",
        name: "Brand",
        uploadedAt: new Date().toISOString(),
      },
    ];
    const payload = buildFusionRenderPayload({
      document: doc,
      plan,
      profiles: [],
    });
    assert.ok(payload.brandProtection?.active);
    const locked = resolveBrandLockedAssetsFromFusionPayload(payload);
    assert.equal(locked.length, 1);
    assert.equal(locked[0]?.preserveExact, true);
    assert.equal(locked[0]?.validationMode, "post_composite");
  });

  it("2. logo placement carries quad and placementMode", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "shirt_1",
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
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: blueprint,
    });
    const locked = buildBrandLockedAssetsFromProtection(protection).find(
      (a) => a.placementMode === "perspective_warp"
    )!;
    assert.equal(locked.placementMode, "perspective_warp");
    assert.equal(locked.quadSource, "user");
    assert.ok(locked.quad);
  });

  it("3. packaging surface flows through motion handoff payload", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "box_1",
        label: "Box",
        bounds: { x: 0.25, y: 0.3, width: 0.4, height: 0.35, exact: true },
        category: "package",
      },
      logoAssetUrl: "https://example.com/pack-logo.png",
      surfaceType: "packaging",
      surfaceShape: "flat",
    });
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: blueprint,
    });
    const locked = buildBrandLockedAssetsFromProtection(protection).find(
      (a) => a.surfaceType === "packaging"
    )!;
    assert.equal(locked.surfaceType, "packaging");
    assert.ok(locked.surfaceShape);
    const handoff = attachBrandMotionLockToHandoffPayload(
      {
        version: MOTION_HANDOFF_PAYLOAD_VERSION,
        storyboardId: "sb-pack",
        title: "Pack",
        description: "",
        promptStyleProfile: "cinematic",
        directorProfile: "default",
        shotDiversityScore: 0,
        characterMemory: [],
        locationMemory: null,
        propMemory: [],
        worldMemory: null,
        continuityStrength: "balanced",
        consistencyReport: null,
        overallConsistencyScore: 0,
        driftWarnings: [],
        correctionRecommendations: [],
        consistencyHistory: [],
        latestImprovementScore: null,
        visionReport: null,
        overallVisionScore: 0,
        visionWarnings: [],
        characterConsistencyReport: null,
        overallCharacterConsistencyScore: 0,
        characterDriftWarnings: [],
        perSceneCharacterIdentityScores: [],
        scenes: [],
      },
      buildBrandLockedAssetsFromProtection(protection)
    );
    assert.ok(handoff.brandLockedAssets?.some((a) => a.surfaceType === "packaging"));
    const stored = sanitizeMotionHandoffForStorage(handoff);
    assert.ok(
      (stored.brandLockedAssets as typeof locked[]).some((a) => a.surfaceType === "packaging")
    );
    assert.equal(
      (stored.brandMotionLockLog as ReturnType<typeof buildBrandMotionLockLog>).assetsLocked,
      1
    );
  });

  it("4. billboard workflow keeps validationMode post_composite", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: buildLogoPlacementBlueprint({
        targetObject: {
          id: "board",
          label: "Board",
          bounds: { x: 0.1, y: 0.2, width: 0.7, height: 0.4, exact: true },
        },
        logoAssetUrl: "https://example.com/billboard-logo.png",
        surfaceType: "billboard",
        placementMode: "perspective_warp",
      }),
      logoAssets: [{ referenceId: "logo", url: "https://example.com/billboard-logo.png" }],
    });
    const log = buildBrandMotionLockLog(buildBrandLockedAssetsFromProtection(protection));
    assert.ok(log.validationModesUsed.includes("post_composite"));
    assert.ok(log.trackingModesUsed.includes("perspective_segment"));
  });

  it("5. mascot emblem reference_asset maps to keyframe_bake + static tracking", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "mascot_transform",
      logoAssets: [
        {
          referenceId: "mascot_emblem",
          url: "https://example.com/mascot-emblem.png",
          name: "Emblem",
        },
      ],
    });
    const emblem = protection.referenceAssets.find((a) => a.assetType === "mascot_mark") ??
      protection.assets[0];
    assert.ok(emblem);
    const locked = mapProtectedAssetToBrandLockedAsset(emblem);
    assert.equal(locked.validationMode, "keyframe_bake");
    assert.equal(locked.trackingMode, "static");
    assert.equal(locked.preserveExact, true);
  });

  it("persists brandLockedAssets in studioHandoffJson merge helper", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "product_branding",
      logoAssets: [{ referenceId: "logo", url: "https://example.com/logo.png" }],
      generationSettings: seedCategoryOutputSettings("product_branding"),
    });
    const assets = buildBrandLockedAssetsFromProtection(protection);
    const merged = mergeBrandLockedAssetsIntoStudioHandoffJson(
      undefined,
      assets,
      "editor-session-1"
    );
    assert.equal(merged.storyboardId, "editor-session-1");
    assert.equal((merged.brandLockedAssets as typeof assets).length, 1);
  });

  it("backward compatible when no brand locked assets", () => {
    const merged = mergeBrandLockedAssetsIntoStudioHandoffJson(undefined, [], "sb-1");
    assert.deepEqual(merged, {});
    const handoff = attachBrandMotionLockToHandoffPayload(
      {
        version: MOTION_HANDOFF_PAYLOAD_VERSION,
        storyboardId: "sb-legacy",
        title: "Legacy",
        description: "",
        promptStyleProfile: "cinematic",
        directorProfile: "default",
        shotDiversityScore: 0,
        characterMemory: [],
        locationMemory: null,
        propMemory: [],
        worldMemory: null,
        continuityStrength: "balanced",
        consistencyReport: null,
        overallConsistencyScore: 0,
        driftWarnings: [],
        correctionRecommendations: [],
        consistencyHistory: [],
        latestImprovementScore: null,
        visionReport: null,
        overallVisionScore: 0,
        visionWarnings: [],
        characterConsistencyReport: null,
        overallCharacterConsistencyScore: 0,
        characterDriftWarnings: [],
        perSceneCharacterIdentityScores: [],
        scenes: [],
      },
      []
    );
    assert.equal(handoff.brandLockedAssets, undefined);
  });
});

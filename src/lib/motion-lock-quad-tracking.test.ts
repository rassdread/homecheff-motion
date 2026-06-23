import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMotionTrackingResult,
  isQuadTrackingSurfaceType,
  lerpQuad,
  predictTrackedQuad,
  resolveMotionLockAssetTrackingMode,
  resolveSegmentTrackingMode,
} from "@/lib/motion-lock-quad-tracking";
import { MOTION_LOCK_SAMPLE_POINTS } from "@/lib/motion-lock-dense-sampling";
import type { BrandAssetQuad, BrandLockedAsset } from "@/types/brand-asset-protection";

const baseQuad: BrandAssetQuad = {
  topLeft: { x: 0.1, y: 0.1 },
  topRight: { x: 0.9, y: 0.1 },
  bottomRight: { x: 0.9, y: 0.9 },
  bottomLeft: { x: 0.1, y: 0.9 },
};

const shiftedQuad: BrandAssetQuad = {
  topLeft: { x: 0.2, y: 0.2 },
  topRight: { x: 0.8, y: 0.2 },
  bottomRight: { x: 0.8, y: 0.8 },
  bottomLeft: { x: 0.2, y: 0.8 },
};

function lockedAsset(overrides: Partial<BrandLockedAsset>): BrandLockedAsset {
  return {
    assetId: "logo",
    assetUrl: "https://example.com/logo.png",
    motionLocked: true,
    preserveExact: true,
    preserveMode: "post_composite",
    targetBounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8, exact: true },
    quad: baseQuad,
    trackingMode: "affine_segment",
    validationMode: "post_composite",
    surfaceType: "billboard",
    ...overrides,
  };
}

describe("motion lock quad tracking (Sprint I)", () => {
  it("lerpQuad interpolates corner points", () => {
    const mid = lerpQuad(baseQuad, shiftedQuad, 0.5);
    assert.ok(Math.abs(mid.topLeft.x - 0.15) < 0.001);
    assert.ok(Math.abs(mid.topLeft.y - 0.15) < 0.001);
  });

  it("predictTrackedQuad returns start/mid/end anchors", () => {
    const atStart = predictTrackedQuad({
      progress: 0,
      startQuad: baseQuad,
      midQuad: shiftedQuad,
      endQuad: baseQuad,
    });
    const atMid = predictTrackedQuad({
      progress: 0.5,
      startQuad: baseQuad,
      midQuad: shiftedQuad,
      endQuad: baseQuad,
    });
    const atEnd = predictTrackedQuad({
      progress: 1,
      startQuad: baseQuad,
      midQuad: shiftedQuad,
      endQuad: baseQuad,
    });

    assert.deepEqual(atStart.topLeft, baseQuad.topLeft);
    assert.deepEqual(atMid.topLeft, shiftedQuad.topLeft);
    assert.deepEqual(atEnd.topLeft, baseQuad.topLeft);
  });

  it("buildMotionTrackingResult emits 11 tracked quads", () => {
    const result = buildMotionTrackingResult({
      startQuad: baseQuad,
      midQuad: shiftedQuad,
      endQuad: baseQuad,
    });
    assert.equal(result.trackingMode, "quad_interpolation");
    assert.equal(result.trackedFrames, 11);
    assert.equal(result.quads.length, MOTION_LOCK_SAMPLE_POINTS.length);
    assert.equal(result.quads[0]?.progress, 0);
    assert.equal(result.quads[10]?.progress, 1);
  });

  it("selects quad_interpolation for billboard with quad and bounds", () => {
    const mode = resolveMotionLockAssetTrackingMode(lockedAsset({}));
    assert.equal(mode, "quad_interpolation");
  });

  it("static fallback for shirt surface", () => {
    const mode = resolveMotionLockAssetTrackingMode(
      lockedAsset({ surfaceType: "shirt" })
    );
    assert.equal(mode, "static");
  });

  it("static fallback without quad", () => {
    const mode = resolveMotionLockAssetTrackingMode(
      lockedAsset({ quad: undefined })
    );
    assert.equal(mode, "static");
  });

  it("product_branding workflow enables tracking without known surface", () => {
    assert.equal(isQuadTrackingSurfaceType(undefined, "product_branding"), true);
    const mode = resolveSegmentTrackingMode(
      [lockedAsset({ surfaceType: undefined })],
      "product_branding"
    );
    assert.equal(mode, "quad_interpolation");
  });

  it("segment tracking mode is static when all assets are static-only", () => {
    const mode = resolveSegmentTrackingMode([
      lockedAsset({ surfaceType: "vehicle" }),
      lockedAsset({ assetId: "logo-2", surfaceType: "mug" }),
    ]);
    assert.equal(mode, "static");
  });
});

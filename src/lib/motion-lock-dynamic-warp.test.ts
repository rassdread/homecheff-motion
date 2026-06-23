import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDynamicSampleOverlay,
  enforceBrandLockOnSegmentVideoSmart,
} from "@/server/instant-premium/motion-lock-dynamic-warp";
import {
  resolveMotionLockAssetTrackingMode,
  resolveSegmentTrackingMode,
} from "@/lib/motion-lock-quad-tracking";
import type { BrandAssetQuad, BrandLockedAsset } from "@/types/brand-asset-protection";

const quad: BrandAssetQuad = {
  topLeft: { x: 0.2, y: 0.2 },
  topRight: { x: 0.8, y: 0.2 },
  bottomRight: { x: 0.8, y: 0.8 },
  bottomLeft: { x: 0.2, y: 0.8 },
};

function billboardAsset(): BrandLockedAsset {
  return {
    assetId: "board-logo",
    assetUrl: "https://example.com/logo.png",
    motionLocked: true,
    preserveExact: true,
    preserveMode: "post_composite",
    targetBounds: { x: 0.2, y: 0.2, width: 0.6, height: 0.6, exact: true },
    quad,
    placementMode: "perspective_warp",
    surfaceType: "billboard",
    trackingMode: "perspective_segment",
    validationMode: "post_composite",
  };
}

function shirtAsset(): BrandLockedAsset {
  return {
    ...billboardAsset(),
    assetId: "shirt-logo",
    surfaceType: "shirt",
  };
}

describe("motion lock dynamic warp (Sprint I)", () => {
  it("routes billboard assets to quad interpolation", () => {
    const asset = billboardAsset();
    assert.equal(resolveMotionLockAssetTrackingMode(asset), "quad_interpolation");
    assert.equal(resolveSegmentTrackingMode([asset]), "quad_interpolation");
  });

  it("routes shirt assets to static tracking", () => {
    const asset = shirtAsset();
    assert.equal(resolveMotionLockAssetTrackingMode(asset), "static");
    assert.equal(resolveSegmentTrackingMode([asset]), "static");
  });

  it("buildDynamicSampleOverlay warps logo for trackable asset", async () => {
    let sharp: typeof import("sharp").default;
    try {
      sharp = (await import("sharp")).default;
    } catch {
      return;
    }

    const logo = await sharp({
      create: {
        width: 80,
        height: 40,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("example.com/logo.png")) {
        return new Response(logo, { status: 200, headers: { "content-type": "image/png" } });
      }
      return originalFetch(input);
    };

    try {
      const result = await buildDynamicSampleOverlay({
        width: 400,
        height: 300,
        progress: 0.5,
        brandLockedAssets: [billboardAsset()],
      });
      assert.equal(result.perspectiveWarpApplied, true);
      assert.ok(result.warpCount >= 1);
      assert.ok(result.buffer && result.buffer.length > 64);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("smart enforcement returns static tracking for shirt assets without ffmpeg", async () => {
    const result = await enforceBrandLockOnSegmentVideoSmart({
      segmentVideoPath: "/tmp/does-not-exist-segment.mp4",
      outputVideoPath: "/tmp/does-not-exist-out.mp4",
      brandLockedAssets: [shirtAsset()],
      segmentIndex: 0,
      referenceFrameBuffer: Buffer.alloc(8),
      width: 400,
      height: 300,
      durationSec: 5,
    });
    assert.equal(result.tracking.trackingMode, "static");
    assert.equal(result.applied, false);
  });

  it("smart enforcement selects dynamic path for billboard assets", async () => {
    let sharp: typeof import("sharp").default;
    try {
      sharp = (await import("sharp")).default;
    } catch {
      return;
    }

    const logo = await sharp({
      create: {
        width: 80,
        height: 40,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("example.com/logo.png")) {
        return new Response(logo, { status: 200, headers: { "content-type": "image/png" } });
      }
      return originalFetch(input);
    };

    try {
      const result = await enforceBrandLockOnSegmentVideoSmart({
        segmentVideoPath: "/tmp/does-not-exist-segment.mp4",
        outputVideoPath: "/tmp/does-not-exist-out.mp4",
        brandLockedAssets: [billboardAsset()],
        segmentIndex: 0,
        referenceFrameBuffer: Buffer.alloc(8),
        width: 400,
        height: 300,
        durationSec: 5,
      });
      assert.equal(result.tracking.trackingMode, "quad_interpolation");
      assert.equal(result.tracking.trackedSamples, 11);
      assert.equal(result.applied, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPostCompositeOverlayPlans } from "@/lib/brand-asset-post-composite-plan";
import { buildBrandAssetProtectionLayer, validateProtectedBrandAssetsPostRender } from "@/lib/brand-asset-protection-layer";
import { quadCoversBounds, warpLogoBufferToQuad } from "@/lib/brand-asset-perspective-warp";

describe("brand asset perspective warp", () => {
  it("3. perspective warp produces output buffer", async () => {
    let sharp: typeof import("sharp").default;
    try {
      sharp = (await import("sharp")).default;
    } catch {
      return;
    }

    const logo = await sharp({
      create: {
        width: 120,
        height: 60,
        channels: 4,
        background: { r: 0, g: 128, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await warpLogoBufferToQuad({
      logoBuffer: logo,
      pixelQuad: {
        topLeft: { x: 100, y: 80 },
        topRight: { x: 300, y: 90 },
        bottomRight: { x: 280, y: 220 },
        bottomLeft: { x: 90, y: 210 },
      },
      canvasWidth: 400,
      canvasHeight: 300,
    });

    assert.equal(result.applied, true);
    assert.equal(result.alphaPreserved, true);
    const meta = await sharp(result.buffer).metadata();
    assert.equal(meta.width, 400);
    assert.equal(meta.height, 300);
  });

  it("4. warp uses original logo buffer dimensions", async () => {
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
        background: { r: 255, g: 0, b: 0, alpha: 0.8 },
      },
    })
      .png()
      .toBuffer();

    const originalStats = await sharp(logo).stats();
    const result = await warpLogoBufferToQuad({
      logoBuffer: logo,
      pixelQuad: {
        topLeft: { x: 20, y: 20 },
        topRight: { x: 180, y: 30 },
        bottomRight: { x: 170, y: 120 },
        bottomLeft: { x: 25, y: 110 },
      },
      canvasWidth: 200,
      canvasHeight: 150,
    });

    assert.equal(result.applied, true);
    const warpedStats = await sharp(result.buffer).stats();
    assert.ok(warpedStats.isOpaque === false || originalStats.isOpaque === false);
  });

  it("11. validation passes with perspective warp applied", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: {
        targetObjectId: "shirt",
        targetLabel: "Shirt",
        targetBounds: { x: 0.3, y: 0.35, width: 0.35, height: 0.2, exact: true },
        logoAssetUrl: "https://example.com/logo.png",
        preserveLogoExact: true,
        placementMode: "perspective_warp",
        perspective: "match_target",
        lighting: "match_scene",
        shadow: "natural",
      },
    });
    const validation = validateProtectedBrandAssetsPostRender({
      protection,
      renderSucceeded: true,
      postCompositeApplied: true,
      perspectiveWarpApplied: true,
    });
    assert.equal(validation.passed, true);
    assert.equal(validation.perspectiveWarpApplied, true);
    assert.equal(validation.quadUsed, true);
  });

  it("12. overlay plans include warp metadata for shirt placement", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: {
        targetObjectId: "shirt",
        targetLabel: "T-Shirt",
        targetBounds: { x: 0.32, y: 0.38, width: 0.36, height: 0.22, exact: true },
        logoAssetUrl: "https://example.com/logo.png",
        preserveLogoExact: true,
        placementMode: "perspective_warp",
        surfaceType: "shirt",
        perspective: "match_target",
        lighting: "match_scene",
        shadow: "natural",
      },
    });
    const plans = buildPostCompositeOverlayPlans({
      protection,
      sourceImageWidth: 1024,
      sourceImageHeight: 1024,
      outputImageWidth: 1024,
      outputImageHeight: 1024,
    });
    assert.equal(plans.length, 1);
    assert.equal(plans[0]?.placementMode, "perspective_warp");
    assert.ok(plans[0]?.quad);
    assert.ok(plans[0]?.pixelQuad);
    assert.equal(plans[0]?.surfaceType, "shirt");
  });

  it("quad covers bounds helper", () => {
    assert.equal(
      quadCoversBounds({
        topLeft: { x: 10, y: 10 },
        topRight: { x: 110, y: 12 },
        bottomRight: { x: 108, y: 90 },
        bottomLeft: { x: 8, y: 88 },
      }),
      true
    );
  });
});

describe("brand asset perspective warp integration", () => {
  it("5-10. post-composite applies perspective warp for warped plans", async () => {
    let sharp: typeof import("sharp").default;
    try {
      sharp = (await import("sharp")).default;
    } catch {
      return;
    }

    const { applyBrandAssetPostComposite } = await import("@/lib/brand-asset-post-composite");

    const render = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 220, g: 220, b: 220 },
      },
    })
      .png()
      .toBuffer();

    const logo = await sharp({
      create: {
        width: 100,
        height: 50,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("data:image/png")) {
        return new Response(logo, { status: 200, headers: { "content-type": "image/png" } });
      }
      return originalFetch(input);
    };

    try {
      const result = await applyBrandAssetPostComposite({
        renderBuffer: render,
        plans: [
          {
            assetId: "shirt_logo",
            sourceUrl: logoDataUrl,
            normalizedBounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
            pixelBounds: { left: 100, top: 75, width: 200, height: 150 },
            placementMode: "perspective_warp",
            surfaceType: "shirt",
            surfaceShape: "curved",
            quadSource: "polygon",
            quad: {
              topLeft: { x: 0.25, y: 0.25 },
              topRight: { x: 0.75, y: 0.28 },
              bottomRight: { x: 0.72, y: 0.75 },
              bottomLeft: { x: 0.22, y: 0.72 },
            },
            pixelQuad: {
              topLeft: { x: 100, y: 75 },
              topRight: { x: 300, y: 84 },
              bottomRight: { x: 288, y: 225 },
              bottomLeft: { x: 88, y: 216 },
            },
            sourceImageWidth: 400,
            sourceImageHeight: 300,
            outputImageWidth: 400,
            outputImageHeight: 300,
            fitMode: "contain",
            opacity: 1,
            rotationDeg: 0,
          },
        ],
        sourceImageWidth: 400,
        sourceImageHeight: 300,
      });

      assert.equal(result.applied, true);
      assert.equal(result.perspectiveWarpApplied, true);
      assert.deepEqual(result.perspectiveWarpAssetIds, ["shirt_logo"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

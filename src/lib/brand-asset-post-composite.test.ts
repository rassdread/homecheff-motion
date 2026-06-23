import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPostCompositeOverlayPlans,
  computeLogoDrawSize,
  defaultLogoPlacementBounds,
  normalizedBoundsToPixelBounds,
} from "@/lib/brand-asset-post-composite-plan";
import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import { resolveOpenAiEditSize } from "@/lib/editor-instruction-render-dimensions";

describe("brand asset post-composite", () => {
  it("maps normalized bounds to pixel coordinates", () => {
    const pixels = normalizedBoundsToPixelBounds(
      { x: 0.1, y: 0.2, width: 0.3, height: 0.25, exact: true },
      1000,
      800
    );
    assert.equal(pixels.left, 100);
    assert.equal(pixels.top, 160);
    assert.equal(pixels.width, 300);
    assert.equal(pixels.height, 200);
  });

  it("resolveOpenAiEditSize uses source aspect ratio", () => {
    assert.equal(resolveOpenAiEditSize(1600, 900), "1536x1024");
    assert.equal(resolveOpenAiEditSize(900, 1600), "1024x1536");
    assert.equal(resolveOpenAiEditSize(1024, 1024), "1024x1024");
  });

  it("contain mode preserves logo aspect inside target box", () => {
    const draw = computeLogoDrawSize({
      logoWidth: 400,
      logoHeight: 200,
      boxWidth: 200,
      boxHeight: 200,
      fitMode: "contain",
    });
    assert.equal(draw.width, 200);
    assert.equal(draw.height, 100);
    assert.equal(draw.leftOffset, 0);
    assert.equal(draw.topOffset, 50);
  });

  it("cover mode fills target box", () => {
    const draw = computeLogoDrawSize({
      logoWidth: 400,
      logoHeight: 200,
      boxWidth: 200,
      boxHeight: 200,
      fitMode: "cover",
    });
    assert.equal(draw.width, 400);
    assert.equal(draw.height, 200);
  });

  it("builds overlay plans with source and output dimensions", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "product_branding",
      logoAssets: [{ referenceId: "logo_1", url: "https://example.com/logo.png" }],
      generationSettings: { preserveLogoExact: true, position: "top-right" },
    });
    const plans = buildPostCompositeOverlayPlans({
      protection,
      sourceImageWidth: 1280,
      sourceImageHeight: 960,
      outputImageWidth: 1280,
      outputImageHeight: 960,
    });
    assert.equal(plans.length, 1);
    assert.equal(plans[0]?.sourceImageWidth, 1280);
    assert.equal(plans[0]?.outputImageHeight, 960);
    assert.equal(plans[0]?.fitMode, "contain");
    assert.ok(plans[0]!.pixelBounds.width > 0);
  });

  it("logo placement blueprint bounds become overlay plans", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: {
        targetObjectId: "shirt",
        targetLabel: "Shirt",
        targetBounds: { x: 0.32, y: 0.38, width: 0.36, height: 0.22, exact: true },
        logoAssetUrl: "https://example.com/logo.png",
        preserveLogoExact: true,
        placementMode: "fit_to_target",
        perspective: "flat",
        lighting: "match_scene",
        shadow: "natural",
      },
    });
    const plans = buildPostCompositeOverlayPlans({
      protection,
      sourceImageWidth: 1000,
      sourceImageHeight: 1000,
      outputImageWidth: 1000,
      outputImageHeight: 1000,
    });
    assert.equal(plans.length, 1);
    assert.equal(plans[0]?.pixelBounds.left, 320);
    assert.equal(plans[0]?.pixelBounds.top, 380);
  });

  it("default logo placement positions map to bounds", () => {
    const topRight = defaultLogoPlacementBounds("top-right");
    assert.ok(topRight.x > 0.5);
    const center = defaultLogoPlacementBounds("center");
    assert.ok(center.width >= 0.25);
  });
});

describe("brand asset post-composite sharp integration", () => {
  it("composites logo buffer onto render buffer", async () => {
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
        background: { r: 200, g: 200, b: 200 },
      },
    })
      .png()
      .toBuffer();

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
            assetId: "test_logo",
            sourceUrl: logoDataUrl,
            normalizedBounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
            pixelBounds: { left: 100, top: 75, width: 200, height: 150 },
            placementMode: "fit_to_target",
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
      assert.deepEqual(result.appliedAssetIds, ["test_logo"]);
      const meta = await sharp(result.buffer).metadata();
      assert.equal(meta.width, 400);
      assert.equal(meta.height, 300);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

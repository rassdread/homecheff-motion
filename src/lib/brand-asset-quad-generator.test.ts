import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boundsToBrandQuad,
  generatePlacementQuad,
  inferBrandPlacementSurfaceType,
  inferBrandSurfaceShape,
  normalizedQuadToPixelQuad,
  resetPlacementQuad,
} from "@/lib/brand-asset-quad-generator";
import { BRAND_ASSET_VISION_AUDIT, workflowCanAutoGenerateQuad } from "@/lib/brand-asset-vision-audit";

const BBOX = { x: 0.2, y: 0.3, width: 0.4, height: 0.25, exact: true };

describe("brand asset quad generator", () => {
  it("1. generates quad from bbox", () => {
    const result = generatePlacementQuad({ bbox: BBOX, objectLabel: "Billboard" });
    assert.equal(result.source, "bbox");
    assert.ok(result.quad.topLeft.x >= 0);
    assert.ok(result.quad.bottomRight.y <= 1);
  });

  it("2. generates quad from polygon", () => {
    const result = generatePlacementQuad({
      bbox: BBOX,
      polygon: [
        { x: 0.2, y: 0.3 },
        { x: 0.6, y: 0.32 },
        { x: 0.58, y: 0.55 },
        { x: 0.22, y: 0.53 },
      ],
      objectLabel: "Shirt",
    });
    assert.equal(result.source, "polygon");
    assert.equal(result.surfaceType, "shirt");
    assert.equal(result.placementMode, "perspective_warp");
  });

  it("3. shirt placement uses perspective warp", () => {
    const result = generatePlacementQuad({ bbox: BBOX, objectLabel: "T-Shirt", objectCategory: "clothing" });
    assert.equal(result.surfaceType, "shirt");
    assert.equal(result.placementMode, "perspective_warp");
    assert.equal(result.surfaceShape, "curved");
  });

  it("4. packaging placement uses perspective warp", () => {
    const result = generatePlacementQuad({ bbox: BBOX, objectLabel: "Cereal box", objectCategory: "packaging" });
    assert.equal(result.surfaceType, "packaging");
    assert.equal(result.placementMode, "perspective_warp");
  });

  it("5. billboard placement uses perspective warp", () => {
    const result = generatePlacementQuad({ bbox: BBOX, objectLabel: "Outdoor billboard" });
    assert.equal(result.surfaceType, "billboard");
    assert.ok(result.quad.topLeft);
  });

  it("6. vehicle placement uses perspective warp", () => {
    const result = generatePlacementQuad({ bbox: BBOX, objectLabel: "Delivery van", objectCategory: "vehicle" });
    assert.equal(result.surfaceType, "vehicle");
    assert.equal(result.surfaceShape, "curved");
  });

  it("7. mug placement uses curved warp architecture", () => {
    const result = generatePlacementQuad({ bbox: BBOX, objectLabel: "Coffee mug" });
    assert.equal(result.surfaceType, "mug");
    assert.equal(result.surfaceShape, "curved");
    assert.deepEqual(result.curveMesh, { enabled: false });
  });

  it("8. fallback to bbox when polygon too small", () => {
    const result = generatePlacementQuad({
      bbox: BBOX,
      polygon: [{ x: 0.2, y: 0.3 }],
      objectLabel: "Poster",
    });
    assert.equal(result.source, "bbox");
  });

  it("9. normalized quad maps to pixel coordinates", () => {
    const quad = boundsToBrandQuad(BBOX);
    const pixels = normalizedQuadToPixelQuad(quad, 1000, 800);
    assert.equal(pixels.topLeft.x, 200);
    assert.equal(pixels.topLeft.y, 240);
  });

  it("10. reset restores generated quad", () => {
    const reset = resetPlacementQuad({
      bbox: BBOX,
      objectLabel: "Shirt",
      userQuad: { topLeft: { x: 0, y: 0 }, topRight: { x: 1, y: 0 }, bottomRight: { x: 1, y: 1 }, bottomLeft: { x: 0, y: 1 } },
    });
    assert.ok(reset.source === "bbox" || reset.source === "vision_contour");
    assert.equal(reset.placementMode, "perspective_warp");
  });

  it("11. vision audit lists polygon-capable workflows", () => {
    const logoPlacement = BRAND_ASSET_VISION_AUDIT.find((entry) => entry.workflow === "logo_placement");
    assert.ok(logoPlacement?.hasPolygon);
    assert.equal(workflowCanAutoGenerateQuad("logo_placement"), true);
  });

  it("12. surface inference covers signage and product label", () => {
    assert.equal(inferBrandPlacementSurfaceType({ label: "Store signage" }), "signage");
    assert.equal(inferBrandPlacementSurfaceType({ label: "Product label" }), "product_label");
    assert.equal(inferBrandSurfaceShape("wall"), "flat");
  });
});

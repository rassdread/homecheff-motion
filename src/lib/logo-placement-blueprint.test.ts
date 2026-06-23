import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLogoPlacementBlueprint,
  logoPlacementRenderInstructions,
  objectSupportsLogoPlacement,
  resolveProductBrandingLogoGeometry,
} from "@/lib/logo-placement-blueprint";
import { buildLogoPlacementWizardRoute } from "@/lib/assistant-editor-routes";
import { buildFusionRenderPayload } from "@/lib/editor-fusion-render-payload";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function productDocWithVisionGeometry() {
  const doc = createEditorDocumentFromUpload({
    name: "cereal-box.png",
    backgroundUrl: "https://example.com/cereal-box.png",
    storageKey: "cereal-box.png",
  });
  const packagingLayer: EditorCanvasLayer = {
    ...doc.objects[0]!,
    id: "packaging_front",
    label: "Packaging front",
    layerType: "semantic",
    semanticType: "packaging",
    category: "package",
    bounds: { x: 0.18, y: 0.22, width: 0.52, height: 0.48 },
    selectionShape: {
      selectionMode: "polygon",
      boundingBox: { x: 0.18, y: 0.22, width: 0.52, height: 0.48 },
      polygon: [
        { x: 0.18, y: 0.24 },
        { x: 0.68, y: 0.22 },
        { x: 0.7, y: 0.68 },
        { x: 0.2, y: 0.7 },
      ],
      maskUrl: "https://example.com/packaging-mask.png",
    },
  };
  return {
    ...doc,
    objects: [doc.objects[0]!, packagingLayer],
  };
}

describe("logo placement blueprint", () => {
  it("stores targetBounds and preserveLogoExact", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "jacket",
        label: "Jacket",
        bounds: { x: 0.28, y: 0.36, width: 0.44, height: 0.2, exact: true },
      },
      logoAssetUrl: "https://example.com/my-logo.png",
    });
    assert.equal(blueprint.targetObjectId, "jacket");
    assert.equal(blueprint.preserveLogoExact, true);
    assert.equal(blueprint.targetBounds.width, 0.44);
    assert.equal(blueprint.placementMode, "perspective_warp");
    assert.ok(blueprint.quad);
    const instructions = logoPlacementRenderInstructions(blueprint);
    assert.ok(instructions.some((line) => line.includes("do not redraw")));
  });

  it("wizard route is wizard-first", () => {
    const route = buildLogoPlacementWizardRoute({ targetObjectId: "shirt" });
    assert.match(route, /workflow=logo_placement/);
    assert.match(route, /targetObjectId=shirt/);
  });

  it("supports branding object categories", () => {
    assert.equal(objectSupportsLogoPlacement({ id: "1", label: "Shirt", category: "clothing", confidence: 1, description: "", suggestedActions: [] }), true);
    assert.equal(objectSupportsLogoPlacement({ id: "2", label: "Tree", category: "environment", confidence: 1, description: "", suggestedActions: [] }), false);
  });

  it("product branding resolves polygon and mask geometry from document", () => {
    const document = productDocWithVisionGeometry();
    const geometry = resolveProductBrandingLogoGeometry(document, {
      preserveLogoExact: true,
      position: "top-right",
    });
    assert.ok(geometry);
    assert.equal(geometry.hasPolygon, true);
    assert.equal(geometry.hasMask, true);
    assert.equal(geometry.quadSource, "polygon");
    assert.ok(geometry.quad.topLeft);
  });

  it("buildFusionRenderPayload wires product branding quad onto protected logo", () => {
    const document = productDocWithVisionGeometry();
    const plan = createInitialFusionPlan(document, "product_branding");
    plan.references = [
      { id: "logo_ref", type: "logo", url: "https://example.com/logo.png", name: "Logo" },
    ];
    const payload = buildFusionRenderPayload({ document, plan, profiles: [] });
    const logoAsset = payload.brandProtection?.assets.find((asset) => asset.assetType === "logo");
    assert.ok(logoAsset?.quad);
    assert.equal(logoAsset.quadSource, "polygon");
    assert.equal(logoAsset.placementMode, "perspective_warp");
    assert.ok(payload.brandProtection?.renderInstructions.some((line) => line.includes("polygon")));
  });
});

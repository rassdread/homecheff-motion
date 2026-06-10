import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorAssetProfile, detectEditorAssetType } from "@/lib/editor-asset-intelligence";
import { recommendationsForAssetType } from "@/lib/editor-asset-recommendations";
import { resolveEcosystemDestination } from "@/lib/editor-asset-ecosystem-routing";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mockDoc(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  return {
    sessionId: "sess-ai",
    name: "Globe Man Mascot",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/mascot.png",
    workflowStep: "edit",
    objects: [
      {
        id: "layer_1",
        label: "Globe Man",
        layerType: "semantic",
        category: "character",
        bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.8 },
        transform: { x: 0.35, y: 0.5, scale: 1, rotation: 0 },
        visible: true,
        locked: false,
      },
    ],
    placements: [],
    status: "editing",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("editor-asset-intelligence", () => {
  it("detects mascot from name", () => {
    const result = detectEditorAssetType(mockDoc());
    assert.equal(result.assetType, "mascot");
    assert.ok(result.confidence >= 0.6);
  });

  it("detects logo from name", () => {
    const result = detectEditorAssetType(mockDoc({ name: "HomeCheff Logo" }));
    assert.equal(result.assetType, "logo");
  });

  it("detects food from name", () => {
    const result = detectEditorAssetType(mockDoc({ name: "Restaurant dish photo" }));
    assert.equal(result.assetType, "food");
  });

  it("builds profile with recommendations and routing", () => {
    const profile = buildEditorAssetProfile(mockDoc());
    assert.equal(profile.assetType, "mascot");
    assert.ok(profile.recommendedActions.length >= 3);
    assert.equal(profile.recommendedDestination, "library_characters");
    assert.ok(profile.studioIntent.kind === "character");
    assert.ok(profile.recommendedMotionUse.score >= 0);
  });

  it("logo routes to brand kit", () => {
    assert.equal(resolveEcosystemDestination("logo"), "brand_kit");
    const recs = recommendationsForAssetType("logo", mockDoc({ name: "Logo" }), 50);
    assert.ok(recs.some((r) => r.id === "add_to_brand_kit"));
  });

  it("poster recommends print and social", () => {
    const recs = recommendationsForAssetType("poster", mockDoc({ name: "Summer Poster" }), 50);
    assert.ok(recs.some((r) => r.id === "print_export"));
    assert.ok(recs.some((r) => r.id === "social_export"));
  });
});

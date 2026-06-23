import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { confidenceToTier, resolveVisionTargetHighlightGeometry } from "@/lib/vision-target-highlight";
import {
  visionTargetGeometryStyle,
  visionTargetPolygonToPercentPath,
  visionTargetQuadToPercentPath,
} from "@/lib/vision-target-highlight-overlay";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function docWithPolygon(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_highlight",
    name: "pack.jpg",
    sourceKind: "product",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/pack.jpg",
    workflowStep: "visual_editor",
    objects: [
      {
        id: "layer_pack",
        label: "Pack",
        type: "image",
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        rotation: 0,
        selectionShape: {
          polygon: [
            { x: 0.2, y: 0.3 },
            { x: 0.7, y: 0.3 },
            { x: 0.75, y: 0.7 },
            { x: 0.15, y: 0.65 },
          ],
        },
      },
    ],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

describe("vision target highlight (Sprint K1.4)", () => {
  it("maps confidence to user-facing tiers", () => {
    assert.equal(confidenceToTier(0.91), "very_high");
    assert.equal(confidenceToTier(0.73), "likely");
    assert.equal(confidenceToTier(0.55), "review_recommended");
  });

  it("prefers polygon over bbox for highlight geometry", () => {
    const geometry = resolveVisionTargetHighlightGeometry(docWithPolygon(), {
      layerId: "layer_pack",
      label: "Voorzijde",
    });
    assert.equal(geometry.priority, "polygon");
    assert.ok(geometry.polygon?.length === 4);
    assert.ok(geometry.bounds.width > 0);
  });

  it("builds percent SVG paths for polygon and quad", () => {
    const polygonPath = visionTargetPolygonToPercentPath([
      { x: 0.1, y: 0.2 },
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.6 },
    ]);
    assert.ok(polygonPath.startsWith("M 10 20"));
    assert.ok(polygonPath.endsWith("Z"));

    const quadPath = visionTargetQuadToPercentPath({
      topLeft: { x: 0.1, y: 0.2 },
      topRight: { x: 0.5, y: 0.2 },
      bottomRight: { x: 0.5, y: 0.6 },
      bottomLeft: { x: 0.1, y: 0.6 },
    });
    assert.ok(quadPath.includes("L 50 20"));

    const style = visionTargetGeometryStyle(
      {
        priority: "polygon",
        bounds: { x: 0.1, y: 0.2, width: 0.4, height: 0.4, exact: true },
        polygon: [
          { x: 0.1, y: 0.2 },
          { x: 0.5, y: 0.2 },
          { x: 0.5, y: 0.6 },
          { x: 0.1, y: 0.6 },
        ],
      },
      "selected"
    );
    assert.equal(style.kind, "polygon");
  });
});

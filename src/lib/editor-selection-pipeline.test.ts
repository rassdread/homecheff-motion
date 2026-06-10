import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeSelectLayerOptions,
  resolveAutoMaskClickPoint,
  uxV7ActionAllowed,
} from "@/lib/editor-selection-pipeline";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function mockLayer(): EditorCanvasLayer {
  return {
    id: "layer_1",
    label: "Globe",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.22, y: 0.12, width: 0.56, height: 0.78 },
    layerType: "semantic",
    category: "character",
    metadata: { estimatedBounds: true },
  };
}

describe("editor-selection-pipeline", () => {
  it("normalizes legacy partId string option", () => {
    assert.deepEqual(normalizeSelectLayerOptions("part_1"), { partId: "part_1" });
  });

  it("uses click point when provided", () => {
    const point = resolveAutoMaskClickPoint(mockLayer(), { x: 0.6, y: 0.35 });
    assert.equal(point.x, 0.6);
    assert.equal(point.y, 0.35);
  });

  it("falls back to bbox center without click", () => {
    const layer = mockLayer();
    const point = resolveAutoMaskClickPoint(layer, null);
    assert.equal(point.x, layer.bounds.x + layer.bounds.width / 2);
  });

  it("blocks replace until mask on object layers", () => {
    assert.equal(uxV7ActionAllowed(mockLayer(), "replace"), false);
    assert.equal(uxV7ActionAllowed(mockLayer(), "background_remove"), false);
  });
});

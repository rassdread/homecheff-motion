import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  layerBoundsCenter,
  pickAutoMaskStrategy,
  shouldAutoAcquireMask,
} from "@/lib/editor-auto-mask";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function mockLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "layer_1",
    label: "Mascot",
    layerType: "semantic",
    category: "character",
    bounds: { x: 0.2, y: 0.2, width: 0.4, height: 0.5 },
    transform: { x: 0.4, y: 0.45, scale: 1, rotation: 0 },
    visible: true,
    locked: false,
    ...overrides,
  };
}

describe("editor-auto-mask", () => {
  it("should auto-acquire for mascot without mask", () => {
    assert.equal(shouldAutoAcquireMask(mockLayer()), true);
  });

  it("skips background layers", () => {
    assert.equal(shouldAutoAcquireMask(mockLayer({ layerType: "background" })), false);
  });

  it("prefers Replicate over SAM2 over rembg", () => {
    assert.equal(pickAutoMaskStrategy(true, true, true), "replicate");
    assert.equal(pickAutoMaskStrategy(false, true, true), "sam2");
    assert.equal(pickAutoMaskStrategy(false, false, true), "rembg");
    assert.equal(pickAutoMaskStrategy(false, false, false), "none");
  });

  it("computes bbox center for click segment", () => {
    assert.deepEqual(layerBoundsCenter(mockLayer()), { x: 0.4, y: 0.45 });
  });
});

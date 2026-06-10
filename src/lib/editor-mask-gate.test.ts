import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateEditorMaskGate, editorLayerHasMaskUrl } from "@/lib/editor-mask-gate";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function mockLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "layer_1",
    label: "Object",
    layerType: "semantic",
    semanticType: "product_body",
    bounds: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
    transform: { x: 0.35, y: 0.35, scale: 1, rotation: 0 },
    visible: true,
    locked: false,
    confidence: 0.9,
    ...overrides,
  };
}

describe("editor-mask-gate", () => {
  it("blocks pixel edits without maskUrl", () => {
    const gate = evaluateEditorMaskGate(mockLayer());
    assert.equal(gate.allowed, false);
    assert.equal(gate.hasMaskUrl, false);
    assert.ok(gate.reasonKey);
  });

  it("allows pixel edits when maskUrl is present", () => {
    const gate = evaluateEditorMaskGate(
      mockLayer({
        selectionShape: {
          maskUrl: "https://example.com/mask.png",
          source: "sam2",
        },
      })
    );
    assert.equal(gate.allowed, true);
    assert.equal(editorLayerHasMaskUrl(mockLayer({ selectionShape: { maskUrl: "https://example.com/mask.png" } })), true);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  editorDeleteShouldInpaintMask,
  editorReplaceShouldUseMask,
} from "@/lib/editor-mask-actions";
import {
  applyEditorSelectionShape,
  applyRefinedPolygonToLayer,
  boundsFromPolygon,
  createManualPolygonShape,
  createMaskSelectionShape,
  editorLayerHasPreciseShape,
  editorOperationUsesMask,
  isApproximateEditorSelection,
  normalizeLassoPoints,
  refineSelectionPolygonFromBounds,
  transparentExportRequiresRefine,
} from "@/lib/editor-object-mask";
import { editorHumanUiHidesMaskTerminology, resolveEditorMaskSuggestions } from "@/lib/editor-human-first";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function semanticLayer(bounds = { x: 0.2, y: 0.2, width: 0.4, height: 0.5 }): EditorCanvasLayer {
  const doc = createEditorDocumentFromUpload({
    name: "Test",
    backgroundUrl: "https://example.com/a.png",
  });
  return {
    ...doc.objects[0]!,
    id: "obj-1",
    label: "Mascot",
    layerType: "semantic",
    bounds,
    category: "character",
    metadata: { estimatedBounds: true, approximateSelection: true },
  };
}

describe("editor object mask selection", () => {
  it("EditorCanvasLayer supports optional selectionShape with polygon and mask", () => {
    const layer = semanticLayer();
    const polygon = refineSelectionPolygonFromBounds(layer.bounds);
    const shape = createMaskSelectionShape({
      bounds: layer.bounds,
      maskUrl: "https://example.com/mask.png",
      polygon,
      segmentationSource: "rembg",
    });
    const next = applyEditorSelectionShape(layer, shape);
    assert.equal(next.selectionShape?.selectionMode, "mask");
    assert.ok(next.selectionShape?.polygon?.length);
    assert.equal(next.selectionShape?.maskUrl, "https://example.com/mask.png");
    assert.equal(next.metadata?.approximateSelection, false);
  });

  it("object without mask is approximate", () => {
    const layer = semanticLayer();
    assert.equal(isApproximateEditorSelection(layer), true);
    assert.equal(editorLayerHasPreciseShape(layer), false);
  });

  it("manual polygon creates mask-capable object", () => {
    const points = normalizeLassoPoints([
      { x: 0.2, y: 0.2 },
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.6 },
      { x: 0.2, y: 0.6 },
    ]);
    const shape = createManualPolygonShape(points);
    assert.ok(shape);
    assert.equal(shape?.selectionMode, "manual");
    const layer = applyRefinedPolygonToLayer(semanticLayer(), points);
    assert.equal(editorLayerHasPreciseShape(layer), true);
    assert.equal(isApproximateEditorSelection(layer), false);
  });

  it("boundsFromPolygon envelopes manual lasso", () => {
    const bounds = boundsFromPolygon([
      { x: 0.1, y: 0.2 },
      { x: 0.4, y: 0.2 },
      { x: 0.4, y: 0.5 },
    ]);
    assert.ok(Math.abs(bounds.x - 0.1) < 0.001);
    assert.ok(Math.abs(bounds.width - 0.3) < 0.001);
  });

  it("remove and replace use mask when present", () => {
    const layer = applyEditorSelectionShape(
      semanticLayer(),
      createMaskSelectionShape({ bounds: { x: 0.2, y: 0.2, width: 0.3, height: 0.4 }, maskUrl: "m" })
    );
    assert.equal(editorOperationUsesMask("delete", layer), true);
    assert.equal(editorDeleteShouldInpaintMask(layer), true);
    assert.equal(editorReplaceShouldUseMask(layer), true);
  });

  it("transparent export warns without mask", () => {
    assert.equal(transparentExportRequiresRefine(semanticLayer()), true);
    const masked = applyEditorSelectionShape(
      semanticLayer(),
      createMaskSelectionShape({ bounds: { x: 0, y: 0, width: 1, height: 1 }, maskUrl: "m", alphaMask: true })
    );
    assert.equal(transparentExportRequiresRefine(masked), false);
  });

  it("refine selection suggestions available for approximate layers", () => {
    const suggestions = resolveEditorMaskSuggestions(semanticLayer());
    assert.ok(suggestions.some((s) => s.id === "refine_selection"));
    assert.ok(suggestions.some((s) => s.id === "outline_manual"));
  });

  it("preview renders contour outline component", () => {
    const preview = readFileSync("src/components/editor/editor-canvas-preview.tsx", "utf8");
    assert.match(preview, /EditorSelectionOutline/);
    assert.match(preview, /isApproximateEditorSelection/);
    assert.match(preview, /EditorRefineLassoOverlay/);
  });

  it("human-first UI hides technical mask terms in visual mode", () => {
    assert.equal(editorHumanUiHidesMaskTerminology("visual"), true);
    assert.equal(editorHumanUiHidesMaskTerminology("advanced"), false);
    const panel = readFileSync("src/components/editor/editor-selection-tools-panel.tsx", "utf8");
    assert.doesNotMatch(panel, /segmentation/i);
    assert.doesNotMatch(panel, /polygon/i);
  });

  it("advanced properties panel shows mask metadata", () => {
    const panel = readFileSync("src/components/editor/editor-properties-panel.tsx", "utf8");
    assert.match(panel, /editor\.mask\.advanced\.selectionMode/);
    assert.match(panel, /editor\.mask\.advanced\.maskUrl/);
  });

  it("segment API route exists", () => {
    const route = readFileSync("src/app/api/editor/segment/route.ts", "utf8");
    assert.match(route, /segmentByPrompt|removeBackground/);
  });
});

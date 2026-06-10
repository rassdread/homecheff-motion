import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyBackgroundRemovalResult, findPrimarySubjectLayer } from "@/lib/editor-background-remove";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function baseDoc(objects: EditorCanvasLayer[]): EditorCanvasDocument {
  return {
    sessionId: "sess-bg",
    name: "Mascot",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/photo.jpg",
    workflowStep: "edit",
    objects,
    placements: [],
    status: "editing",
    updatedAt: new Date().toISOString(),
  };
}

describe("editor-background-remove", () => {
  it("finds primary semantic subject", () => {
    const doc = baseDoc([
      { id: "bg", label: "BG", layerType: "background", bounds: { x: 0, y: 0, width: 1, height: 1 }, transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 }, visible: true, locked: true },
      { id: "mascot", label: "Mascot", layerType: "semantic", category: "character", bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.7 }, transform: { x: 0.35, y: 0.45, scale: 1, rotation: 0 }, visible: true, locked: false },
    ]);
    assert.equal(findPrimarySubjectLayer(doc)?.id, "mascot");
  });

  it("updates compositor master background after cutout", () => {
    const doc = baseDoc([
      { id: "mascot", label: "Mascot", layerType: "semantic", category: "character", bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.7 }, transform: { x: 0.35, y: 0.45, scale: 1, rotation: 0 }, visible: true, locked: false },
    ]);
    const next = applyBackgroundRemovalResult(doc, {
      cutoutUrl: "https://example.com/cutout.png",
      maskUrl: "https://example.com/mask.png",
    });
    assert.equal(next.backgroundUrl, "https://example.com/cutout.png");
    assert.ok(next.importedLayers?.some((layer) => layer.cutoutUrl === "https://example.com/cutout.png"));
  });
});

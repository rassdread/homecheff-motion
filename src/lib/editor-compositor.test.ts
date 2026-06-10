import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEditorCompositorLayers,
  compositorOverlayLayers,
  parseCompositorLayerId,
  promoteCutoutToImportedLayer,
} from "@/lib/editor-compositor";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function minimalDocument(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  return {
    sessionId: "sess-compositor",
    name: "Compositor test",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/bg.png",
    workflowStep: "edit",
    objects: [],
    placements: [],
    status: "editing",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("editor-compositor", () => {
  it("builds background plus imported overlay layers", () => {
    const doc = minimalDocument({
      importedLayers: [
        {
          id: "imp_logo",
          label: "HomeCheff logo",
          sourceAssetId: null,
          sourceImageUrl: "https://example.com/logo.png",
          transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
          zIndex: 10,
          blendMode: "normal",
          opacity: 1,
          shadow: false,
          softEdge: 0,
          locked: false,
          visible: true,
          flippedX: false,
          flippedY: false,
          matchLighting: false,
          matchColor: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    const layers = buildEditorCompositorLayers(doc);
    assert.equal(layers[0]?.kind, "background");
    assert.ok(layers.some((layer) => layer.kind === "imported" && layer.imageUrl.includes("logo")));
  });

  it("dedupes cutouts already promoted to imported layers", () => {
    const doc = minimalDocument({
      cutoutAssets: [
        {
          id: "cut_1",
          objectId: "obj_mascot",
          label: "Mascot",
          layerId: "layer_mascot",
          cutoutUrl: "https://example.com/cutout.png",
          maskUrl: "https://example.com/mask.png",
          boundingBox: { x: 0.1, y: 0.1, width: 0.4, height: 0.5 },
          createdAt: new Date().toISOString(),
        },
      ],
      importedLayers: [
        {
          id: "imported_cutout_layer_mascot_1",
          label: "Mascot — cutout",
          sourceAssetId: null,
          sourceImageUrl: "https://example.com/cutout.png",
          cutoutUrl: "https://example.com/cutout.png",
          transform: { x: 0.3, y: 0.3, scale: 1, rotation: 0 },
          zIndex: 11,
          blendMode: "normal",
          opacity: 1,
          shadow: false,
          softEdge: 0,
          locked: false,
          visible: true,
          flippedX: false,
          flippedY: false,
          matchLighting: false,
          matchColor: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    const overlays = compositorOverlayLayers(doc);
    assert.equal(overlays.length, 1);
    assert.equal(overlays[0]?.imageUrl, "https://example.com/cutout.png");
  });

  it("promoteCutoutToImportedLayer adds visible imported layer", () => {
    const doc = minimalDocument();
    const next = promoteCutoutToImportedLayer(doc, {
      cutoutUrl: "https://example.com/cut.png",
      label: "Globe",
      layerId: "layer_globe",
    });
    assert.equal(next.importedLayers?.length, 1);
    assert.equal(next.importedLayers?.[0]?.cutoutUrl, "https://example.com/cut.png");
  });

  it("parseCompositorLayerId splits kind and source id", () => {
    assert.deepEqual(parseCompositorLayerId("imported:imp_logo"), {
      kind: "imported",
      sourceId: "imp_logo",
    });
    assert.equal(parseCompositorLayerId("invalid"), null);
  });
});

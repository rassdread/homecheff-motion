import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyEditorLayerOperation,
  createEditorDocumentFromUpload,
  undoEditorDocument,
  redoEditorDocument,
} from "@/lib/editor-canvas-session";
import {
  buildEditorObjectsFromLayers,
  findEditorObjectByLayerId,
} from "@/lib/editor-object-detection";
import {
  bboxHitTest,
  maskHitTest,
  pickTopEditorObjectAtPoint,
  pointInPolygon,
  polygonHitTest,
} from "@/lib/editor-object-picking";
import {
  commitEditorHistory,
  createEditorNonDestructiveState,
  editorCanUndo,
  undoEditorDocument as undoNd,
} from "@/lib/editor-non-destructive";
import { buildEditorSemanticLayerTree, reorderEditorLayers } from "@/lib/editor-semantic-layer-tree";
import { planEditorSmartReplace } from "@/lib/editor-smart-replace";
import { planEditorSmartRemove } from "@/lib/editor-smart-remove";
import { extractEditorTextLayers, isEditorTextLayerCandidate } from "@/lib/editor-text-layers";
import { buildEditorMotionPreparations } from "@/lib/editor-motion-preparation";
import { auditEditorSegmentationProviders } from "@/lib/editor-segmentation-strategy";
import {
  applyEditorSelectionShape,
  createMaskSelectionShape,
  refineSelectionPolygonFromBounds,
} from "@/lib/editor-object-mask";
import type { EditorCanvasLayer, EditorObject } from "@/types/homecheff-visual-editor";

function mascotLayer(id: string, bounds: { x: number; y: number; width: number; height: number }, label: string): EditorCanvasLayer {
  const doc = createEditorDocumentFromUpload({ name: "Test", backgroundUrl: "https://example.com/a.png" });
  return {
    ...doc.objects[0]!,
    id,
    label,
    layerType: "semantic",
    bounds,
    category: "character",
    semanticType: "character",
    parentObjectId: "semantic_root_character",
    locked: false,
    visible: true,
    metadata: { estimatedBounds: true },
  };
}

describe("Editor Vision V2", () => {
  it("multi-object detection stores all objects with geometry", () => {
    const doc = createEditorDocumentFromUpload({ name: "Mascot", backgroundUrl: "https://example.com/a.png" });
    const globe = mascotLayer("globe", { x: 0.55, y: 0.4, width: 0.2, height: 0.2 }, "Globe");
    const hand = mascotLayer("hand", { x: 0.1, y: 0.42, width: 0.15, height: 0.12 }, "Hand");
    const layers = [...doc.objects, globe, hand];
    const objects = buildEditorObjectsFromLayers(layers);
    assert.equal(objects.length, 3);
    assert.ok(findEditorObjectByLayerId(objects, "globe"));
    assert.ok(findEditorObjectByLayerId(objects, "hand"));
    assert.equal(objects.find((o) => o.layerId === "globe")?.category, "mascot");
  });

  it("object picking prefers mask over bbox", () => {
    const polygon = refineSelectionPolygonFromBounds({ x: 0.5, y: 0.4, width: 0.2, height: 0.2 });
    const globe: EditorObject = {
      id: "obj_globe",
      layerId: "globe",
      label: "Globe",
      confidence: 0.9,
      mask: "https://example.com/mask.png",
      polygon,
      bbox: { x: 0.5, y: 0.4, width: 0.2, height: 0.2 },
      category: "prop",
      zIndex: 2,
      visible: true,
      locked: false,
    };
    const hand: EditorObject = {
      id: "obj_hand",
      layerId: "hand",
      label: "Hand",
      confidence: 0.7,
      bbox: { x: 0.1, y: 0.42, width: 0.8, height: 0.12 },
      category: "person",
      zIndex: 1,
      visible: true,
      locked: false,
    };
    const point = { x: 0.58, y: 0.48 };
    assert.equal(maskHitTest(point, globe), true);
    assert.equal(bboxHitTest(point, hand), true);
    const pick = pickTopEditorObjectAtPoint(point, [hand, globe]);
    assert.equal(pick?.object.layerId, "globe");
    assert.equal(pick?.method, "mask");
  });

  it("polygon hit test selects inner object", () => {
    const poly = [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 0.3, y: 0.7 },
    ];
    assert.equal(pointInPolygon({ x: 0.5, y: 0.5 }, poly), true);
    assert.equal(pointInPolygon({ x: 0.1, y: 0.1 }, poly), false);
    const obj: EditorObject = {
      id: "obj_face",
      layerId: "face",
      label: "Face",
      confidence: 0.8,
      polygon: poly,
      bbox: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
      category: "face",
      zIndex: 3,
      visible: true,
      locked: false,
    };
    assert.equal(polygonHitTest({ x: 0.5, y: 0.5 }, obj), true);
  });

  it("semantic layer tree nests under Image root", () => {
    const doc = createEditorDocumentFromUpload({ name: "T", backgroundUrl: "https://example.com/a.png" });
    const mascot = mascotLayer("mascot", { x: 0.2, y: 0.1, width: 0.6, height: 0.8 }, "Mascot");
    const globe = mascotLayer("globe", { x: 0.55, y: 0.4, width: 0.2, height: 0.2 }, "Globe");
    globe.parentObjectId = "mascot";
    const tree = buildEditorSemanticLayerTree([...doc.objects, mascot, globe]);
    assert.equal(tree.rootLabel, "Image");
    assert.ok(tree.nodes.some((n) => n.layer.layerType === "background"));
    const mascotNode = tree.nodes.flatMap((n) => n.children).find((c) => c.layer.id === "globe");
    assert.ok(mascotNode || tree.nodes.some((n) => n.children.length > 0));
  });

  it("layer reorder changes z-order", () => {
    const a = mascotLayer("a", { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, "A");
    const b = mascotLayer("b", { x: 0.3, y: 0.1, width: 0.2, height: 0.2 }, "B");
    const reordered = reorderEditorLayers([a, b], "b", "up");
    assert.equal(reordered[0]?.id, "b");
  });

  it("non-destructive state preserves original background", () => {
    const doc = createEditorDocumentFromUpload({ name: "T", backgroundUrl: "https://example.com/original.png" });
    const nd = createEditorNonDestructiveState(doc);
    assert.equal(nd.backgroundOriginalUrl, "https://example.com/original.png");
  });

  it("undo restores previous document", () => {
    const doc = createEditorDocumentFromUpload({ name: "T", backgroundUrl: "https://example.com/a.png" });
    const layer = mascotLayer("x", { x: 0.2, y: 0.2, width: 0.3, height: 0.3 }, "Before");
    const withLayer = { ...doc, objects: [...doc.objects, layer] };
    const renamed = applyEditorLayerOperation(withLayer, "x", "rename", { label: "After" });
    assert.equal(renamed.objects.find((o) => o.id === "x")?.label, "After");
    const undone = undoEditorDocument(renamed);
    assert.equal(undone.objects.find((o) => o.id === "x")?.label, "Before");
    const redone = redoEditorDocument(undone);
    assert.equal(redone.objects.find((o) => o.id === "x")?.label, "After");
  });

  it("commitEditorHistory enables undo", () => {
    const doc = createEditorDocumentFromUpload({ name: "T", backgroundUrl: "https://example.com/a.png" });
    const after = { ...doc, name: "Changed" };
    const committed = commitEditorHistory(doc, after, "rename", "rename session");
    assert.equal(editorCanUndo(committed), true);
    const undone = undoNd(committed);
    assert.equal(undone.name, "T");
  });

  it("smart replace plans mask-constrained edit", () => {
    const layer = mascotLayer("globe", { x: 0.5, y: 0.4, width: 0.2, height: 0.2 }, "Globe");
    const shape = createMaskSelectionShape({
      bounds: layer.bounds,
      maskUrl: "https://example.com/m.png",
      polygon: refineSelectionPolygonFromBounds(layer.bounds),
    });
    const precise = applyEditorSelectionShape(layer, shape);
    const plan = planEditorSmartReplace({ layer: precise, prompt: "football" });
    assert.equal(plan.constrainedToMask, true);
    assert.equal(plan.ready, true);
  });

  it("smart remove plans inpaint on masked area", () => {
    const layer = mascotLayer("logo", { x: 0.3, y: 0.2, width: 0.2, height: 0.1 }, "Logo");
    const shape = createMaskSelectionShape({
      bounds: layer.bounds,
      maskUrl: "https://example.com/m.png",
    });
    const precise = applyEditorSelectionShape(layer, shape);
    const plan = planEditorSmartRemove(precise);
    assert.equal(plan.inpaintMaskedArea, true);
    assert.equal(plan.preserveSurrounding, true);
  });

  it("text layers extracted from semantic labels", () => {
    const text = mascotLayer("title", { x: 0.2, y: 0.05, width: 0.6, height: 0.1 }, "Headline text");
    text.category = "text";
    text.semanticType = "text";
    assert.equal(isEditorTextLayerCandidate(text), true);
    const layers = extractEditorTextLayers([text]);
    assert.equal(layers.length, 1);
    assert.equal(layers[0]?.content, "Headline text");
  });

  it("motion preparation builds per-object artifacts", () => {
    const layer = mascotLayer("mascot", { x: 0.2, y: 0.1, width: 0.6, height: 0.8 }, "Mascot");
    const objects = buildEditorObjectsFromLayers([layer]);
    const prep = buildEditorMotionPreparations(objects, [layer]);
    assert.equal(prep.length, 1);
    assert.ok(prep[0]!.safeAnimationBounds.width > 0);
  });

  it("segmentation strategy audits providers", () => {
    const strategy = auditEditorSegmentationProviders();
    assert.ok(strategy.providers.length >= 5);
    assert.ok(["heuristic", "rembg", "manual"].includes(strategy.recommended));
    assert.ok(strategy.productionPath.length > 10);
  });

  it("background removal action is tracked in history", () => {
    const doc = createEditorDocumentFromUpload({ name: "T", backgroundUrl: "https://example.com/a.png" });
    const committed = commitEditorHistory(doc, doc, "background_remove", "remove background");
    assert.equal(committed.history?.timeline.at(-1)?.action, "background_remove");
  });
});

/**
 * Editor sub-object segmentation — prompt creates child layers, parent preserved, hit priority.
 * Run: npx tsx --test src/lib/editor-sub-object-segmentation.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMaskSelectionShape } from "@/lib/editor-object-mask";
import { buildEditorObjectsFromLayers } from "@/lib/editor-object-detection";
import {
  createDefaultHierarchicalSelection,
  enterPartSelectionMode,
  pickHierarchicalAtPoint,
} from "@/lib/editor-hierarchical-selection";
import { buildDefaultMascotParts, buildObjectHierarchy } from "@/lib/editor-part-hierarchy";
import { pickTopEditorObjectAtPoint } from "@/lib/editor-object-picking";
import {
  applySegmentToSubObjectLayer,
  attachSubObjectLayer,
  createSubObjectLayer,
  isPromptCreatedSubLayer,
  pickPromptSubObjectAtPoint,
  promptToDisplayLabel,
  segmentPromptSuccessMessageKey,
} from "@/lib/editor-sub-object-layer";
import type { EditorCanvasLayer, EditorShapePoint } from "@/types/homecheff-visual-editor";

function globeManParent(): EditorCanvasLayer {
  return {
    id: "semantic_0_globe_man",
    label: "Globe Man",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "https://example.com/globe-man.jpg",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.22, y: 0.12, width: 0.56, height: 0.78 },
    layerType: "semantic",
    category: "character",
    semanticType: "character",
    children: [],
    metadata: { estimatedBounds: true, approximateSelection: true, selectionMode: "box" },
  };
}

function globeChildMask(parent: EditorCanvasLayer): EditorCanvasLayer {
  const stub = createSubObjectLayer({
    point: { x: 0.5, y: 0.18 },
    prompt: "globe",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: parent.previewUrl,
    parentLayer: parent,
  });
  const globePolygon: EditorShapePoint[] = [
    { x: 0.38, y: 0.14 },
    { x: 0.62, y: 0.14 },
    { x: 0.62, y: 0.38 },
    { x: 0.38, y: 0.38 },
  ];
  return applySegmentToSubObjectLayer(stub, {
    maskUrl: "https://example.com/masks/globe.png",
    boundingBox: { x: 0.38, y: 0.14, width: 0.24, height: 0.24 },
    polygon: globePolygon,
    confidence: 0.92,
    segmentationSource: "replicate_sam3",
    providerUsed: "replicate_sam3",
  });
}

describe("Editor sub-object segmentation", () => {
  it("prompt segmentation creates new sub-layer with mask metadata", () => {
    const parent = globeManParent();
    const child = globeChildMask(parent);
    assert.equal(isPromptCreatedSubLayer(child), true);
    assert.equal(child.parentObjectId, parent.id);
    assert.equal(child.selectionShape?.selectionMode, "mask");
    assert.ok(child.selectionShape?.maskUrl);
    assert.equal(child.label, promptToDisplayLabel("globe"));
    assert.equal(child.metadata?.approximateSelection, false);
  });

  it("parent layer is preserved when attaching child", () => {
    const parent = globeManParent();
    const child = globeChildMask(parent);
    const objects = attachSubObjectLayer([parent], child);
    const updatedParent = objects.find((o) => o.id === parent.id)!;
    assert.equal(updatedParent.label, "Globe Man");
    assert.deepEqual(updatedParent.bounds, parent.bounds);
    assert.ok(updatedParent.children?.includes(child.id));
    assert.notEqual(updatedParent.id, child.id);
  });

  it("child layer becomes top pick over parent bbox at globe point", () => {
    const parent = globeManParent();
    const child = globeChildMask(parent);
    const objects = attachSubObjectLayer([parent], child);
    const detected = buildEditorObjectsFromLayers(objects);
    const point: EditorShapePoint = { x: 0.5, y: 0.22 };
    const hit = pickTopEditorObjectAtPoint(point, detected);
    assert.ok(hit);
    assert.equal(hit.object.layerId, child.id);
    assert.equal(hit.method, "mask");
  });

  it("clicking existing globe mask selects precise Globe child layer", () => {
    const parent = globeManParent();
    const child = globeChildMask(parent);
    const objects = attachSubObjectLayer([parent], child);
    const detected = buildEditorObjectsFromLayers(objects);
    const point: EditorShapePoint = { x: 0.45, y: 0.2 };
    const sub = pickPromptSubObjectAtPoint(point, detected, objects);
    assert.ok(sub);
    assert.equal(sub.layerId, child.id);
  });

  it("template PART_BOUNDS cannot override prompt-selected globe mask in part mode", () => {
    const parent = globeManParent();
    const child = globeChildMask(parent);
    const objects = attachSubObjectLayer([parent], child);
    const detected = buildEditorObjectsFromLayers(objects);
    const root = detected.find((o) => o.layerId === parent.id)!;
    const hierarchy = buildObjectHierarchy(root, parent, [], "mascot");
    const selection = enterPartSelectionMode(
      createDefaultHierarchicalSelection(),
      root.id
    );
    const point: EditorShapePoint = { x: 0.5, y: 0.2 };
    const pick = pickHierarchicalAtPoint(point, detected, { [root.id]: hierarchy }, selection, objects);
    assert.ok(pick);
    assert.equal(pick.rootObject.layerId, child.id);
    assert.equal(pick.part, null);
  });

  it("hit-test prioritizes real mask child over parent bbox at overlapping logo point", () => {
    const parent = globeManParent();
    const logoStub = createSubObjectLayer({
      point: { x: 0.5, y: 0.42 },
      prompt: "logo",
      sourceKind: "upload",
      sourceAssetId: null,
      backgroundUrl: parent.previewUrl,
      parentLayer: parent,
    });
    const logoPolygon: EditorShapePoint[] = [
      { x: 0.44, y: 0.36 },
      { x: 0.56, y: 0.36 },
      { x: 0.56, y: 0.48 },
      { x: 0.44, y: 0.48 },
    ];
    const logoChild = applySegmentToSubObjectLayer(logoStub, {
      maskUrl: "https://example.com/masks/logo.png",
      boundingBox: { x: 0.44, y: 0.36, width: 0.12, height: 0.12 },
      polygon: logoPolygon,
      confidence: 0.9,
      segmentationSource: "replicate_sam3",
    });
    const objects = attachSubObjectLayer([parent], logoChild);
    const detected = buildEditorObjectsFromLayers(objects);
    const point: EditorShapePoint = { x: 0.5, y: 0.42 };
    const hierarchy = buildObjectHierarchy(
      detected.find((o) => o.layerId === parent.id)!,
      parent,
      [],
      "mascot"
    );
    const facePart = hierarchy.parts.find((p) => p.partCategory === "face");
    assert.ok(facePart);
    assert.ok(facePart.estimatedBounds);

    const selection = enterPartSelectionMode(
      createDefaultHierarchicalSelection(),
      detected.find((o) => o.layerId === parent.id)!.id
    );
    const pick = pickHierarchicalAtPoint(
      point,
      detected,
      { [detected.find((o) => o.layerId === parent.id)!.id]: hierarchy },
      selection,
      objects
    );
    assert.equal(pick?.rootObject.layerId, logoChild.id);
  });

  it("segment prompt success message keys resolve per prompt", () => {
    assert.equal(segmentPromptSuccessMessageKey("globe"), "editor.clickSegment.selectedGlobe");
    assert.equal(segmentPromptSuccessMessageKey("logo"), "editor.clickSegment.selectedLogo");
    assert.equal(segmentPromptSuccessMessageKey("tie"), "editor.clickSegment.selectedTie");
  });

  it("missing provider path does not create fake layer — stub stays approximate without mask", () => {
    const parent = globeManParent();
    const stub = createSubObjectLayer({
      point: { x: 0.5, y: 0.2 },
      prompt: "globe",
      sourceKind: "upload",
      sourceAssetId: null,
      backgroundUrl: parent.previewUrl,
      parentLayer: parent,
    });
    assert.equal(stub.selectionShape, undefined);
    assert.equal(stub.metadata?.approximateSelection, true);
    const shape = createMaskSelectionShape({
      bounds: stub.bounds,
      maskUrl: undefined,
      polygon: [],
      confidence: 0,
      segmentationSource: "heuristic",
    });
    assert.equal(shape.maskUrl, undefined);
  });

  it("mascot template parts deprioritize estimated bounds when real category blocked", () => {
    const rootBounds = { x: 0.22, y: 0.12, width: 0.56, height: 0.78 };
    const parts = buildDefaultMascotParts(rootBounds);
    const globePart = parts.find((p) => p.partCategory === "globe");
    const facePart = parts.find((p) => p.partCategory === "face");
    assert.ok(globePart?.estimatedBounds);
    assert.ok(facePart?.estimatedBounds);
    assert.notEqual(globePart!.bbox.y, facePart!.bbox.y);
  });
});

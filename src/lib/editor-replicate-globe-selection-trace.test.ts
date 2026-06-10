/**
 * Trace: Globe Man → Selecteer: globe → Replicate child layer.
 * Run: npx tsx --test src/lib/editor-replicate-globe-selection-trace.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildEditorObjectsFromLayers } from "@/lib/editor-object-detection";
import { boundsCenter } from "@/lib/editor-object-mask";
import { pickTopEditorObjectAtPoint } from "@/lib/editor-object-picking";
import {
  applySegmentToSubObjectLayer,
  attachSubObjectLayer,
  createSubObjectLayer,
  isPromptCreatedSubLayer,
} from "@/lib/editor-sub-object-layer";
import { isTechnicalSubPartLayer } from "@/lib/editor-ux-cleanup";
import { pickSam3MaskIndexAtClick } from "@/server/editor/replicate-sam3-editor-segment";
import type { EditorCanvasLayer, EditorShapePoint } from "@/types/homecheff-visual-editor";

const ROOT = process.cwd();
const GLOBE_CLICK: EditorShapePoint = { x: 0.5, y: 0.18 };

function globeManParent(): EditorCanvasLayer {
  return {
    id: "semantic_0_globe_man",
    label: "Globe Man",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "https://blob.example/globe-man.png",
    transform: { x: 0.5, y: 0.51, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.22, y: 0.12, width: 0.56, height: 0.78 },
    layerType: "semantic",
    category: "character",
    semanticType: "character",
    children: [],
    metadata: { estimatedBounds: true, approximateSelection: true },
  };
}

function buildGlobeSegmentRequestBody(input: {
  backgroundUrl: string;
  sessionId: string;
  point: EditorShapePoint;
  parent: EditorCanvasLayer;
  childId: string;
}) {
  return {
    imageUrl: input.backgroundUrl,
    clickPoint: input.point,
    objectHint: "globe",
    targetBounds: input.parent.bounds,
    editorObjectId: input.childId,
    parentLayerId: input.parent.id,
    sessionId: input.sessionId,
    createCutout: true,
  };
}

function simulateGlobeChildPipeline(parent: EditorCanvasLayer) {
  const stub = createSubObjectLayer({
    point: GLOBE_CLICK,
    prompt: "globe",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: parent.previewUrl,
    parentLayer: parent,
  });
  const child = applySegmentToSubObjectLayer(stub, {
    maskUrl: "https://blob.example/masks/globe.png",
    boundingBox: { x: 0.38, y: 0.14, width: 0.24, height: 0.24 },
    polygon: [
      { x: 0.38, y: 0.14 },
      { x: 0.62, y: 0.14 },
      { x: 0.62, y: 0.38 },
      { x: 0.38, y: 0.38 },
    ],
    confidence: 0.91,
    segmentationSource: "replicate_sam3",
    providerUsed: "replicate_sam3",
  });
  const objects = attachSubObjectLayer([parent], child);
  return { stub, child, objects };
}

describe("Replicate globe selection trace", () => {
  it("globe button flow: EditorClickSegmentPrompt → handleClickSegmentPrompt → runPromptSubLayerSegmentation", () => {
    const prompt = readFileSync(
      join(ROOT, "src/components/editor/editor-click-segment-prompt.tsx"),
      "utf8"
    );
    const workspace = readFileSync(
      join(ROOT, "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(prompt, /onSelectWithPrompt\(prompt\)/);
    assert.match(workspace, /onSelectWithPrompt=\{\(prompt\) => void handleClickSegmentPrompt\(prompt\)\}/);
    assert.match(workspace, /handleClickSegmentPrompt/);
    assert.match(workspace, /runPromptSubLayerSegmentation/);
    assert.match(workspace, /createSubObjectLayer/);
    assert.match(workspace, /applySegmentToSubObjectLayer/);
    assert.match(workspace, /attachSubObjectLayer/);
  });

  it("request payload includes imageUrl, clickPoint, objectHint globe, parent bounds", () => {
    const parent = globeManParent();
    const stub = createSubObjectLayer({
      point: GLOBE_CLICK,
      prompt: "globe",
      sourceKind: "upload",
      sourceAssetId: null,
      backgroundUrl: parent.previewUrl,
      parentLayer: parent,
    });
    const body = buildGlobeSegmentRequestBody({
      backgroundUrl: parent.previewUrl,
      sessionId: "sess-globe",
      point: GLOBE_CLICK,
      parent,
      childId: stub.id,
    });
    assert.equal(body.imageUrl, parent.previewUrl);
    assert.deepEqual(body.clickPoint, GLOBE_CLICK);
    assert.equal(body.objectHint, "globe");
    assert.equal(body.parentLayerId, parent.id);
    assert.deepEqual(body.targetBounds, parent.bounds);
    assert.equal(body.createCutout, true);

    const workspace = readFileSync(
      join(ROOT, "src/components/editor/editor-canvas-workspace.tsx"),
      "utf8"
    );
    assert.match(workspace, /\/api\/editor\/segment\/click/);
    assert.match(workspace, /objectHint: input\.prompt/);
    assert.match(workspace, /clickPoint: input\.point/);
  });

  it("replicate segmentByClick passes clickPoint to SAM3 multimask picker", () => {
    const provider = readFileSync(
      join(ROOT, "src/server/editor/editor-segmentation-provider.ts"),
      "utf8"
    );
    const sam3 = readFileSync(
      join(ROOT, "src/server/editor/replicate-sam3-editor-segment.ts"),
      "utf8"
    );
    assert.match(provider, /clickPoint: input\.clickPoint/);
    assert.match(sam3, /pickSam3MaskIndexAtClick/);
    assert.match(sam3, /clickPoint: params\.clickPoint/);

    const idx = pickSam3MaskIndexAtClick({
      scores: [0.7, 0.95, 0.8],
      boxes: [
        [0.22, 0.12, 0.78, 0.9],
        [0.38, 0.14, 0.62, 0.38],
        [0.44, 0.36, 0.56, 0.48],
      ],
      clickPoint: GLOBE_CLICK,
      imageWidth: 1000,
      imageHeight: 1000,
    });
    assert.equal(idx, 1);
  });

  it("child layer creation: parent preserved, globe mask + polygon, transform centered on tight bbox", () => {
    const parent = globeManParent();
    const { child, objects } = simulateGlobeChildPipeline(parent);
    const updatedParent = objects.find((o) => o.id === parent.id)!;

    assert.equal(child.parentObjectId, parent.id);
    assert.equal(child.label, "Globe");
    assert.equal(isPromptCreatedSubLayer(child), true);
    assert.ok(child.selectionShape?.maskUrl);
    assert.ok((child.selectionShape?.polygon?.length ?? 0) >= 3);
    assert.equal(updatedParent.label, "Globe Man");
    assert.ok(updatedParent.children?.includes(child.id));
    assert.notDeepEqual(child.bounds, parent.bounds);

    const center = boundsCenter(child.bounds);
    assert.equal(child.transform.x, center.x);
    assert.equal(child.transform.y, center.y);
  });

  it("hit test after child: globe click selects child not Globe Man parent", () => {
    const parent = globeManParent();
    const { objects, child } = simulateGlobeChildPipeline(parent);
    const detected = buildEditorObjectsFromLayers(objects);
    const hit = pickTopEditorObjectAtPoint(GLOBE_CLICK, detected);
    assert.ok(hit);
    assert.equal(hit.object.layerId, child.id);
    assert.equal(hit.method, "mask");
  });

  it("overlay: prompt globe child is not hidden from human-first chips", () => {
    const parent = globeManParent();
    const { child } = simulateGlobeChildPipeline(parent);
    assert.equal(isTechnicalSubPartLayer(child), false);

    const preview = readFileSync(
      join(ROOT, "src/components/editor/editor-canvas-preview.tsx"),
      "utf8"
    );
    assert.match(preview, /EditorSelectionOutline/);
    assert.match(preview, /border-emerald-500/);
  });

  it("end-to-end: stub uses click-local bounds not full parent bbox", () => {
    const parent = globeManParent();
    const stub = createSubObjectLayer({
      point: GLOBE_CLICK,
      prompt: "globe",
      sourceKind: "upload",
      sourceAssetId: null,
      backgroundUrl: parent.previewUrl,
      parentLayer: parent,
    });
    assert.ok(stub.bounds.width < parent.bounds.width);
    assert.ok(stub.bounds.height < parent.bounds.height);
    assert.ok(stub.bounds.y < parent.bounds.y + parent.bounds.height);
  });
});

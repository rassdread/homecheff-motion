/**
 * Reproducible hit-test traces for docs/editor-hit-testing-reality-audit.md
 * Run: npx tsx --test src/lib/editor-hit-testing-reality-audit.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBrandSheetSemanticLayers } from "@/lib/editor-brand-sheet-detection";
import { buildEditorObjectsFromLayers } from "@/lib/editor-object-detection";
import { semanticLayerToCanvasLayer } from "@/lib/editor-semantic-layers-from-vision";
import { buildObjectHierarchy, buildDefaultMascotParts } from "@/lib/editor-part-hierarchy";
import {
  pickHierarchicalAtPoint,
  createDefaultHierarchicalSelection,
  enterPartSelectionMode,
} from "@/lib/editor-hierarchical-selection";
import { pickTopEditorObjectAtPoint } from "@/lib/editor-object-picking";
import { isApproximateEditorSelection } from "@/lib/editor-object-mask";
import type { EditorCanvasLayer, EditorShapePoint } from "@/types/homecheff-visual-editor";

type ClickTrace = {
  target: string;
  point: EditorShapePoint;
  winningLayerId: string | null;
  hitMethod: string;
  layerLabel: string | null;
  category: string | null;
  detectionSource: string;
  maskStatus: string;
  approximate: boolean;
  partId: string | null;
};

function brandSheetDocument(): {
  layers: EditorCanvasLayer[];
  objects: ReturnType<typeof buildEditorObjectsFromLayers>;
} {
  const semantic = buildBrandSheetSemanticLayers({ sourceKind: "upload" });
  const layers = semantic.map((s) => semanticLayerToCanvasLayer(s, "upload", "https://example.com/bg.jpg"));
  const objects = buildEditorObjectsFromLayers(layers);
  return { layers, objects };
}

function mascotDocument(): {
  layers: EditorCanvasLayer[];
  objects: ReturnType<typeof buildEditorObjectsFromLayers>;
  rootObjectId: string;
} {
  const layer: EditorCanvasLayer = {
    id: "semantic_0_globe_man",
    label: "Globe Man",
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
    semanticType: "character",
    metadata: { estimatedBounds: true, approximateSelection: true, selectionMode: "box" },
  };
  const bg: EditorCanvasLayer = {
    id: "background",
    label: "Background",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: true,
    visible: true,
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    layerType: "background",
    category: "background",
  };
  const layers = [bg, layer];
  const objects = buildEditorObjectsFromLayers(layers);
  return { layers, objects, rootObjectId: objects[1]!.id };
}

function traceObjectPick(
  target: string,
  point: EditorShapePoint,
  objects: ReturnType<typeof buildEditorObjectsFromLayers>,
  layers: EditorCanvasLayer[],
  detectionSource: string
): ClickTrace {
  const hit = pickTopEditorObjectAtPoint(point, objects);
  const layer = layers.find((l) => l.id === hit?.object.layerId) ?? null;
  return {
    target,
    point,
    winningLayerId: hit?.object.layerId ?? null,
    hitMethod: hit?.method ?? "none",
    layerLabel: layer?.label ?? null,
    category: layer?.category ?? null,
    detectionSource,
    maskStatus: layer?.selectionShape?.maskUrl ? "mask_url" : "none",
    approximate: layer ? isApproximateEditorSelection(layer) : false,
    partId: null,
  };
}

function tracePartPick(
  target: string,
  point: EditorShapePoint,
  objects: ReturnType<typeof buildEditorObjectsFromLayers>,
  rootObjectId: string,
  hierarchy: ReturnType<typeof buildObjectHierarchy>
): ClickTrace {
  const selection = {
    ...enterPartSelectionMode(createDefaultHierarchicalSelection(), rootObjectId),
    selectedPartId: null,
  };
  const hierarchies = { [rootObjectId]: hierarchy };
  const result = pickHierarchicalAtPoint(point, objects, hierarchies, selection);
  const part = result?.part;
  const layer = objects.find((o) => o.id === rootObjectId);
  return {
    target,
    point,
    winningLayerId: result?.rootObject.layerId ?? null,
    hitMethod: part ? "part_bbox" : result ? "object" : "none",
    layerLabel: part?.label ?? layer?.label ?? null,
    category: part?.partCategory ?? layer?.category ?? null,
    detectionSource: "mascot_hierarchy",
    maskStatus: part?.mask ? "part_mask" : "none",
    approximate: true,
    partId: part?.id ?? null,
  };
}

describe("editor hit testing reality audit traces", () => {
  it("brand sheet layout — object-level picks", () => {
    const { layers, objects } = brandSheetDocument();
    const traces: ClickTrace[] = [
      traceObjectPick("globe (on mascot)", { x: 0.74, y: 0.2 }, objects, layers, "brand_sheet"),
      traceObjectPick("logo (top-left)", { x: 0.2, y: 0.12 }, objects, layers, "brand_sheet"),
      traceObjectPick("head (on mascot — no separate layer)", { x: 0.72, y: 0.12 }, objects, layers, "brand_sheet"),
      traceObjectPick("body (mascot torso)", { x: 0.7, y: 0.32 }, objects, layers, "brand_sheet"),
      traceObjectPick("background (empty margin)", { x: 0.98, y: 0.98 }, objects, layers, "brand_sheet"),
    ];

    assert.equal(traces[0]?.winningLayerId, "brand_sheet_1_character");
    assert.equal(traces[1]?.winningLayerId, "brand_sheet_0_logo");
    assert.equal(traces[4]?.winningLayerId, null);

    for (const t of traces) {
      console.info("[hit-test:brand_sheet]", JSON.stringify(t));
    }
  });

  it("single mascot layer — object mode picks whole mascot", () => {
    const { layers, objects } = mascotDocument();
    const traces: ClickTrace[] = [
      traceObjectPick("globe", { x: 0.5, y: 0.2 }, objects, layers, "vision_template"),
      traceObjectPick("head", { x: 0.5, y: 0.18 }, objects, layers, "vision_template"),
      traceObjectPick("logo on chest", { x: 0.5, y: 0.35 }, objects, layers, "vision_template"),
      traceObjectPick("body", { x: 0.5, y: 0.55 }, objects, layers, "vision_template"),
      traceObjectPick("background", { x: 0.05, y: 0.05 }, objects, layers, "vision_template"),
    ];

    for (const t of traces.slice(0, 4)) {
      assert.equal(t.winningLayerId, "semantic_0_globe_man");
      assert.equal(t.hitMethod, "polygon");
      assert.equal(t.approximate, true);
    }
    assert.equal(traces[4]?.winningLayerId, null);

    for (const t of traces) {
      console.info("[hit-test:mascot_object]", JSON.stringify(t));
    }
  });

  it("mascot part mode — template PART_BOUNDS for globe/head/logo", () => {
    const { layers, objects, rootObjectId } = mascotDocument();
    const root = objects.find((o) => o.id === rootObjectId)!;
    const hierarchy = buildObjectHierarchy(root, layers[1]!, [], "character");
    const traces: ClickTrace[] = [
      tracePartPick("globe region (overlaps face)", { x: 0.5, y: 0.24 }, objects, rootObjectId, hierarchy),
      tracePartPick("head (upper)", { x: 0.5, y: 0.18 }, objects, rootObjectId, hierarchy),
      tracePartPick("logo (chest)", { x: 0.5, y: 0.35 }, objects, rootObjectId, hierarchy),
      tracePartPick("body/torso", { x: 0.5, y: 0.5 }, objects, rootObjectId, hierarchy),
    ];

    assert.ok(traces.every((t) => t.winningLayerId === "semantic_0_globe_man"));
    assert.ok(traces[0]?.partId);
    assert.notEqual(traces[0]?.partId, null);

    for (const t of traces) {
      console.info("[hit-test:mascot_part]", JSON.stringify(t));
    }
  });

  it("background excluded from pickTopEditorObjectAtPoint", () => {
    const { objects } = brandSheetDocument();
    const bgOnly = objects.find((o) => o.category === "background");
    assert.ok(bgOnly);
    const hit = pickTopEditorObjectAtPoint({ x: 0.5, y: 0.5 }, objects);
    assert.notEqual(hit?.object.category, "background");
  });
});

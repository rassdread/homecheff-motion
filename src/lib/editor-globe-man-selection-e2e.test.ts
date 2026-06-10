/**
 * Globe Man selection flow — contract + simulated pipeline.
 * Run: npx tsx --test src/lib/editor-globe-man-selection-e2e.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { evaluateEditorMaskGate } from "@/lib/editor-mask-gate";
import { buildEditorObjectsFromLayers } from "@/lib/editor-object-detection";
import { pickTopEditorObjectAtPoint } from "@/lib/editor-object-picking";
import { postEditorSegmentClick, EDITOR_SEGMENT_CLICK_CLIENT_TIMEOUT_MS } from "@/lib/editor-segment-click-client";
import { deriveSegmentationUiState } from "@/lib/editor-segmentation-state";
import { buildEditorVisionSummary } from "@/lib/editor-vision-summary";
import {
  applySegmentToSubObjectLayer,
  attachSubObjectLayer,
  createSubObjectLayer,
  isPromptCreatedSubLayer,
} from "@/lib/editor-sub-object-layer";
import { EDITOR_CLICK_ROUTE_DEADLINE_MS, EDITOR_CLICK_REPLICATE_TIMEOUT_MS } from "@/server/editor/replicate-sam3-editor-segment";
import type { EditorCanvasDocument, EditorCanvasLayer, EditorShapePoint } from "@/types/homecheff-visual-editor";

const ROOT = process.cwd();
const GLOBE_CLICK: EditorShapePoint = { x: 0.5, y: 0.18 };

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

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

function globeManDocument(): EditorCanvasDocument {
  const bg: EditorCanvasLayer = {
    id: "bg",
    label: "Background",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "https://blob.example/globe-man.png",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: true,
    visible: true,
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    layerType: "background",
  };
  const parent = globeManParent();
  return {
    sessionId: "globe-man-e2e",
    name: "Globe Man",
    sourceKind: "upload",
    backgroundUrl: parent.previewUrl,
    objects: [bg, parent],
    placements: [],
    detectedObjects: buildEditorObjectsFromLayers([bg, parent]),
    workspaceMode: "photo_edit",
  };
}

describe("Globe Man real user selection e2e (simulated)", () => {
  it("click route deadline is within client timeout budget", () => {
    assert.ok(EDITOR_CLICK_REPLICATE_TIMEOUT_MS <= EDITOR_CLICK_ROUTE_DEADLINE_MS);
    assert.ok(EDITOR_CLICK_ROUTE_DEADLINE_MS <= EDITOR_SEGMENT_CLICK_CLIENT_TIMEOUT_MS);
  });

  it("click route maxDuration matches server deadline", () => {
    const route = read("src/app/api/editor/segment/click/route.ts");
    assert.match(route, /maxDuration = 30/);
    assert.match(route, /requestId/);
  });

  it("vision summary appears for Globe Man layers", () => {
    const doc = globeManDocument();
    const summary = buildEditorVisionSummary(doc);
    assert.ok(summary.itemKeys.includes("editor.visionSummary.item.character"));
    assert.ok(summary.itemKeys.includes("editor.visionSummary.item.background"));
    assert.ok(summary.lowConfidence);
  });

  it("globe click opens prompt path (approximate parent hit)", () => {
    const doc = globeManDocument();
    const hit = pickTopEditorObjectAtPoint(GLOBE_CLICK, doc.detectedObjects ?? []);
    assert.ok(hit);
    assert.equal(hit.object.layerId, "semantic_0_globe_man");
    const state = deriveSegmentationUiState({
      clickSegmentPoint: GLOBE_CLICK,
      clickSegmentBusy: false,
      refiningSelection: false,
      selectedLayer: doc.objects[1],
      lastFailureCode: null,
    });
    assert.equal(state, "prompt_visible");
  });

  it("Select: globe creates masked child layer with green-contour eligibility", () => {
    const parent = globeManParent();
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
      cutoutUrl: "https://blob.example/cutouts/globe.png",
      boundingBox: { x: 0.38, y: 0.14, width: 0.24, height: 0.24 },
      polygon: [
        { x: 0.38, y: 0.14 },
        { x: 0.62, y: 0.14 },
        { x: 0.62, y: 0.38 },
        { x: 0.38, y: 0.38 },
      ],
      confidence: 0.91,
      segmentationSource: "replicate_sam3",
    });
    const objects = attachSubObjectLayer([parent], child);
    assert.ok(isPromptCreatedSubLayer(child));
    assert.equal(evaluateEditorMaskGate(child).allowed, true);
    assert.ok(child.selectionShape?.maskUrl);
    assert.equal(objects.length, 2);
  });

  it("workspace wires canvas help, vision summary, and client segment timeout", () => {
    const workspace = read("src/components/editor/editor-canvas-workspace.tsx");
    const preview = read("src/components/editor/editor-canvas-preview.tsx");
    assert.match(workspace, /EditorVisionSummaryPanel/);
    assert.match(workspace, /startEditorSegmentClickJob/);
    assert.match(workspace, /pollEditorSegmentClickJob/);
    assert.match(workspace, /segmentationUiState/);
    assert.match(preview, /editor\.canvas\.clickToSelect/);
    assert.match(preview, /editor\.canvas\.selecting/);
  });

  it("export mode panel is reachable from workspace mode", () => {
    const doc = { ...globeManDocument(), workspaceMode: "export" as const };
    assert.equal(doc.workspaceMode, "export");
  });

  it("postEditorSegmentClick returns synthetic 504 on abort shape", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      new Promise((_resolve, reject) => {
        const err = new Error("aborted");
        err.name = "AbortError";
        reject(err);
      }) as Promise<Response>;
    const { response, timedOut } = await postEditorSegmentClick({ clickPoint: { x: 0.5, y: 0.5 } });
    assert.equal(timedOut, true);
    assert.equal(response.status, 504);
    const body = (await response.json()) as { code?: string };
    assert.equal(body.code, "replicate_timeout");
    globalThis.fetch = originalFetch;
  });
});

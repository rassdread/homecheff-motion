/**
 * Canvas click → prompt routing contracts.
 * Run: npx tsx --test src/lib/editor-canvas-click-trace.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { resolveEditorBootstrapVision } from "@/lib/editor-detection-bootstrap";
import { shouldOpenClickSegmentPromptForLayer } from "@/lib/editor-canvas-click-routing";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function approximateLayer(): EditorCanvasLayer {
  return {
    id: "semantic_0",
    label: "Globe Man",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "https://example.com/g.png",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.2, y: 0.1, width: 0.6, height: 0.8 },
    layerType: "semantic",
    metadata: { estimatedBounds: true, approximateSelection: true },
  };
}

describe("editor canvas click trace", () => {
  it("approximate layer without mask should open segment prompt", () => {
    assert.equal(shouldOpenClickSegmentPromptForLayer(approximateLayer()), true);
  });

  it("background layer should not open segment prompt", () => {
    const bg = { ...approximateLayer(), id: "background", layerType: "background" as const };
    assert.equal(shouldOpenClickSegmentPromptForLayer(bg), false);
  });

  it("analyze 503 is non-blocking for bootstrap vision", () => {
    const resolved = resolveEditorBootstrapVision(
      {
        sessionId: "s",
        name: "Globe Man",
        sourceKind: "upload",
        backgroundUrl: "https://example.com/g.png",
        objects: [],
        placements: [],
      },
      { ok: false, status: 503, data: null, networkError: false }
    );
    assert.equal(resolved.visionAnalyzeOk, false);
    assert.ok(resolved.vision.objectType);
  });

  it("workspace opens prompt on visual selectLayer click without precise mask", () => {
    const workspace = read("src/components/editor/editor-canvas-workspace.tsx");
    assert.match(workspace, /shouldOpenClickSegmentPromptForLayer/);
    assert.match(workspace, /selectLayer→openClickSegmentPrompt/);
    assert.match(workspace, /openClickSegmentPrompt\(clickPoint, layer\.id\)/);
  });

  it("canvas preview routes background and selected-layer clicks to prompt", () => {
    const preview = read("src/components/editor/editor-canvas-preview.tsx");
    assert.match(preview, /layer\?\.layerType === "background"/);
    assert.match(preview, /onApproximateLayerClick\(clickPoint, layer\.id\)/);
  });

  it("prompt overlay is mounted on canvas container", () => {
    const workspace = read("src/components/editor/editor-canvas-workspace.tsx");
    assert.match(workspace, /absolute bottom-2 left-2 right-2 z-40/);
    assert.match(workspace, /EditorClickSegmentPrompt/);
    assert.match(workspace, /EditorClickTraceDebugPanel/);
  });

  it("globe prompt handler uses async segment job", () => {
    const workspace = read("src/components/editor/editor-canvas-workspace.tsx");
    assert.match(workspace, /runPromptSubLayerSegmentation/);
    assert.match(workspace, /startEditorSegmentClickJob/);
    assert.match(workspace, /pollEditorSegmentClickJob/);
    assert.match(workspace, /handleClickSegmentPrompt/);
  });
});

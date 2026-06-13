import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { BRAND_SHEET_REGIONS, isBrandSheetLayout } from "@/lib/editor-brand-sheet-detection";
import { documentNeedsDetectionBootstrap } from "@/lib/editor-detection-bootstrap";
import { pickTopEditorObjectAtPoint } from "@/lib/editor-object-picking";
import { buildEditorObjectsFromLayers } from "@/lib/editor-object-detection";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function backgroundOnlyDoc(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess-test",
    name: "homecheff-brand-sheet",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/sheet.png",
    workflowStep: "visual_editor",
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind: "upload",
        assetId: null,
        storageKey: "",
        previewUrl: "https://example.com/sheet.png",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        layerType: "background",
        confidence: 1,
      },
    ],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

describe("editor detection bootstrap fix", () => {
  it("documentNeedsDetectionBootstrap when only background exists", () => {
    assert.equal(documentNeedsDetectionBootstrap(backgroundOnlyDoc()), true);
  });

  it("background bbox does not win canvas picks", () => {
    const objects = buildEditorObjectsFromLayers(backgroundOnlyDoc().objects);
    const hit = pickTopEditorObjectAtPoint({ x: 0.5, y: 0.5 }, objects);
    assert.equal(hit, null);
  });

  it("brand sheet layout detected from filename", () => {
    assert.equal(
      isBrandSheetLayout({ name: "HomeCheff brand sheet 2026", featureCount: 0 }),
      true
    );
  });

  it("brand sheet regions include logo text icon product", () => {
    const labels = BRAND_SHEET_REGIONS.map((r) => r.label);
    assert.ok(labels.includes("Logo"));
    assert.ok(labels.includes("Tekst"));
    assert.ok(labels.includes("Icoon"));
    assert.ok(labels.includes("Product"));
  });

  it("canvas preview wires empty click fallback", () => {
    const preview = readFileSync(
      join(process.cwd(), "src/components/editor/editor-canvas-preview.tsx"),
      "utf8"
    );
    assert.ok(preview.includes("onEmptyCanvasClick"));
  });

  it("detect route uses unified detection client", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/editor/detect/route.ts"),
      "utf8"
    );
    const editorOnnx = readFileSync(
      join(process.cwd(), "src/server/editor/editor-onnx-detection.ts"),
      "utf8"
    );
    assert.ok(editorOnnx.includes("resolveObjectDetections"));
    assert.ok(route.includes("detectEditorObjectsFromImageUrl"));
  });

  it("video worker exposes POST /vision/detect", () => {
    const worker = readFileSync(join(process.cwd(), "worker/video-worker.ts"), "utf8");
    assert.ok(worker.includes('app.post("/vision/detect"'));
    assert.ok(worker.includes("detectObjectsForEditor"));
  });

  it("segment status exposes replicate and auto-mask flags", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/editor/segment/status/route.ts"),
      "utf8"
    );
    assert.ok(route.includes("replicateConfigured"));
    assert.ok(route.includes("autoMaskProviderAvailable"));
  });

  it("bootstrap replaces vision-only early return in canvas session", () => {
    const session = readFileSync(
      join(process.cwd(), "src/lib/editor-canvas-session.ts"),
      "utf8"
    );
    assert.ok(session.includes("bootstrapEditorObjectDetection"));
    assert.ok(!session.includes("if (!res.ok) {\n    return { ...document"));
  });

  it("human object list shows bootstrap region labels", () => {
    const list = readFileSync(
      join(process.cwd(), "src/components/editor/editor-human-object-list.tsx"),
      "utf8"
    );
    assert.ok(list.includes("bootstrapRegion"));
    assert.ok(list.includes("backgroundLayer"));
  });
});

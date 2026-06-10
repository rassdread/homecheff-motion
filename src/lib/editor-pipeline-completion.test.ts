import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import { buildMotionReadyExportBundle } from "@/lib/editor-motion-ready-export";
import { buildPrintReadyExportBundle } from "@/lib/editor-print-export";
import { buildProductionReadyExportBundle } from "@/lib/editor-production-export";
import { resolveEditorMotionBootstrap } from "@/lib/editor-motion-entry";
import { resolveEditorStudioEntry } from "@/lib/editor-studio-entry";
import { buildEditorMergedSemanticRecord } from "@/lib/editor-semantic-record-merge";
import { buildEditorSaveNextActions } from "@/lib/suite-flow-handoffs";
import { attachStudioMotionHandoff } from "@/lib/editor-studio-motion-handoff";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mockDocument(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return attachStudioMotionHandoff({
    sessionId: "pipeline_sess",
    name: "Pipeline",
    sourceKind: "upload",
    sourceAssetId: "asset_1",
    backgroundUrl: "https://example.com/bg.png",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    cutoutAssets: [
      {
        id: "cutout_1",
        objectId: "obj_1",
        layerId: "layer_1",
        label: "Chef",
        cutoutUrl: "https://example.com/cutout.png",
        createdAt: now,
      },
    ],
  });
}

describe("Editor production pipeline completion", () => {
  it("production export bundle includes render targets", () => {
    const bundle = buildProductionReadyExportBundle(mockDocument(), "web_ready");
    assert.equal(bundle.profile, "production_ready");
    assert.ok(bundle.formats.includes("png"));
    assert.equal(bundle.backgroundUrl, "https://example.com/bg.png");
  });

  it("print export bundle targets png and pdf formats", () => {
    const bundle = buildPrintReadyExportBundle(mockDocument());
    assert.equal(bundle.profile, "print_ready");
    assert.ok(bundle.formats.includes("png"));
    assert.ok(bundle.pixelWidth > 0);
  });

  it("motion-ready bundle includes cutouts and handoff metadata", () => {
    const bundle = buildMotionReadyExportBundle(mockDocument());
    assert.equal(bundle.profile, "motion_ready");
    assert.ok(bundle.cutouts.length > 0);
    assert.ok(bundle.handoff.cutoutAssets.length > 0);
  });

  it("semantic record merge persists editor studio handoff", () => {
    const document = mockDocument();
    const payload = buildEditorSavePayload(document);
    const record = buildEditorMergedSemanticRecord({
      payload,
      mode: "cutout",
      sourceKind: document.sourceKind,
    });
    assert.equal(record.createdInEditor, true);
    assert.ok(record.editorStudioHandoff);
  });

  it("suite handoff links include editor session for studio and motion", () => {
    const actions = buildEditorSaveNextActions({ sessionId: "sess-1", assetId: "asset-1" });
    const studio = actions.find((action) => action.id === "use-studio");
    const motion = actions.find((action) => action.id === "animate-motion");
    assert.ok(studio?.href.includes("editorSession=sess-1"));
    assert.ok(motion?.href.includes("editorAsset=asset-1"));
  });

  it("motion bootstrap resolves editor asset image url", () => {
    const bootstrap = resolveEditorMotionBootstrap({
      editorAsset: "asset-1",
      assetImageUrl: "https://example.com/editor-asset.png",
    });
    assert.equal(bootstrap?.source, "editor_asset");
    assert.equal(bootstrap?.imageUrl, "https://example.com/editor-asset.png");
  });

  it("studio entry is null when session document is unavailable", () => {
    assert.equal(resolveEditorStudioEntry("does-not-exist"), null);
  });

  it("cutout save payload uses cutout url as background", () => {
    const document = mockDocument();
    const payload = {
      ...buildEditorSavePayload(document),
      backgroundUrl: "https://example.com/cutout.png",
      name: `${document.name} — cutout`,
    };
    assert.equal(payload.backgroundUrl, "https://example.com/cutout.png");
    assert.ok(payload.studioMotionHandoff);
  });
});

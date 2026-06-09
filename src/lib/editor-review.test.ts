import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorReviewSummary, editorReviewStepReady } from "@/lib/editor-review";
import {
  persistEditorSaveLocalFallback,
  resolveEditorSaveMode,
} from "@/lib/editor-library-persist";
import { createEditorDocumentFromUpload, saveEditorCanvasDocument } from "@/lib/editor-canvas-session";
import { resolveBodyDesignerPreset } from "@/lib/editor-body-designer";

describe("editor-review phase 5", () => {
  it("builds review summary with scores and body profile", () => {
    const doc = saveEditorCanvasDocument({
      ...createEditorDocumentFromUpload({ name: "Mascot", backgroundUrl: "https://example.com/bg.png" }),
      sourceKind: "character",
      bodyDesigner: resolveBodyDesignerPreset("mascot"),
    });
    const summary = buildEditorReviewSummary(doc);
    assert.ok(summary.identityScore >= 0);
    assert.ok(summary.placementScore >= 0);
    assert.ok(summary.bodyDesignerSummary);
    assert.ok(summary.payload.bodyDesignerProfile);
  });

  it("review step is ready during editing", () => {
    const doc = createEditorDocumentFromUpload({ name: "X", backgroundUrl: "https://example.com/x.png" });
    assert.equal(editorReviewStepReady(doc), true);
  });

  it("canonical base uses correct save mode", () => {
    const doc = { ...createEditorDocumentFromUpload({ name: "Base", backgroundUrl: "https://example.com/b.png" }), sourceKind: "canonical" as const };
    assert.equal(resolveEditorSaveMode(doc, "canonical"), "canonical_base");
    assert.equal(buildEditorReviewSummary(doc).saveDestination, "canonical_base");
  });

  it("edited copy mode preserves source asset id", () => {
    const doc = saveEditorCanvasDocument({
      ...createEditorDocumentFromUpload({ name: "Edit", backgroundUrl: "https://example.com/e.png" }),
      sourceAssetId: "asset-original-1",
    });
    const summary = buildEditorReviewSummary(doc);
    assert.equal(resolveEditorSaveMode(doc, "edited_copy"), "edited_copy");
    const result = persistEditorSaveLocalFallback(summary.payload, "edited_copy");
    assert.equal(result.mode, "edited_copy");
    assert.equal(result.assetId, "asset-original-1");
    assert.equal(result.ok, true);
  });

  it("save payload includes placement and body data", () => {
    const doc = saveEditorCanvasDocument({
      ...createEditorDocumentFromUpload({ name: "Full", backgroundUrl: "https://example.com/f.png" }),
      bodyDesigner: resolveBodyDesignerPreset("hero"),
    });
    const { payload } = buildEditorReviewSummary(doc);
    assert.ok(payload.compositionGraph);
    assert.match(payload.bodyDesignerPromptBlock, /hero|Character/i);
  });
});

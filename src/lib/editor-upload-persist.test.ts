import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  createEditorDocumentFromUpload,
  saveEditorCanvasDocumentWithStatus,
  __resetEditorCanvasSessionsForTests,
} from "@/lib/editor-canvas-session";
import { persistEditorWizardDocument } from "@/lib/editor-upload-persist";
import {
  formatEditorUploadFailureUiMessage,
  resetEditorUploadFlowTraceForTests,
} from "@/lib/editor-upload-flow-trace";

describe("editor upload persist", () => {
  it("persists wizard document on full tier", () => {
    __resetEditorCanvasSessionsForTests();
    const doc = createEditorDocumentFromUpload({
      name: "test.jpg",
      backgroundUrl: "https://example.com/test.jpg",
    });
    const result = persistEditorWizardDocument(doc);
    assert.equal(result.persisted, true);
    assert.equal(result.attempts[0]?.tier, "full");
  });

  it("allows storageWarning quota_exceeded when persisted is true", () => {
    __resetEditorCanvasSessionsForTests();
    const doc = createEditorDocumentFromUpload({
      name: "test.jpg",
      backgroundUrl: "https://example.com/test.jpg",
    });
    const save = saveEditorCanvasDocumentWithStatus(doc);
    assert.equal(save.persisted, true);
    if (save.storageWarning === "quota_exceeded") {
      assert.ok(save.persisted);
    }
  });
});

describe("finishOpen wizard open policy", () => {
  it("opens editor via onOpenDocument even when localStorage fails", () => {
    const start = readFileSync(
      join(process.cwd(), "src/components/editor/editor-start-screen.tsx"),
      "utf8"
    );
    assert.match(start, /persistEditorWizardDocument/);
    assert.match(start, /onOpenDocument\(persistResult\.document\)/);
    assert.doesNotMatch(start, /if \(!saveResult\.persisted\)[\s\S]*return;/);
    assert.doesNotMatch(start, /if \(saveResult\.storageWarning\)/);
  });

  it("formats dev failure messages with step and reason", () => {
    resetEditorUploadFlowTraceForTests();
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const message = formatEditorUploadFailureUiMessage({
        failureStep: "documentSaved",
        failureMessage: "localStorage_write_failed_all_tiers",
        productionMessage: "Upload mislukt.",
      });
      assert.match(message, /documentSaved/);
      assert.match(message, /localStorage_write_failed_all_tiers/);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

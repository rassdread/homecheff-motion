import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  createEditorDocumentFromUpload,
  saveEditorCanvasDocumentWithStatus,
  __resetEditorCanvasSessionsForTests,
} from "@/lib/editor-canvas-session";
import {
  getLastEditorUploadFlowTrace,
  resetEditorUploadFlowTraceForTests,
  traceEditorUploadFailure,
  traceEditorUploadFlow,
} from "@/lib/editor-upload-flow-trace";

describe("editor upload flow trace", () => {
  it("records failure step and message", () => {
    resetEditorUploadFlowTraceForTests();
    traceEditorUploadFlow({ uploadStarted: true, uploadCompleted: true });
    traceEditorUploadFailure({
      step: "documentSaved",
      source: "editor-start-screen.finishOpen",
      error: new Error("localStorage_quota_exceeded_after_slim_retry"),
    });
    const trace = getLastEditorUploadFlowTrace();
    assert.equal(trace?.failureStep, "documentSaved");
    assert.equal(trace?.failureSource, "editor-start-screen.finishOpen");
    assert.match(trace?.failureMessage ?? "", /quota_exceeded/);
  });
});

describe("editor canvas save persisted flag", () => {
  it("marks persisted true after successful localStorage write", () => {
    __resetEditorCanvasSessionsForTests();
    const doc = createEditorDocumentFromUpload({
      name: "test.jpg",
      backgroundUrl: "https://example.com/test.jpg",
    });
    const result = saveEditorCanvasDocumentWithStatus(doc);
    assert.equal(result.persisted, true);
  });
});

describe("finishOpen save gate", () => {
  it("uses tiered wizard persist and memory-open fallback", () => {
    const start = readFileSync(
      join(process.cwd(), "src/components/editor/editor-start-screen.tsx"),
      "utf8"
    );
    assert.match(start, /persistEditorWizardDocument/);
    assert.match(start, /logEditorUploadFailed/);
  });
});

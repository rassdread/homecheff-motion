import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEditorSessionHydrationDiagnostic,
  resetEditorSessionHydrationDiagnosticForTests,
} from "@/lib/editor-session-hydration-debug";
import {
  createEditorDocumentFromUpload,
  saveEditorCanvasDocument,
  __resetEditorCanvasSessionsForTests,
} from "@/lib/editor-canvas-session";

describe("editor session hydration debug", () => {
  it("records missing local document on failed hydration", () => {
    __resetEditorCanvasSessionsForTests();
    resetEditorSessionHydrationDiagnosticForTests();

    const diagnostic = buildEditorSessionHydrationDiagnostic({
      sessionId: "missing-session",
      storageReady: true,
      hydrationState: "not_found",
      failureReason: "local_document_missing",
      userId: "user-1",
    });

    assert.equal(diagnostic.existsSession, true);
    assert.equal(diagnostic.existsDocument, false);
    assert.equal(diagnostic.failureReason, "local_document_missing");
    assert.equal(diagnostic.userId, "user-1");
  });

  it("reports analysis tier from stored document", () => {
    __resetEditorCanvasSessionsForTests();
    const doc = createEditorDocumentFromUpload({
      name: "portrait",
      backgroundUrl: "https://example.com/p.jpg",
    });
    const saved = saveEditorCanvasDocument({
      ...doc,
      visionV6Meta: {
        illustrationAnalysis: true,
        rtdetrCount: 1,
        visionPartCount: 2,
        mergedLayerCount: 2,
        openAiPartsUsed: false,
        layerSources: [],
        analysisTier: "basic",
      },
    });

    const diagnostic = buildEditorSessionHydrationDiagnostic({
      sessionId: saved.sessionId,
      storageReady: true,
      hydrationState: "ready",
    });

    assert.equal(diagnostic.existsDocument, true);
    assert.equal(diagnostic.analysisTier, "basic");
    assert.equal(diagnostic.documentId, saved.sessionId);
  });
});

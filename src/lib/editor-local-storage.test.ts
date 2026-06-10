import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  EDITOR_CANVAS_SESSIONS_KEY,
  pruneEditorSessionStore,
  stripDocumentForStorage,
} from "@/lib/editor-local-storage";

describe("editor local storage", () => {
  it("strips maskData from persisted layers", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Test",
      backgroundUrl: "https://example.com/bg.png",
    });
    doc.objects.push({
      id: "layer-1",
      label: "Globe",
      sourceKind: "upload",
      assetId: null,
      storageKey: "",
      previewUrl: "https://example.com/bg.png",
      transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
      locked: false,
      visible: true,
      bounds: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
      layerType: "semantic",
      selectionShape: {
        selectionMode: "mask",
        boundingBox: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
        maskUrl: "https://example.com/mask.png",
        maskData: "data:image/png;base64,AAAA",
      },
    });
    const stripped = stripDocumentForStorage(doc);
    assert.equal(stripped.objects[1]?.selectionShape?.maskData, undefined);
    assert.equal(stripped.objects[1]?.selectionShape?.maskUrl, "https://example.com/mask.png");
  });

  it("prunes old sessions and keeps active session", () => {
    const now = new Date().toISOString();
    const store: Record<string, ReturnType<typeof createEditorDocumentFromUpload>> = {};
    for (let i = 0; i < 8; i += 1) {
      const doc = createEditorDocumentFromUpload({
        name: `S${i}`,
        backgroundUrl: "https://example.com/bg.png",
      });
      doc.sessionId = `session-${i}`;
      doc.updatedAt = new Date(Date.now() - i * 1000).toISOString();
      store[doc.sessionId] = doc;
    }
    const pruned = pruneEditorSessionStore(store, "session-7");
    assert.ok(Object.keys(pruned).length <= 5);
    assert.ok("session-7" in pruned);
  });

  it("uses canonical localStorage key", () => {
    assert.equal(EDITOR_CANVAS_SESSIONS_KEY, "hc-editor-canvas-sessions-v1");
  });
});

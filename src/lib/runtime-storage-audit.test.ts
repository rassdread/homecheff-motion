import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  auditLocalStorageKeys,
  buildRuntimeStorageWarnings,
  byteSizeOfJson,
  byteSizeOfString,
  measureEditorDocuments,
  RUNTIME_STORAGE_WARN_DOCUMENT_BYTES,
  RUNTIME_STORAGE_WARN_KEY_BYTES,
  RUNTIME_STORAGE_WARN_TOTAL_LOCAL_BYTES,
  RUNTIME_STORAGE_TOP_KEYS,
} from "@/lib/runtime-storage-audit";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mockDocument(partial: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  return {
    sessionId: "session-1",
    name: "Test",
    sourceKind: "upload",
    backgroundUrl: "https://example.com/bg.png",
    objects: [],
    placements: [],
    semanticLayers: [{ id: "sl1", label: "Face", type: "face", confidence: 0.9 }],
    detectedObjects: [],
    status: "ready",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    visionHierarchy: [{ id: "vh1", label: "Detected", category: "objects", editable: false, children: [] }],
    ...partial,
  };
}

describe("runtime storage audit", () => {
  it("byteSizeOfString uses UTF-8 encoding length", () => {
    assert.ok(byteSizeOfString("hello") > 0);
    assert.ok(byteSizeOfString("é") > byteSizeOfString("e"));
  });

  it("auditLocalStorageKeys ranks largest keys and totals bytes", () => {
    const storage = {
      length: 3,
      key: (index: number) => ["small", "medium", "large"][index] ?? null,
      getItem: (key: string) => {
        if (key === "large") return "x".repeat(10_000);
        if (key === "medium") return "y".repeat(1_000);
        return "z";
      },
    } as Storage;

    const result = auditLocalStorageKeys(storage, 1_000_000);
    assert.equal(result.rows[0]?.key, "large");
    assert.ok(result.totalBytes > 10_000);
    assert.equal(result.rows.length, 3);
    assert.ok((result.rows[0]?.quotaPercent ?? 0) > 0);
  });

  it("returns top 20 keys slice for reporting", () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({
      key: `key_${index}`,
      bytes: 1000 - index,
      sizeKb: (1000 - index) / 1024,
      quotaPercent: null,
    }));
    const top = rows.slice(0, RUNTIME_STORAGE_TOP_KEYS);
    assert.equal(top.length, 20);
  });

  it("measureEditorDocuments averages document, vision, and semantic sizes", () => {
    const store = {
      a: mockDocument({ sessionId: "a", semanticLayers: [{ id: "1", label: "A", type: "face", confidence: 1 }] }),
      b: mockDocument({
        sessionId: "b",
        visionHierarchy: [
          { id: "v1", label: "Detected", category: "objects", editable: false, children: [] },
          { id: "v2", label: "Estimated", category: "objects", editable: false, children: [] },
        ],
      }),
    };

    const measured = measureEditorDocuments(store);
    assert.equal(measured.documentCount, 2);
    assert.ok(measured.averageDocumentBytes > 0);
    assert.ok(measured.averageVisionHierarchyBytes > 0);
    assert.ok(measured.averageSemanticLayersBytes > 0);
    assert.ok(measured.largestDocumentBytes >= measured.averageDocumentBytes);
  });

  it("buildRuntimeStorageWarnings flags key, document, and total thresholds", () => {
    const warnings = buildRuntimeStorageWarnings({
      localStorageTotalBytes: RUNTIME_STORAGE_WARN_TOTAL_LOCAL_BYTES + 1,
      topKeys: [
        {
          key: "hc-big",
          bytes: RUNTIME_STORAGE_WARN_KEY_BYTES + 100,
          sizeKb: (RUNTIME_STORAGE_WARN_KEY_BYTES + 100) / 1024,
          quotaPercent: 1,
        },
      ],
      documentSizes: [{ sessionId: "doc-1", bytes: RUNTIME_STORAGE_WARN_DOCUMENT_BYTES + 500 }],
    });

    assert.ok(warnings.some((w) => w.code === "large_total_local"));
    assert.ok(warnings.some((w) => w.code === "large_key" && w.key === "hc-big"));
    assert.ok(warnings.some((w) => w.code === "large_document" && w.sessionId === "doc-1"));
  });

  it("byteSizeOfJson handles nested editor payloads", () => {
    const doc = mockDocument();
    assert.equal(byteSizeOfJson(doc), byteSizeOfString(JSON.stringify(doc)));
  });
});

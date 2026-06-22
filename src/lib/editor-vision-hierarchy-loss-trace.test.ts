import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  getVisionHierarchyRegressionTraceRows,
  resetVisionHierarchyRegressionTrace,
  traceVisionHierarchyRegression,
} from "@/lib/editor-vision-hierarchy-loss-trace";
import type { EditorCanvasDocument, EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

function leaf(id: string): EditorVisionHierarchyNode {
  return { id, label: id, category: "objects", editable: false, children: [] };
}

function branch(id: string, children: EditorVisionHierarchyNode[]): EditorVisionHierarchyNode {
  return { id, label: id, category: "objects", editable: false, children };
}

function docWithHierarchy(nodes: EditorVisionHierarchyNode[], sessionId = "sess_trace"): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId,
    name: "trace.png",
    sourceKind: "character",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/trace.png",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    visionHierarchy: nodes,
  };
}

describe("editor-vision-hierarchy-loss-trace", () => {
  beforeEach(() => {
    resetVisionHierarchyRegressionTrace("sess_trace");
  });

  it("records source order and node counts", () => {
    traceVisionHierarchyRegression("provisional", {
      document: docWithHierarchy([branch("root", [leaf("a"), leaf("b")])]),
    });
    traceVisionHierarchyRegression("vision_parts", {
      document: docWithHierarchy([
        branch("root", [leaf("a"), leaf("b"), leaf("c"), leaf("d")]),
      ]),
    });

    const rows = getVisionHierarchyRegressionTraceRows();
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.source, "provisional");
    assert.equal(rows[0]?.hierarchyNodes, 3);
    assert.equal(rows[1]?.source, "vision_parts");
    assert.equal(rows[1]?.hierarchyNodes, 5);
  });

  it("uses displayHierarchy count when provided", () => {
    const document = docWithHierarchy([branch("root", [leaf("a")])]);
    const displayHierarchy = [branch("display", [leaf("x"), leaf("y"), leaf("z")])];

    traceVisionHierarchyRegression("render", { document, displayHierarchy });

    const row = getVisionHierarchyRegressionTraceRows()[0];
    assert.equal(row?.hierarchyNodes, 2);
    assert.equal(row?.displayHierarchyNodes, 4);
  });

  it("resets trace when sessionId changes", () => {
    traceVisionHierarchyRegression("provisional", {
      document: docWithHierarchy([leaf("a")], "sess_a"),
    });
    traceVisionHierarchyRegression("provisional", {
      document: docWithHierarchy([leaf("b"), leaf("c")], "sess_b"),
    });

    const rows = getVisionHierarchyRegressionTraceRows();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.sessionId, "sess_b");
    assert.equal(rows[0]?.hierarchyNodes, 2);
  });
});

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { EditorCanvasDocument, EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";
import {
  computeVisionPartsLossMetrics,
  getVisionPartsLossTraceRows,
  isVisionPartsLossTracingStopped,
  markVisionPartsPipelineStarted,
  resetVisionPartsLossTrace,
  traceVisionPartsLossStage,
} from "@/lib/editor-vision-parts-loss-trace";

function part(key: string, label: string): IllustrationPartSpec {
  return { key, label, category: "character", group: "body" };
}

function leaf(id: string, label = id): EditorVisionHierarchyNode {
  return { id, label, category: "objects", editable: false, children: [] };
}

function branch(
  id: string,
  children: EditorVisionHierarchyNode[],
  label = id
): EditorVisionHierarchyNode {
  return { id, label, category: "objects", editable: false, children };
}

function docWithHierarchy(
  nodes: EditorVisionHierarchyNode[],
  sessionId = "sess_parts_loss"
): EditorCanvasDocument {
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
    visionV6Meta: { visionPartCount: 3, illustrationAnalysis: true },
  };
}

describe("editor-vision-parts-loss-trace", () => {
  beforeEach(() => {
    resetVisionPartsLossTrace("sess_parts_loss");
  });

  it("counts part and category metrics from API parts", () => {
    const metrics = computeVisionPartsLossMetrics({
      parts: [
        part("head", "Head"),
        part("eyes", "Eyes"),
        part("mouth", "Mouth"),
        part("hair", "Hair"),
        part("shirt", "Shirt"),
        part("glasses", "Sunglasses"),
      ],
    });

    assert.equal(metrics.partCount, 6);
    assert.equal(metrics.eyesCount, 1);
    assert.equal(metrics.mouthCount, 1);
    assert.equal(metrics.hairCount, 1);
    assert.equal(metrics.clothingCount, 1);
    assert.equal(metrics.accessoryCount, 1);
  });

  it("records pipeline stages after vision_parts_api starts", () => {
    markVisionPartsPipelineStarted("sess_parts_loss", { trigger: "manual-reanalyze" });

    traceVisionPartsLossStage("vision_parts_api_raw", {
      sessionId: "sess_parts_loss",
      parts: [part("head", "Head"), part("eyes", "Eyes"), part("mouth", "Mouth")],
    });
    traceVisionPartsLossStage("vision_parts_merged_document", {
      sessionId: "sess_parts_loss",
      document: docWithHierarchy([
        branch("character", [
          branch("body", [leaf("head", "Head"), leaf("eyes", "Eyes"), leaf("mouth", "Mouth")]),
        ]),
      ]),
    });

    const rows = getVisionPartsLossTraceRows();
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.trigger, "manual-reanalyze");
    assert.equal(rows[0]?.stage, "vision_parts_api_raw");
    assert.equal(rows[0]?.metrics.partCount, 3);
    assert.equal(rows[1]?.stage, "vision_parts_merged_document");
    assert.equal(rows[1]?.metrics.nodeCount, 5);
    assert.equal(isVisionPartsLossTracingStopped(), false);
  });

  it("does not stop tracing when raw API parts have zero hierarchy nodes", () => {
    markVisionPartsPipelineStarted("sess_parts_loss");

    traceVisionPartsLossStage("vision_parts_merged_document", {
      sessionId: "sess_parts_loss",
      document: docWithHierarchy([
        branch("character", [
          branch("body", [leaf("head", "Head"), leaf("eyes", "Eyes")]),
        ]),
      ]),
    });
    traceVisionPartsLossStage("vision_parts_api_raw", {
      sessionId: "sess_parts_loss",
      parts: [
        part("head", "Head"),
        part("eyes", "Eyes"),
        part("mouth", "Mouth"),
        part("shirt", "Shirt"),
        part("glasses", "Sunglasses"),
      ],
    });

    const rows = getVisionPartsLossTraceRows();
    assert.equal(rows.length, 2);
    assert.equal(rows[1]?.regression, false);
    assert.equal(isVisionPartsLossTracingStopped(), false);
  });

  it("stops tracing when eyes or clothing counts regress", () => {
    markVisionPartsPipelineStarted("sess_parts_loss");

    traceVisionPartsLossStage("vision_parts_api_raw", {
      sessionId: "sess_parts_loss",
      parts: [
        part("head", "Head"),
        part("eyes", "Eyes"),
        part("mouth", "Mouth"),
        part("shirt", "Shirt"),
        part("glasses", "Sunglasses"),
      ],
    });
    traceVisionPartsLossStage("vision_parts_after_style_dna", {
      sessionId: "sess_parts_loss",
      document: docWithHierarchy([
        branch("character", [branch("body", [leaf("head", "Head")])]),
      ]),
    });

    const rows = getVisionPartsLossTraceRows();
    assert.equal(rows.length, 2);
    assert.equal(rows[1]?.regression, true);
    assert.equal(rows[1]?.stopped, true);
    assert.equal(isVisionPartsLossTracingStopped(), true);
  });

  it("ignores stages before pipeline start except raw", () => {
    const ignored = traceVisionPartsLossStage("vision_parts_merged_document", {
      sessionId: "sess_parts_loss",
      document: docWithHierarchy([leaf("head")]),
    });
    assert.equal(ignored, null);
    assert.equal(getVisionPartsLossTraceRows().length, 0);
  });

  it("logs rendered hierarchy only once per pipeline", () => {
    markVisionPartsPipelineStarted("sess_parts_loss");
    traceVisionPartsLossStage("vision_parts_api_raw", {
      sessionId: "sess_parts_loss",
      parts: [part("head", "Head"), part("eyes", "Eyes")],
    });

    const hierarchy = [branch("character", [branch("body", [leaf("head"), leaf("eyes")])])];
    traceVisionPartsLossStage("vision_parts_rendered", {
      sessionId: "sess_parts_loss",
      document: docWithHierarchy(hierarchy),
      hierarchy,
    });
    traceVisionPartsLossStage("vision_parts_rendered", {
      sessionId: "sess_parts_loss",
      document: docWithHierarchy(hierarchy),
      hierarchy,
    });

    assert.equal(getVisionPartsLossTraceRows().filter((row) => row.stage === "vision_parts_rendered").length, 1);
  });
});

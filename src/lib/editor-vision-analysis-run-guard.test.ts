import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEditorAnalysisId, stampEditorAnalysisIsolationScope } from "@/lib/editor-project-isolation";
import {
  ensureEditorAnalysisIsolationScope,
  resetPendingAnalysisIdRegistryForTests,
} from "@/lib/editor-project-isolation";
import {
  executeEditorVisionAnalysisRun,
  getDuplicateRunCountForTests,
  getInFlightAssetRunCountForTests,
  resetEditorVisionAnalysisRunStateForTests,
} from "@/lib/editor-vision-analysis-run";
import {
  editorVisionAssetRunKey,
  getVisionAnalysisRunStartLogsForTests,
  getVisionDocumentWriteLogsForTests,
  guardVisionDocumentWrite,
  resetVisionAnalysisRunGuardForTests,
} from "@/lib/editor-vision-analysis-run-guard";
import { countVisionHierarchyNodes, visionDocumentRichnessScore } from "@/lib/editor-vision-v6-stability";
import type { EditorCanvasDocument, EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

function baseDocument(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess-guard",
    name: "Portrait.jpg",
    sourceKind: "upload",
    sourceAssetId: "asset-guard",
    backgroundUrl: "https://example.com/portrait.jpg",
    workflowStep: "object_detection",
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind: "upload",
        assetId: "asset-guard",
        storageKey: "",
        previewUrl: "https://example.com/portrait.jpg",
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

function richHierarchy(): EditorVisionHierarchyNode[] {
  return [
    {
      id: "detected",
      label: "Detected",
      truthSection: "detected",
      children: [
        {
          id: "person",
          label: "Personage",
          children: [
            {
              id: "face",
              label: "Face",
              children: [
                { id: "eyes", label: "Eyes", children: [] },
                { id: "sunglasses", label: "Sunglasses", children: [] },
              ],
            },
            { id: "clothing", label: "Clothing", children: [] },
          ],
        },
      ],
    },
  ];
}

function weakHierarchy(): EditorVisionHierarchyNode[] {
  return [
    {
      id: "detected",
      label: "Detected",
      truthSection: "detected",
      children: [
        {
          id: "person",
          label: "Personage",
          children: [{ id: "body", label: "Lichaam", children: [] }],
        },
      ],
    },
  ];
}

describe("editor-vision-analysis-run-guard", () => {
  it("guardVisionDocumentWrite keeps richer hierarchy and marks weaker_duplicate_ignored", () => {
    resetVisionAnalysisRunGuardForTests();
    const current = {
      ...baseDocument(),
      visionHierarchy: richHierarchy(),
    };
    const incoming = {
      ...baseDocument(),
      visionHierarchy: weakHierarchy(),
    };
    const beforeScore = visionDocumentRichnessScore(current);
    const result = guardVisionDocumentWrite("onDocumentChange", current, incoming);
    assert.equal(result.keptPrevious, true);
    assert.equal(result.reason, "weaker_duplicate_ignored");
    assert.equal(countVisionHierarchyNodes(result.document.visionHierarchy), 6);
    assert.ok(visionDocumentRichnessScore(result.document) >= beforeScore);
    const writes = getVisionDocumentWriteLogsForTests();
    assert.equal(writes.at(-1)?.reason, "weaker_duplicate_ignored");
  });

  it("guardVisionDocumentWrite allows force overwrite of richer hierarchy", () => {
    resetVisionAnalysisRunGuardForTests();
    const current = { ...baseDocument(), visionHierarchy: richHierarchy() };
    const incoming = { ...baseDocument(), visionHierarchy: weakHierarchy() };
    const result = guardVisionDocumentWrite("onDocumentChange", current, incoming, { force: true });
    assert.equal(result.keptPrevious, false);
    assert.equal(countVisionHierarchyNodes(result.document.visionHierarchy), 3);
  });
});

describe("editor-vision-analysis-run asset dedupe", () => {
  it("joins duplicate asset run and logs DUPLICATE_RUN_JOINED", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    resetPendingAnalysisIdRegistryForTests();
    const doc = stampEditorAnalysisIsolationScope(baseDocument(), createEditorAnalysisId());
    let runnerCalls = 0;

    const runner = async () => {
      runnerCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { ...doc, visionHierarchy: richHierarchy() };
    };

    const first = executeEditorVisionAnalysisRun(doc, runner, { trigger: "auto-start" });
    const second = executeEditorVisionAnalysisRun(doc, runner, { trigger: "workspace-mount" });
    await Promise.all([first, second]);

    assert.equal(runnerCalls, 1);
    assert.ok(getDuplicateRunCountForTests() >= 1);
    const starts = getVisionAnalysisRunStartLogsForTests();
    assert.ok(starts.some((row) => row.joinedExisting));
    assert.equal(getInFlightAssetRunCountForTests(), 0);
  });

  it("force re-analyze starts a new pipeline run", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    resetPendingAnalysisIdRegistryForTests();
    const doc = stampEditorAnalysisIsolationScope(baseDocument(), createEditorAnalysisId());
    let runnerCalls = 0;

    const runner = async () => {
      runnerCalls += 1;
      return { ...doc, visionHierarchy: weakHierarchy() };
    };

    await executeEditorVisionAnalysisRun(doc, runner, { trigger: "auto-start" });
    const forcedDoc = stampEditorAnalysisIsolationScope(baseDocument(), createEditorAnalysisId());
    await executeEditorVisionAnalysisRun(forcedDoc, runner, {
      trigger: "manual-reanalyze",
      force: true,
    });

    assert.equal(runnerCalls, 2);
  });

  it("ensureEditorAnalysisIsolationScope returns same analysisId for concurrent stamps", () => {
    resetPendingAnalysisIdRegistryForTests();
    const doc = baseDocument();
    const first = ensureEditorAnalysisIsolationScope(doc);
    const second = ensureEditorAnalysisIsolationScope(doc);
    assert.equal(first.isolationScope?.analysisId, second.isolationScope?.analysisId);
    assert.ok(first.isolationScope?.analysisId);
  });

  it("editorVisionAssetRunKey is stable for same asset and background", () => {
    const doc = stampEditorAnalysisIsolationScope(baseDocument(), createEditorAnalysisId());
    const other = stampEditorAnalysisIsolationScope(baseDocument(), createEditorAnalysisId());
    assert.equal(editorVisionAssetRunKey(doc), editorVisionAssetRunKey(other));
  });
});

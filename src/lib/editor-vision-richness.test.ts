import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chooseRicherVisionDocument,
  compareVisionDocumentRichness,
  countVisionHierarchyNodes,
  visionDocumentRichnessScore,
} from "@/lib/editor-vision-v6-stability";
import {
  editorVisionAnalysisRunKey,
  prepareEditorVisionAnalysisRun,
} from "@/lib/editor-vision-analysis-run";
import { resolveEditorVisionAnalysisProgress } from "@/lib/editor-vision-analysis-progress";
import { ensureEditorAnalysisIsolationScope } from "@/lib/editor-project-isolation";
import type {
  EditorCanvasDocument,
  EditorVisionHierarchyNode,
} from "@/types/homecheff-visual-editor";

function leaf(id: string, label: string): EditorVisionHierarchyNode {
  return { id, label, category: "objects", editable: true, children: [] };
}

function branch(id: string, label: string, children: EditorVisionHierarchyNode[]): EditorVisionHierarchyNode {
  return { id, label, category: "objects", editable: false, children };
}

function docWithHierarchy(
  nodes: EditorVisionHierarchyNode[],
  extras: Partial<EditorCanvasDocument> = {}
): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_richer",
    name: "portrait.jpg",
    sourceKind: "character",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/portrait.jpg",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    visionHierarchy: nodes,
    ...extras,
  };
}

describe("chooseRicherVisionDocument", () => {
  it("keeps richer provisional when final hierarchy is weaker", () => {
    const provisional = docWithHierarchy(
      [
        branch("personage", "Personage", [
          branch("face", "Gezicht", [leaf("eyes", "Ogen"), leaf("mouth", "Mond"), leaf("hair", "Haar")]),
        ]),
        branch("clothing", "Kleding", [leaf("shirt", "Shirt")]),
        branch("accessories", "Accessoires", [leaf("sunglasses", "Zonnebril")]),
      ],
      {
        visionV6Meta: {
          illustrationAnalysis: true,
          rtdetrCount: 1,
          visionPartCount: 8,
          mergedLayerCount: 10,
          openAiPartsUsed: true,
          layerSources: [{ layerId: "a", label: "Sunglasses", source: "openai_vision" }],
        },
      }
    );
    const weakFinal = docWithHierarchy(
      [
        branch("personage", "Personage", [
          branch("body", "Lichaam", [leaf("head", "Head")]),
        ]),
      ],
      {
        visionV6Meta: {
          illustrationAnalysis: true,
          rtdetrCount: 1,
          visionPartCount: 2,
          mergedLayerCount: 3,
          openAiPartsUsed: false,
          layerSources: [],
        },
        visionAnalysisRun: {
          runId: "run-final",
          analysisId: "analysis-1",
          assetId: "asset",
          projectId: "project",
          backgroundUrl: "https://example.com/portrait.jpg",
          sessionId: "sess_richer",
          status: "complete",
          startedAt: new Date().toISOString(),
          pipelineCalls: 1,
          duplicateRunCount: 0,
          sourceOrder: ["bootstrap_complete"],
          isPartial: false,
        },
      }
    );

    const compare = compareVisionDocumentRichness(provisional, weakFinal);
    assert.equal(compare.keptPrevious, true);
    assert.ok(compare.previousScore > compare.nextScore);

    const chosen = chooseRicherVisionDocument(provisional, weakFinal);
    assert.ok(countVisionHierarchyNodes(chosen.visionHierarchy) > countVisionHierarchyNodes(weakFinal.visionHierarchy));
    assert.equal(chosen.visionAnalysisRun?.terminalStateReason, "final_weaker_than_provisional");
    assert.equal(chosen.visionAnalysisRun?.isPartial, true);
  });

  it("prefers stronger final when openAi evidence improves score", () => {
    const provisional = docWithHierarchy([branch("p", "Personage", [leaf("head", "Head")])]);
    const richFinal = docWithHierarchy(
      [
        branch("p", "Personage", [
          branch("face", "Face", [leaf("eyes", "Eyes"), leaf("mouth", "Mouth")]),
        ]),
        branch("c", "Clothing", [leaf("shirt", "Shirt")]),
      ],
      {
        visionV6Meta: {
          illustrationAnalysis: true,
          rtdetrCount: 1,
          visionPartCount: 6,
          mergedLayerCount: 8,
          openAiPartsUsed: true,
          layerSources: [],
        },
      }
    );
    const chosen = chooseRicherVisionDocument(provisional, richFinal);
    assert.equal(chosen, richFinal);
    assert.ok(visionDocumentRichnessScore(richFinal) > visionDocumentRichnessScore(provisional));
  });
});

describe("vision analysis auto-start scope alignment", () => {
  it("prepareEditorVisionAnalysisRun stamps stable analysisId for auto-start", () => {
    const base = docWithHierarchy([]);
    assert.equal(base.isolationScope?.analysisId, undefined);
    const prepared = prepareEditorVisionAnalysisRun(base);
    assert.ok(prepared.isolationScope?.analysisId);
    const keyBefore = editorVisionAnalysisRunKey(base);
    const keyAfter = editorVisionAnalysisRunKey(prepared);
    assert.match(keyBefore, /::pending$/);
    assert.doesNotMatch(keyAfter, /pending$/);
  });

  it("auto and manual paths share scopeKey after prepareEditorVisionAnalysisRun", () => {
    const base = docWithHierarchy([]);
    const preparedOnce = prepareEditorVisionAnalysisRun(base, { force: false });
    const preparedTwice = ensureEditorAnalysisIsolationScope(preparedOnce);
    assert.equal(
      editorVisionAnalysisRunKey(preparedOnce),
      editorVisionAnalysisRunKey(preparedTwice)
    );
    assert.doesNotMatch(editorVisionAnalysisRunKey(preparedOnce), /pending$/);
  });

  it("analysis_preparing pipeline stage advances progress beyond 28%", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "analysis_preparing",
      runMeta: {
        runId: "run-1",
        analysisId: "analysis-1",
        assetId: "asset",
        projectId: "project",
        backgroundUrl: "https://example.com/p.jpg",
        sessionId: "sess",
        status: "detecting",
        startedAt: new Date().toISOString(),
        pipelineCalls: 1,
        duplicateRunCount: 0,
        sourceOrder: ["analysis_preparing"],
        isPartial: false,
        lastStage: "analysis_preparing",
      },
    });
    assert.ok(snapshot.percent > 28);
    assert.equal(snapshot.stage, "analysis_preparing");
  });

  it("rtdetr pipeline stage reaches at least 40%", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "analysis_preparing",
      runMeta: {
        runId: "run-1",
        analysisId: "analysis-1",
        assetId: "asset",
        projectId: "project",
        backgroundUrl: "https://example.com/p.jpg",
        sessionId: "sess",
        status: "detecting",
        startedAt: new Date().toISOString(),
        pipelineCalls: 2,
        duplicateRunCount: 0,
        sourceOrder: ["analysis_preparing", "rtdetr"],
        isPartial: false,
        lastStage: "rtdetr",
      },
    });
    assert.ok(snapshot.percent >= 40);
  });
});

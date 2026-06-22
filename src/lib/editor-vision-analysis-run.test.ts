import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyIllustrationPartAnalysisToDocument,
  buildTemplateIllustrationPartAnalysis,
} from "@/lib/editor-vision-v6-part-analysis";
import { stampEditorAnalyzedBackground } from "@/lib/editor-analysis-reset";
import { createEditorAnalysisId, stampEditorAnalysisIsolationScope } from "@/lib/editor-project-isolation";
import {
  acceptAnalysisDocumentResult,
  buildEditorVisionAnalysisRunScope,
  buildVisionAnalysisLifecycleDebug,
  executeEditorVisionAnalysisRun,
  getDuplicateRunCountForTests,
  getInFlightAnalysisRunCountForTests,
  getStaleAnalysisResultRejectCountForTests,
  isEditorVisionAnalysisLoading,
  isEditorVisionAnalysisTerminal,
  readCachedAnalysisMatchesCurrentRun,
  resetEditorVisionAnalysisRunStateForTests,
  resolveEditorVisionAnalysisPending,
  resolveVisionAnalysisAcceptance,
  shouldShowFinalVisionHierarchy,
} from "@/lib/editor-vision-analysis-run";
import {
  editorVisionProjectIdsMatch,
  normalizeEditorVisionScopeUrl,
  scopesAlignForVisionResult,
} from "@/lib/editor-vision-analysis-scope";
import {
  resetStickyVisionHierarchyForTests,
  resolveDisplayVisionHierarchy,
} from "@/lib/editor-vision-v6-stability";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function baseDocument(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess-run-audit",
    name: "Portrait.jpg",
    sourceKind: "upload",
    sourceAssetId: "asset-1",
    backgroundUrl: "https://example.com/portrait.jpg",
    workflowStep: "object_detection",
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind: "upload",
        assetId: "asset-1",
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
    isolationScope: {
      assetId: "asset-1",
      projectId: "sess-run-audit",
      analysisId: createEditorAnalysisId(),
      sessionId: "sess-run-audit",
      backgroundUrl: "https://example.com/portrait.jpg",
    },
  };
}

function mascotVision(): AssetVisionAnalysis {
  return {
    objectType: "human",
    objectTypeLabel: "Portrait",
    visualStyle: "Photo",
    colors: [],
    shapeLanguage: [],
    keyFeatures: ["face", "sunglasses"],
    brandIdentity: "",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: [],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.9,
    safetyNotes: [],
    assetFamily: "",
    characterLineage: "",
    brandRecognitionConfidence: 0.5,
    identityFingerprint: {
      fingerprintHash: "portrait-run",
      identityShapeMarkers: [],
      accessoryPattern: "",
      silhouette: "",
    },
  };
}

function richDocument(): EditorCanvasDocument {
  const vision = mascotVision();
  const analysis = buildTemplateIllustrationPartAnalysis(vision);
  const doc = stampEditorAnalysisIsolationScope(
    stampEditorAnalyzedBackground(
      applyIllustrationPartAnalysisToDocument({
        document: baseDocument(),
        vision,
        detections: [{ label: "person", confidence: 0.9, box: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 } }],
        analysis,
        previewUrl: "https://example.com/portrait.jpg",
        sourceKind: "upload",
      })
    )
  );
  return {
    ...doc,
    visionAnalysisRun: {
      runId: "run-complete",
      analysisId: doc.isolationScope!.analysisId,
      assetId: doc.isolationScope!.assetId,
      projectId: doc.isolationScope!.projectId,
      backgroundUrl: doc.backgroundUrl,
      sessionId: doc.sessionId,
      status: "complete",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      pipelineCalls: 4,
      duplicateRunCount: 0,
      sourceOrder: ["rtdetr", "style_dna", "vision_parts_api", "truth_classifier", "bootstrap_complete"],
      isPartial: false,
    },
  };
}

describe("editor vision analysis scope normalization", () => {
  it("accepts matching backgroundUrl with trailing slash difference", () => {
    const doc = baseDocument();
    const scope = buildEditorVisionAnalysisRunScope({
      ...doc,
      backgroundUrl: "https://example.com/portrait.jpg/",
    });
    assert.equal(
      normalizeEditorVisionScopeUrl(scope.backgroundUrl),
      normalizeEditorVisionScopeUrl(doc.backgroundUrl)
    );
    assert.ok(scopesAlignForVisionResult(scope, doc));
  });

  it("allows projectId drift when hcProjectId is linked mid-run", () => {
    assert.ok(editorVisionProjectIdsMatch("sess-run-audit", "hc-project-123", "sess-run-audit"));
    const doc = {
      ...baseDocument(),
      instructionStudioState: { hcProjectId: "hc-project-123" },
    };
    const scope = buildEditorVisionAnalysisRunScope(doc);
    assert.ok(scopesAlignForVisionResult(scope, doc));
  });
});

describe("editor vision analysis run — flicker / double-run audit", () => {
  it("detecting without hierarchy returns empty (loading)", () => {
    const doc = baseDocument();
    const meta = {
      runId: "run-detecting",
      analysisId: doc.isolationScope!.analysisId,
      assetId: "asset-1",
      projectId: "sess-run-audit",
      backgroundUrl: doc.backgroundUrl,
      sessionId: doc.sessionId,
      status: "detecting" as const,
      startedAt: new Date().toISOString(),
      pipelineCalls: 0,
      duplicateRunCount: 0,
      sourceOrder: [],
      isPartial: false,
    };
    assert.equal(resolveDisplayVisionHierarchy(doc, meta).length, 0);
    assert.equal(isEditorVisionAnalysisLoading(meta.status), true);
  });

  it("detecting with provisional hierarchy shows items", () => {
    resetStickyVisionHierarchyForTests();
    const doc = richDocument();
    const meta = { ...doc.visionAnalysisRun!, status: "detecting" as const };
    assert.ok(resolveDisplayVisionHierarchy(doc, meta).length > 0);
  });

  it("finalizing keeps hierarchy visible", () => {
    resetStickyVisionHierarchyForTests();
    const doc = richDocument();
    const meta = { ...doc.visionAnalysisRun!, status: "finalizing" as const, isPartial: true };
    assert.ok(resolveDisplayVisionHierarchy(doc, meta).length > 0);
    assert.equal(isEditorVisionAnalysisLoading(meta.status), true);
  });

  it("complete with hierarchy renders items", () => {
    resetStickyVisionHierarchyForTests();
    const doc = richDocument();
    assert.ok(shouldShowFinalVisionHierarchy(doc, doc.visionAnalysisRun));
    assert.ok(resolveDisplayVisionHierarchy(doc, doc.visionAnalysisRun).length > 0);
  });

  it("successful final run accepts result after hcProjectId link", () => {
    resetEditorVisionAnalysisRunStateForTests();
    const source = baseDocument();
    const result = richDocument();
    result.instructionStudioState = { hcProjectId: "hc-linked-project" };
    result.isolationScope = { ...source.isolationScope! };
    result.visionAnalysisRun = {
      ...result.visionAnalysisRun!,
      analysisId: source.isolationScope!.analysisId,
      projectId: source.isolationScope!.projectId,
    };
    const current = {
      ...source,
      instructionStudioState: { hcProjectId: "hc-linked-project" },
    };
    assert.ok(acceptAnalysisDocumentResult(result, current));
  });

  it("provisional hierarchy during detecting is not treated as final", () => {
    const doc = richDocument();
    const detectingMeta = { ...doc.visionAnalysisRun!, status: "detecting" as const };
    assert.equal(shouldShowFinalVisionHierarchy(doc, detectingMeta), false);
    assert.ok(resolveDisplayVisionHierarchy(doc, detectingMeta).length > 0);
  });

  it("stale run result is ignored when analysisId changes", () => {
    resetEditorVisionAnalysisRunStateForTests();
    const current = baseDocument();
    const stale = richDocument();
    stale.isolationScope = {
      ...current.isolationScope!,
      analysisId: "analysis-stale",
    };
    stale.visionAnalysisRun = {
      ...stale.visionAnalysisRun!,
      analysisId: "analysis-stale",
    };
    const accepted = acceptAnalysisDocumentResult(stale, current);
    assert.equal(accepted, null);
    assert.ok(getStaleAnalysisResultRejectCountForTests() >= 1);
  });

  it("duplicate bootstrap for same asset/run is deduped", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    const doc = baseDocument();
    let calls = 0;
    const runner = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return richDocument();
    };
    const p1 = executeEditorVisionAnalysisRun(doc, runner);
    const p2 = executeEditorVisionAnalysisRun(doc, runner);
    assert.equal(getInFlightAnalysisRunCountForTests(), 1);
    await Promise.all([p1, p2]);
    assert.equal(calls, 1);
    assert.ok(getDuplicateRunCountForTests() >= 1);
  });

  it("new analysis ignores previous run result", () => {
    resetEditorVisionAnalysisRunStateForTests();
    const doc = baseDocument();
    const runA = buildEditorVisionAnalysisRunScope(doc, "analysis-a");
    const resultA = richDocument();
    resultA.visionAnalysisRun = {
      ...resultA.visionAnalysisRun!,
      runId: runA.runId,
      analysisId: runA.analysisId,
    };
    const current = { ...doc, isolationScope: { ...doc.isolationScope!, analysisId: "analysis-b" } };
    assert.equal(acceptAnalysisDocumentResult(resultA, current), null);
  });

  it("cache match renders after complete with normalized backgroundUrl", () => {
    const doc = richDocument();
    const mismatch = {
      ...doc,
      backgroundUrl: "https://example.com/portrait.jpg/",
      isolationScope: {
        ...doc.isolationScope!,
        analysisId: createEditorAnalysisId(),
      },
    };
    assert.equal(readCachedAnalysisMatchesCurrentRun(mismatch, doc), false);
    assert.equal(readCachedAnalysisMatchesCurrentRun(doc, doc), true);
  });

  it("partial status may show hierarchy but not as final", () => {
    const doc = richDocument();
    const partialMeta = { ...doc.visionAnalysisRun!, status: "partial" as const, isPartial: true };
    assert.equal(shouldShowFinalVisionHierarchy(doc, partialMeta), false);
    assert.ok(resolveDisplayVisionHierarchy(doc, partialMeta).length > 0);
  });

  it("legacy rich document without visionAnalysisRun still displays", () => {
    resetStickyVisionHierarchyForTests();
    const doc = { ...richDocument(), visionAnalysisRun: undefined };
    assert.ok(shouldShowFinalVisionHierarchy(doc, null));
    assert.ok(resolveDisplayVisionHierarchy(doc, null).length > 0);
  });

  it("accepts result against sourceDocument when parent document is still stale", () => {
    resetEditorVisionAnalysisRunStateForTests();
    const source = baseDocument();
    const staleCurrent = {
      ...baseDocument(),
      isolationScope: {
        ...source.isolationScope!,
        analysisId: "analysis-stale-parent",
      },
    };
    const result = richDocument();
    result.isolationScope = { ...source.isolationScope! };
    result.visionAnalysisRun = {
      ...result.visionAnalysisRun!,
      analysisId: source.isolationScope!.analysisId,
      projectId: source.isolationScope!.projectId,
    };
    assert.equal(acceptAnalysisDocumentResult(result, staleCurrent), null);
    assert.ok(acceptAnalysisDocumentResult(result, source));
  });

  it("complete with empty hierarchy is allowed to show empty state path", () => {
    resetStickyVisionHierarchyForTests();
    const doc = {
      ...baseDocument(),
      visionHierarchy: [],
      visionAnalysisRun: {
        runId: "run-empty",
        analysisId: baseDocument().isolationScope!.analysisId,
        assetId: "asset-1",
        projectId: "sess-run-audit",
        backgroundUrl: "https://example.com/portrait.jpg",
        sessionId: "sess-run-audit",
        status: "complete" as const,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        pipelineCalls: 1,
        duplicateRunCount: 0,
        sourceOrder: ["bootstrap_complete"],
        isPartial: false,
      },
    };
    assert.equal(resolveDisplayVisionHierarchy(doc, doc.visionAnalysisRun).length, 0);
    assert.ok(shouldShowFinalVisionHierarchy(doc, doc.visionAnalysisRun));
  });

  it("successful executeEditorVisionAnalysisRun stamps complete and returns hierarchy", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    const doc = baseDocument();
    const result = await executeEditorVisionAnalysisRun(doc, async () => richDocument());
    assert.equal(result.visionAnalysisRun?.status, "complete");
    assert.ok((result.visionHierarchy?.length ?? 0) > 0);
    assert.ok(acceptAnalysisDocumentResult(result, doc));
  });
});

describe("editor vision analysis UI completion", () => {
  it("completed analysis renders final hierarchy via display resolver", () => {
    resetStickyVisionHierarchyForTests();
    const doc = richDocument();
    assert.equal(doc.visionAnalysisRun?.status, "complete");
    assert.ok(resolveDisplayVisionHierarchy(doc, doc.visionAnalysisRun).length > 0);
  });

  it("completed analysis with empty hierarchy shows empty state path", () => {
    resetStickyVisionHierarchyForTests();
    const doc = {
      ...baseDocument(),
      visionHierarchy: [],
      visionAnalysisRun: {
        runId: "run-empty",
        analysisId: baseDocument().isolationScope!.analysisId,
        assetId: "asset-1",
        projectId: "sess-run-audit",
        backgroundUrl: "https://example.com/portrait.jpg",
        sessionId: "sess-run-audit",
        status: "complete" as const,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        pipelineCalls: 1,
        duplicateRunCount: 0,
        sourceOrder: ["bootstrap_complete"],
        isPartial: false,
      },
    };
    assert.equal(resolveDisplayVisionHierarchy(doc, doc.visionAnalysisRun).length, 0);
    assert.ok(shouldShowFinalVisionHierarchy(doc, doc.visionAnalysisRun));
    assert.equal(
      resolveEditorVisionAnalysisPending({
        needsBootstrap: true,
        acceptFailed: false,
        runMeta: doc.visionAnalysisRun,
        inFlightRunMeta: null,
        pendingDisplayDocument: null,
        displayHierarchyLength: 0,
      }),
      false
    );
  });

  it("final result is not rejected when scope matches source document", () => {
    resetEditorVisionAnalysisRunStateForTests();
    const source = baseDocument();
    const result = richDocument();
    result.isolationScope = { ...source.isolationScope! };
    result.visionAnalysisRun = {
      ...result.visionAnalysisRun!,
      analysisId: source.isolationScope!.analysisId,
      projectId: source.isolationScope!.projectId,
    };
    const resolved = resolveVisionAnalysisAcceptance(result, source);
    assert.ok(resolved.accepted);
    assert.equal(resolved.rejectionReason, null);
  });

  it("backgroundUrl normalization prevents false rejection", () => {
    resetEditorVisionAnalysisRunStateForTests();
    const source = baseDocument();
    const result = richDocument();
    result.backgroundUrl = "https://example.com/portrait.jpg/";
    result.isolationScope = { ...source.isolationScope! };
    result.visionAnalysisRun = {
      ...result.visionAnalysisRun!,
      backgroundUrl: "https://example.com/portrait.jpg/",
      analysisId: source.isolationScope!.analysisId,
    };
    const resolved = resolveVisionAnalysisAcceptance(result, source);
    assert.ok(resolved.accepted);
  });

  it("provisional result promotes to final display during partial status", () => {
    resetStickyVisionHierarchyForTests();
    const doc = richDocument();
    const partialMeta = { ...doc.visionAnalysisRun!, status: "partial" as const, isPartial: true };
    assert.ok(resolveDisplayVisionHierarchy(doc, partialMeta).length > 0);
    const completeMeta = { ...doc.visionAnalysisRun!, status: "complete" as const, isPartial: false };
    assert.ok(resolveDisplayVisionHierarchy(doc, completeMeta).length > 0);
  });

  it("UI cannot remain loading after bootstrap_total when run meta is complete", () => {
    resetEditorVisionAnalysisRunStateForTests();
    const doc = baseDocument();
    const completeMeta = {
      runId: "run-done",
      analysisId: doc.isolationScope!.analysisId,
      assetId: "asset-1",
      projectId: "sess-run-audit",
      backgroundUrl: doc.backgroundUrl,
      sessionId: doc.sessionId,
      status: "complete" as const,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      pipelineCalls: 4,
      duplicateRunCount: 0,
      sourceOrder: ["rtdetr", "style_dna", "vision_parts_api", "bootstrap_complete"],
      isPartial: false,
      lastStage: "bootstrap_complete" as const,
    };
    assert.equal(isEditorVisionAnalysisTerminal(completeMeta.status), true);
    assert.equal(
      resolveEditorVisionAnalysisPending({
        needsBootstrap: true,
        acceptFailed: false,
        runMeta: completeMeta,
        inFlightRunMeta: null,
        pendingDisplayDocument: null,
        displayHierarchyLength: 0,
      }),
      false
    );
  });

  it("failed final analysis resolves to non-loading pending state", () => {
    const doc = baseDocument();
    const failedMeta = {
      runId: "run-failed",
      analysisId: doc.isolationScope!.analysisId,
      assetId: "asset-1",
      projectId: "sess-run-audit",
      backgroundUrl: doc.backgroundUrl,
      sessionId: doc.sessionId,
      status: "failed" as const,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      pipelineCalls: 2,
      duplicateRunCount: 0,
      sourceOrder: ["rtdetr"],
      isPartial: false,
    };
    assert.equal(
      resolveEditorVisionAnalysisPending({
        needsBootstrap: true,
        acceptFailed: false,
        runMeta: failedMeta,
        inFlightRunMeta: null,
        pendingDisplayDocument: null,
        displayHierarchyLength: 0,
      }),
      false
    );
    assert.equal(shouldShowFinalVisionHierarchy(doc, failedMeta), false);
  });

  it("lifecycle debug exposes admin fields for terminal runs", () => {
    const doc = richDocument();
    const debug = buildVisionAnalysisLifecycleDebug(doc, doc.visionAnalysisRun, {
      acceptedResult: true,
      displayHierarchyCount: 12,
    });
    assert.equal(debug.analysisStatus, "complete");
    assert.equal(debug.completedRunId, doc.visionAnalysisRun!.runId);
    assert.equal(debug.activeRunId, null);
    assert.equal(debug.acceptedResult, true);
    assert.equal(debug.displayHierarchyCount, 12);
    assert.ok(debug.finalHierarchyCount > 0);
  });

  it("sticky hierarchy survives stale react document after provisional display", () => {
    resetStickyVisionHierarchyForTests();
    const rich = richDocument();
    assert.ok(resolveDisplayVisionHierarchy(rich, rich.visionAnalysisRun).length > 0);
    const staleReactDoc = {
      ...baseDocument(),
      isolationScope: rich.isolationScope,
      backgroundUrl: rich.backgroundUrl,
      visionHierarchy: undefined,
      analyzedBackgroundUrl: undefined,
      visionAnalysisRun: rich.visionAnalysisRun,
    };
    assert.ok(resolveDisplayVisionHierarchy(staleReactDoc, rich.visionAnalysisRun).length > 0);
  });
});

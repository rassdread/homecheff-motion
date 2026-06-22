import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getRunMeta,
  getSnapshot,
  resetVisionRunMetaStoreForTests,
  resolveVisionRunMetaForDisplay,
  setRunMeta,
  subscribeRunMeta,
} from "@/lib/editor-vision-analysis-run-store";
import {
  editorVisionAnalysisRunKey,
  editorVisionAnalysisScopeKey,
  executeEditorVisionAnalysisRun,
  getDuplicateRunCountForTests,
  getInFlightAnalysisRunCountForTests,
  isEditorVisionAnalysisTerminal,
  reportAnalysisPipelineStage,
  resetEditorVisionAnalysisRunStateForTests,
  resolveEditorVisionAnalysisPending,
  type EditorVisionAnalysisRunMeta,
} from "@/lib/editor-vision-analysis-run";
import { resolveEditorVisionAnalysisProgress } from "@/lib/editor-vision-analysis-progress";
import { createEditorAnalysisId } from "@/lib/editor-project-isolation";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function baseDocument(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess-store",
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
      projectId: "sess-store",
      analysisId: createEditorAnalysisId(),
      sessionId: "sess-store",
      backgroundUrl: "https://example.com/portrait.jpg",
    },
  };
}

function baseMeta(
  scopeKey: string,
  patch: Partial<EditorVisionAnalysisRunMeta> = {}
): EditorVisionAnalysisRunMeta {
  const [projectId, assetId, analysisId] = scopeKey.split("::");
  return {
    runId: "run-store",
    analysisId,
    assetId,
    projectId,
    backgroundUrl: "https://example.com/portrait.jpg",
    sessionId: projectId,
    status: "detecting",
    startedAt: new Date().toISOString(),
    pipelineCalls: 0,
    duplicateRunCount: 0,
    sourceOrder: [],
    isPartial: false,
    ...patch,
  };
}

describe("editor vision analysis run store", () => {
  it("setRunMeta notifies subscribers for the same scope key", () => {
    resetVisionRunMetaStoreForTests();
    const doc = baseDocument();
    const scopeKey = editorVisionAnalysisRunKey(doc);
    let notifications = 0;
    const unsubscribe = subscribeRunMeta(scopeKey, () => {
      notifications += 1;
    });
    setRunMeta(scopeKey, baseMeta(scopeKey));
    assert.equal(notifications, 1);
    assert.equal(getSnapshot(scopeKey)?.status, "detecting");
    unsubscribe();
  });

  it("two subscribers on the same scope receive identical snapshots", () => {
    resetVisionRunMetaStoreForTests();
    const doc = baseDocument();
    const scopeKey = editorVisionAnalysisRunKey(doc);
    const seenA: Array<EditorVisionAnalysisRunMeta | null> = [];
    const seenB: Array<EditorVisionAnalysisRunMeta | null> = [];
    const unsubA = subscribeRunMeta(scopeKey, () => seenA.push(getSnapshot(scopeKey)));
    const unsubB = subscribeRunMeta(scopeKey, () => seenB.push(getSnapshot(scopeKey)));
    setRunMeta(scopeKey, baseMeta(scopeKey, { lastStage: "rtdetr" }));
    unsubA();
    unsubB();
    assert.equal(seenA.length, 1);
    assert.equal(seenB.length, 1);
    assert.equal(seenA[0]?.lastStage, "rtdetr");
    assert.equal(seenB[0]?.lastStage, "rtdetr");
  });

  it("resolveVisionRunMetaForDisplay prefers store over document fallback", () => {
    resetVisionRunMetaStoreForTests();
    const doc = baseDocument();
    const scopeKey = editorVisionAnalysisRunKey(doc);
    setRunMeta(scopeKey, baseMeta(scopeKey, { status: "partial", lastStage: "provisional" }));
    const resolved = resolveVisionRunMetaForDisplay({
      scopeKey,
      documentRunMeta: {
        ...baseMeta(scopeKey, { status: "detecting" }),
      },
    });
    assert.equal(resolved?.status, "partial");
    assert.equal(resolved?.lastStage, "provisional");
  });

  it("pipeline started by hook A updates store for hook B subscriber", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    const doc = baseDocument();
    const scopeKey = editorVisionAnalysisRunKey(doc);
    const hookBUpdates: EditorVisionAnalysisRunMeta[] = [];
    const unsub = subscribeRunMeta(scopeKey, () => {
      const snap = getSnapshot(scopeKey);
      if (snap) {
        hookBUpdates.push(snap);
      }
    });

    const runner = async (_run: unknown, reportStage: (s: "rtdetr") => void) => {
      reportStage("rtdetr");
      await new Promise((r) => setTimeout(r, 5));
      return { ...doc, objects: doc.objects };
    };

    await executeEditorVisionAnalysisRun(doc, runner as never);
    unsub();

    assert.ok(hookBUpdates.some((meta) => meta.lastStage === "rtdetr"));
    assert.ok(hookBUpdates.some((meta) => meta.status === "complete"));
  });

  it("RT-DETR stage update reaches progress resolution at least 40%", () => {
    resetVisionRunMetaStoreForTests();
    const doc = baseDocument();
    const scopeKey = editorVisionAnalysisRunKey(doc);
    setRunMeta(scopeKey, baseMeta(scopeKey, { status: "detecting", lastStage: "rtdetr" }));
    const runMeta = getRunMeta(scopeKey);
    const progress = resolveEditorVisionAnalysisProgress({
      openStage: "editor_opening",
      runMeta,
    });
    assert.ok(progress.percent >= 40);
    assert.equal(progress.stage, "local_detection");
  });

  it("duplicate-run joiner receives current meta immediately and terminal meta", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    const doc = baseDocument();
    const scopeKey = editorVisionAnalysisRunKey(doc);
    const joinerSnapshots: EditorVisionAnalysisRunMeta[] = [];

    const runner = async (_run: unknown, reportStage: (s: "rtdetr") => void) => {
      reportStage("rtdetr");
      await new Promise((r) => setTimeout(r, 25));
      return { ...doc, objects: doc.objects };
    };

    const leader = executeEditorVisionAnalysisRun(doc, runner as never, {
      onStatusChange: () => {},
    });
    await new Promise((r) => setTimeout(r, 5));

    const joiner = executeEditorVisionAnalysisRun(doc, runner as never, {
      onStatusChange: (meta) => joinerSnapshots.push(meta),
    });

    await Promise.all([leader, joiner]);
    assert.ok(getDuplicateRunCountForTests() >= 1);
    assert.ok(joinerSnapshots.some((meta) => meta.lastStage === "rtdetr"));
    assert.ok(joinerSnapshots.some((meta) => meta.status === "complete"));
  });

  it("terminal meta clears pending state for passive hook instance", () => {
    resetVisionRunMetaStoreForTests();
    const doc = baseDocument();
    const scopeKey = editorVisionAnalysisRunKey(doc);
    setRunMeta(scopeKey, baseMeta(scopeKey, { status: "complete", completedAt: new Date().toISOString() }));
    const runMeta = resolveVisionRunMetaForDisplay({ scopeKey, documentRunMeta: doc.visionAnalysisRun });
    const pending = resolveEditorVisionAnalysisPending({
      needsBootstrap: true,
      acceptFailed: false,
      runMeta,
      hasActiveStoreRun: false,
      pendingDisplayDocument: null,
      displayHierarchyLength: 0,
    });
    assert.equal(pending, false);
    assert.equal(isEditorVisionAnalysisTerminal(runMeta?.status), true);
  });

  it("progress does not fall back to editor_opening when store run is active", () => {
    resetVisionRunMetaStoreForTests();
    const doc = baseDocument();
    const scopeKey = editorVisionAnalysisRunKey(doc);
    setRunMeta(scopeKey, baseMeta(scopeKey, { status: "detecting" }));
    const progress = resolveEditorVisionAnalysisProgress({
      openStage: "editor_opening",
      runMeta: getRunMeta(scopeKey),
    });
    assert.notEqual(progress.percent, 15);
    assert.notEqual(progress.stage, "editor_opening");
  });

  it("provisional partial meta is reactive via store subscription", () => {
    resetEditorVisionAnalysisRunStateForTests();
    const doc = baseDocument();
    const scopeKey = editorVisionAnalysisScopeKey({
      projectId: doc.isolationScope!.projectId,
      assetId: doc.isolationScope!.assetId,
      analysisId: doc.isolationScope!.analysisId,
    });
    setRunMeta(scopeKey, baseMeta(scopeKey, { status: "detecting" }));
    reportAnalysisPipelineStage(scopeKey, "rtdetr");
    reportAnalysisPipelineStage(scopeKey, "provisional");
    const meta = getRunMeta(scopeKey);
    assert.equal(meta?.status, "partial");
    assert.equal(meta?.lastStage, "provisional");
  });

  it("does not start duplicate pipeline run for same scope", async () => {
    resetEditorVisionAnalysisRunStateForTests();
    const doc = baseDocument();
    let calls = 0;
    const runner = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return { ...doc, objects: doc.objects };
    };
    const p1 = executeEditorVisionAnalysisRun(doc, runner);
    const p2 = executeEditorVisionAnalysisRun(doc, runner);
    assert.equal(getInFlightAnalysisRunCountForTests(), 1);
    await Promise.all([p1, p2]);
    assert.equal(calls, 1);
  });

  it("mirrors run meta to pending scope key for UI subscribers", () => {
    resetVisionRunMetaStoreForTests();
    const scopeKey = "sess-store::asset-1::analysis-real";
    const pendingKey = "sess-store::asset-1::pending";
    let pendingNotifications = 0;
    const unsub = subscribeRunMeta(pendingKey, () => {
      pendingNotifications += 1;
    });
    setRunMeta(scopeKey, baseMeta(scopeKey, { lastStage: "rtdetr" }));
    assert.equal(getRunMeta(pendingKey)?.lastStage, "rtdetr");
    assert.ok(pendingNotifications >= 1);
    unsub();
  });

  it("resolveVisionRunMetaForDisplay reads pending alias when stamped key is empty", () => {
    resetVisionRunMetaStoreForTests();
    const pendingKey = "sess-store::asset-1::pending";
    setRunMeta(pendingKey, baseMeta("sess-store::asset-1::analysis-x", { lastStage: "rtdetr" }));
    const resolved = resolveVisionRunMetaForDisplay({
      scopeKey: pendingKey,
    });
    assert.equal(resolved?.lastStage, "rtdetr");
  });

  it("hasActiveStoreRun prevents bootstrap-wait when another instance started the run", () => {
    resetVisionRunMetaStoreForTests();
    const doc = baseDocument();
    const scopeKey = editorVisionAnalysisRunKey(doc);

    const waitingToStart = resolveEditorVisionAnalysisPending({
      needsBootstrap: true,
      acceptFailed: false,
      runMeta: null,
      hasActiveStoreRun: false,
      pendingDisplayDocument: null,
      displayHierarchyLength: 0,
    });
    assert.equal(waitingToStart, true);

    setRunMeta(scopeKey, baseMeta(scopeKey, { status: "detecting", lastStage: "rtdetr" }));
    const runMeta = getRunMeta(scopeKey);
    const passiveHookPending = resolveEditorVisionAnalysisPending({
      needsBootstrap: true,
      acceptFailed: false,
      runMeta,
      hasActiveStoreRun: true,
      pendingDisplayDocument: null,
      displayHierarchyLength: 0,
    });
    assert.equal(passiveHookPending, true);
    assert.notEqual(
      resolveEditorVisionAnalysisPending({
        needsBootstrap: true,
        acceptFailed: false,
        runMeta: null,
        hasActiveStoreRun: false,
        pendingDisplayDocument: null,
        displayHierarchyLength: 0,
      }),
      passiveHookPending
    );
  });
});

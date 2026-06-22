import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { resolveEditorVisionAnalysisProgress } from "@/lib/editor-vision-analysis-progress";
import { resolveEditorVisionAnalysisPending } from "@/lib/editor-vision-analysis-run";
import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";

describe("editor detection bootstrap — parallel RT-DETR / Style DNA", () => {
  const source = readFileSync(
    join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
    "utf8"
  );

  it("does not use Promise.all before provisional emit", () => {
    assert.doesNotMatch(source, /PROMISE_ALL_START/);
    assert.match(source, /RTDETR_PROVISIONAL_EMITTED/);
    assert.match(source, /const styleDnaPromise = startStyleDnaAnalyze/);
    assert.match(source, /const onnxResult = await withStageTimeout\([\s\S]*traceRtdetrDetect/);
    assert.match(source, /options\?\.onStage\?\.\("rtdetr"\)/);
    assert.match(source, /applyLocalProvisionalParts\([\s\S]*options\)/);
  });

  it("onStage rtdetr fires before Style DNA await", () => {
    const rtdetrStageIndex = source.indexOf('options?.onStage?.("rtdetr")');
    const styleDnaAwaitIndex = source.indexOf("await Promise.all([enrichPromise, styleDnaResolvedPromise])");
    assert.ok(rtdetrStageIndex > 0);
    assert.ok(styleDnaAwaitIndex > rtdetrStageIndex);
  });

  it("provisional emit occurs before final enrich/style merge", () => {
    const provisionalIndex = source.indexOf("RTDETR_PROVISIONAL_EMITTED");
    const enrichIndex = source.indexOf("const enrichPromise = maybeEnrichIllustrationParts");
    assert.ok(provisionalIndex > 0 && enrichIndex > provisionalIndex);
  });

  it("Style DNA uses independent timeout and does not block RT-DETR path", () => {
    assert.match(source, /function startStyleDnaAnalyze/);
    assert.match(source, /STYLE_DNA_TIMEOUT/);
    assert.match(source, /styleDnaTimedOut = !styleResolved\.visionAnalyzeOk/);
  });

  it("progress advances past editor_opening when rtdetr stage is reported", () => {
    const meta: EditorVisionAnalysisRunMeta = {
      runId: "run-rt",
      analysisId: "a1",
      assetId: "asset",
      projectId: "p1",
      backgroundUrl: "https://example.com/p.jpg",
      sessionId: "s1",
      status: "detecting",
      startedAt: new Date().toISOString(),
      pipelineCalls: 1,
      duplicateRunCount: 0,
      sourceOrder: ["rtdetr"],
      isPartial: false,
      lastStage: "rtdetr",
    };
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "editor_opening",
      runMeta: meta,
    });
    assert.ok(snapshot.percent >= 35);
    assert.equal(snapshot.stage, "local_detection");
  });

  it("partial provisional progress is above 45%", () => {
    const meta: EditorVisionAnalysisRunMeta = {
      runId: "run-partial",
      analysisId: "a1",
      assetId: "asset",
      projectId: "p1",
      backgroundUrl: "https://example.com/p.jpg",
      sessionId: "s1",
      status: "partial",
      startedAt: new Date().toISOString(),
      pipelineCalls: 2,
      duplicateRunCount: 0,
      sourceOrder: ["rtdetr", "provisional"],
      isPartial: true,
      lastStage: "provisional",
    };
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "editor_opening",
      runMeta: meta,
    });
    assert.ok(snapshot.percent >= 45);
    assert.ok(snapshot.percent <= 75);
  });

  it("UI pending clears with partial run meta even when needsBootstrap", () => {
    assert.equal(
      resolveEditorVisionAnalysisPending({
        needsBootstrap: true,
        acceptFailed: false,
        runMeta: {
          runId: "run-partial",
          analysisId: "a1",
          assetId: "asset",
          projectId: "p1",
          backgroundUrl: "https://example.com/p.jpg",
          sessionId: "s1",
          status: "partial",
          startedAt: new Date().toISOString(),
          pipelineCalls: 1,
          duplicateRunCount: 0,
          sourceOrder: ["rtdetr", "provisional"],
          isPartial: true,
          lastStage: "provisional",
        },
        inFlightRunMeta: null,
        pendingDisplayDocument: { sessionId: "s1", backgroundUrl: "https://example.com/p.jpg" } as never,
        displayHierarchyLength: 3,
      }),
      false
    );
  });

  it("bootstrap_total is still recorded via completeBootstrap", () => {
    assert.match(source, /endEditorAnalysisStage\(stamped\.sessionId, "bootstrap_total"\)/);
  });
});

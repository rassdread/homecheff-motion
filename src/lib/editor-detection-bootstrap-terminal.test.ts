import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  BOOTSTRAP_LOCAL_STAGE_TIMEOUT_MS,
  BOOTSTRAP_MAX_MS,
} from "@/lib/editor-detection-bootstrap";
import {
  beginEditorAnalysisStage,
  endEditorAnalysisStage,
  listEditorAnalysisTimings,
  resetEditorAnalysisTimingsForTests,
} from "@/lib/editor-analysis-performance";
import { resolveEditorVisionAnalysisPending } from "@/lib/editor-vision-analysis-run";
import { resolveEditorVisionAnalysisProgress } from "@/lib/editor-vision-analysis-progress";

describe("editor detection bootstrap terminal safety", () => {
  it("wraps pipeline in bootstrap max timeout race", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
      "utf8"
    );
    assert.equal(BOOTSTRAP_MAX_MS, 25_000);
    assert.match(source, /Promise\.race\(\[pipelinePromise, timeoutPromise\]\)/);
    assert.match(source, /buildBootstrapTimeoutFallback/);
  });

  it("RT-DETR and Style DNA use independent paths — Style DNA never blocks provisional", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
      "utf8"
    );
    assert.equal(BOOTSTRAP_LOCAL_STAGE_TIMEOUT_MS, 12_000);
    assert.match(source, /startStyleDnaAnalyze/);
    assert.match(source, /RTDETR_PROVISIONAL_EMITTED/);
    assert.doesNotMatch(source, /PROMISE_ALL_START/);
  });

  it("provisional document is passed into Vision Parts enrichment", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
      "utf8"
    );
    assert.match(source, /const provisional = applyLocalProvisionalParts/);
    assert.match(source, /maybeEnrichIllustrationParts\(\s*provisional/);
  });

  it("skipped Vision Parts still applies local provisional parts", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
      "utf8"
    );
    assert.match(source, /vision_parts_skipped_local_only/);
    assert.match(source, /applyLocalPartsToDocument\(document, vision, onnxResult\)/);
  });

  it("Vision Parts API failure falls back to local provisional analysis", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
      "utf8"
    );
    assert.match(source, /vision_parts_local_fallback/);
    assert.match(source, /usedLocalFallback = !apiAnalysis/);
  });

  it("bootstrap_total is always recorded in completeBootstrap", () => {
    resetEditorAnalysisTimingsForTests();
    const source = readFileSync(
      join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
      "utf8"
    );
    assert.match(source, /endEditorAnalysisStage\(stamped\.sessionId, "bootstrap_total"\)/);
    beginEditorAnalysisStage("sess-bootstrap-total", "bootstrap_total");
    endEditorAnalysisStage("sess-bootstrap-total", "bootstrap_total", "test");
    assert.ok(listEditorAnalysisTimings("sess-bootstrap-total").some((row) => row.stage === "bootstrap_total"));
  });

  it("UI pending clears after terminal complete even when needsBootstrap is true", () => {
    assert.equal(
      resolveEditorVisionAnalysisPending({
        needsBootstrap: true,
        acceptFailed: false,
        runMeta: {
          runId: "run-terminal",
          analysisId: "analysis-1",
          assetId: "asset-1",
          projectId: "sess-1",
          backgroundUrl: "https://example.com/p.jpg",
          sessionId: "sess-1",
          status: "complete",
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          pipelineCalls: 4,
          duplicateRunCount: 0,
          sourceOrder: ["bootstrap_complete"],
          isPartial: false,
          lastStage: "bootstrap_complete",
        },
        inFlightRunMeta: null,
        pendingDisplayDocument: null,
        displayHierarchyLength: 0,
      }),
      false
    );
  });

  it("failed deep analysis maps progress to terminal fallback", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "deep_analysis",
      runMeta: {
        runId: "run-failed",
        analysisId: "analysis-1",
        assetId: "asset-1",
        projectId: "sess-1",
        backgroundUrl: "https://example.com/p.jpg",
        sessionId: "sess-1",
        status: "failed",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        pipelineCalls: 2,
        duplicateRunCount: 0,
        sourceOrder: ["vision_parts_api"],
        isPartial: false,
        fallbackUsed: true,
      },
    });
    assert.equal(snapshot.percent, 100);
    assert.equal(snapshot.showProgress, false);
  });

  it("finalizeWithParts catches enrich errors and completes with provisional", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
      "utf8"
    );
    assert.match(source, /catch \(error\) \{[\s\S]*completeBootstrap\(provisional/);
  });

  it("parts panel renders progress bar during loading", () => {
    const panel = readFileSync(
      join(process.cwd(), "src/components/editor/editor-vision-parts-panel.tsx"),
      "utf8"
    );
    assert.match(panel, /editor-vision-analysis-progress-bar/);
    assert.match(panel, /editor\.open\.progressPercent/);
    assert.match(panel, /editor\.open\.progressHint/);
  });
});

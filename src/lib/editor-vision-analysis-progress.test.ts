import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMonotonicProgressTracker,
  bumpProgressAfterRtdetrTiming,
  bumpProgressAfterVisionPartsTiming,
  resolveEditorVisionAnalysisProgress,
} from "@/lib/editor-vision-analysis-progress";
import { VISION_PARTS_API_TIMEOUT_MS } from "@/lib/editor-vision-v6-client";
import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";

function baseMeta(
  patch: Partial<EditorVisionAnalysisRunMeta> = {}
): EditorVisionAnalysisRunMeta {
  return {
    runId: "run-progress",
    analysisId: "analysis-1",
    assetId: "asset-1",
    projectId: "sess-1",
    backgroundUrl: "https://example.com/p.jpg",
    sessionId: "sess-1",
    status: "detecting",
    startedAt: new Date().toISOString(),
    pipelineCalls: 0,
    duplicateRunCount: 0,
    sourceOrder: [],
    isPartial: false,
    ...patch,
  };
}

describe("editor vision analysis progress", () => {
  it("progress never decreases", () => {
    const tracker = createMonotonicProgressTracker();
    const first = tracker.resolve({
      openStage: "analysis_preparing",
      runMeta: baseMeta({ status: "detecting" }),
    });
    const second = tracker.resolve({
      openStage: "analysis_preparing",
      runMeta: baseMeta({ status: "detecting", lastStage: "rtdetr" }),
    });
    const third = tracker.resolve({
      openStage: "provisional_detection",
      runMeta: baseMeta({ status: "partial", lastStage: "provisional", isPartial: true }),
    });
    assert.ok(second.percent >= first.percent);
    assert.ok(third.percent >= second.percent);
  });

  it("detecting maps to 20–50%", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "analysis_preparing",
      runMeta: baseMeta({ status: "detecting", lastStage: "rtdetr" }),
    });
    assert.ok(snapshot.percent >= 20);
    assert.ok(snapshot.percent <= 50);
    assert.equal(snapshot.stage, "local_detection");
  });

  it("style dna pending maps to details fetching band", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "analysis_preparing",
      runMeta: baseMeta({ status: "detecting", lastStage: "style_dna" }),
    });
    assert.ok(snapshot.percent >= 45);
    assert.ok(snapshot.percent <= 55);
    assert.equal(snapshot.stage, "accessories_details");
  });

  it("partial maps to 50–75%", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "provisional_detection",
      runMeta: baseMeta({
        status: "partial",
        lastStage: "provisional",
        isPartial: true,
      }),
    });
    assert.ok(snapshot.percent >= 50);
    assert.ok(snapshot.percent <= 75);
    assert.equal(snapshot.stage, "parts_recognition");
  });

  it("finalizing maps to 75–95%", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "deep_analysis",
      runMeta: baseMeta({
        status: "finalizing",
        lastStage: "truth_classifier",
        isPartial: true,
      }),
    });
    assert.ok(snapshot.percent >= 75);
    assert.ok(snapshot.percent <= 95);
    assert.equal(snapshot.stage, "accessories_details");
  });

  it("complete maps to 100%", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "ready",
      runMeta: baseMeta({ status: "complete", lastStage: "bootstrap_complete" }),
    });
    assert.equal(snapshot.percent, 100);
    assert.equal(snapshot.showProgress, false);
  });

  it("failed maps to complete fallback", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "deep_analysis",
      runMeta: baseMeta({ status: "failed" }),
    });
    assert.equal(snapshot.percent, 100);
    assert.equal(snapshot.showProgress, false);
  });

  it("cached result skips progress", () => {
    const snapshot = resolveEditorVisionAnalysisProgress({
      openStage: "analysis_preparing",
      runMeta: baseMeta({ status: "complete", cachedResult: true }),
      cachedResult: true,
    });
    assert.equal(snapshot.showProgress, false);
    assert.equal(snapshot.percent, 100);
  });

  it("bumps past 28% when RT-DETR timing exists but runMeta is stale", () => {
    const stalled = resolveEditorVisionAnalysisProgress({
      openStage: "analysis_preparing",
      runMeta: null,
    });
    assert.equal(stalled.percent, 28);
    const bumped = bumpProgressAfterRtdetrTiming({
      snapshot: stalled,
      rtdetrRecorded: true,
      analysisPending: true,
      analysisInProgress: true,
      runMeta: null,
    });
    assert.ok(bumped.percent >= 40);
    assert.equal(bumped.stage, "local_detection");
  });

  it("preserves advanced stage label when monotonic percent is floored", () => {
    const advanced = bumpProgressAfterRtdetrTiming({
      snapshot: resolveEditorVisionAnalysisProgress({
        openStage: "photo_loading",
        runMeta: null,
      }),
      rtdetrRecorded: true,
      analysisPending: true,
      analysisInProgress: true,
      runMeta: null,
    });
    const regressed = resolveEditorVisionAnalysisProgress({
      openStage: "photo_loading",
      runMeta: baseMeta({ status: "detecting", lastStage: "analysis_preparing" }),
      previousPercent: advanced.percent,
      previousSnapshot: advanced,
    });
    assert.equal(regressed.percent, 40);
    assert.equal(regressed.labelKey, "editor.open.stage.localDetection");
  });

  it("fixes stale photo_loading label when percent already reached 40 via monotonic", () => {
    const floored = resolveEditorVisionAnalysisProgress({
      openStage: "photo_loading",
      runMeta: null,
      previousPercent: 40,
      previousSnapshot: {
        percent: 40,
        stage: "photo_loading",
        labelKey: "editor.open.stage.photoLoading",
        showProgress: true,
      },
    });
    assert.equal(floored.percent, 40);
    const fixed = bumpProgressAfterRtdetrTiming({
      snapshot: floored,
      rtdetrRecorded: true,
      analysisPending: true,
      analysisInProgress: true,
      runMeta: null,
    });
    assert.equal(fixed.labelKey, "editor.open.stage.localDetection");
  });

  it("bumps to parts recognition when vision_parts_api timing exists but runMeta is stale", () => {
    const stalled = bumpProgressAfterRtdetrTiming({
      snapshot: resolveEditorVisionAnalysisProgress({
        openStage: "analysis_preparing",
        runMeta: null,
      }),
      rtdetrRecorded: true,
      analysisPending: true,
      analysisInProgress: true,
      runMeta: null,
    });
    const bumped = bumpProgressAfterVisionPartsTiming({
      snapshot: stalled,
      visionPartsRecorded: true,
      analysisPending: true,
      analysisInProgress: true,
      runMeta: null,
    });
    assert.ok(bumped.percent >= 55);
    assert.equal(bumped.stage, "parts_recognition");
  });

  it("long Vision Parts API caps at 88% until complete", () => {
    const mid = resolveEditorVisionAnalysisProgress({
      openStage: "deep_analysis",
      runMeta: baseMeta({ status: "partial", lastStage: "vision_parts_api", isPartial: true }),
      visionPartsElapsedMs: VISION_PARTS_API_TIMEOUT_MS / 2,
    });
    const capped = resolveEditorVisionAnalysisProgress({
      openStage: "deep_analysis",
      runMeta: baseMeta({ status: "finalizing", lastStage: "vision_parts_api", isPartial: true }),
      visionPartsElapsedMs: VISION_PARTS_API_TIMEOUT_MS * 4,
    });
    assert.ok(mid.percent >= 55);
    assert.ok(mid.percent <= 88);
    assert.ok(capped.percent <= 88);
    const complete = resolveEditorVisionAnalysisProgress({
      openStage: "ready",
      runMeta: baseMeta({ status: "complete", lastStage: "bootstrap_complete" }),
      previousPercent: capped.percent,
    });
    assert.equal(complete.percent, 100);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  beginEditorAnalysisStage,
  endEditorAnalysisStage,
  listEditorAnalysisTimings,
  recordEditorAnalysisTiming,
  resetEditorAnalysisTimingsForTests,
} from "@/lib/editor-analysis-performance";

describe("editor analysis performance", () => {
  it("records stage durations for admin debug panel", () => {
    resetEditorAnalysisTimingsForTests();
    beginEditorAnalysisStage("sess_perf", "rtdetr_detect");
    recordEditorAnalysisTiming("sess_perf", "vision_parts_api", 120, "cache miss");
    endEditorAnalysisStage("sess_perf", "rtdetr_detect");
    const rows = listEditorAnalysisTimings("sess_perf");
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.stage, "vision_parts_api");
    assert.equal(rows[0]?.durationMs, 120);
    assert.equal(rows[1]?.stage, "rtdetr_detect");
  });

  it("skips timing rows when stage was never started", () => {
    resetEditorAnalysisTimingsForTests();
    endEditorAnalysisStage("sess_perf", "bootstrap_total");
    assert.equal(listEditorAnalysisTimings("sess_perf").length, 0);
  });
});

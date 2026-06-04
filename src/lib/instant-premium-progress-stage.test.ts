import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INSTANT_EXPORT_STUCK_MS,
  isInstantExportProgressStuck,
  resolveInstantPremiumProgress,
} from "@/lib/instant-premium-progress-stage";

describe("instant premium progress stage", () => {
  it("maps segment generation to 0–70%", () => {
    const view = resolveInstantPremiumProgress({
      status: "running",
      phase: "generating_clips",
      progressPercent: 40,
    });
    assert.equal(view.stage, "segment_rendering");
    assert.ok(view.displayPercent <= 70);
  });

  it("maps early poster progress to foreground segmentation", () => {
    const view = resolveInstantPremiumProgress({
      status: "running",
      phase: "generating_clips",
      progressPercent: 8,
      instantTextRenderMode: "poster_motion_preserve",
    });
    assert.equal(view.stage, "foreground_segmentation");
  });

  it("maps rebuild merge at 75% to poster or merge stage", () => {
    const view = resolveInstantPremiumProgress({
      status: "finalizing",
      phase: "merging_clips",
      progressPercent: 75,
      isRebuildingFinalVideo: true,
      instantTextRenderMode: "poster_motion_preserve",
    });
    assert.equal(view.activeOperation, "rebuild");
    assert.equal(view.stage, "poster_compositing");
  });

  it("maps upload band at 88%", () => {
    const view = resolveInstantPremiumProgress({
      status: "finalizing",
      phase: "uploading_final",
      progressPercent: 88,
    });
    assert.equal(view.stage, "upload_storage");
    assert.equal(view.activeOperation, "upload");
  });

  it("shows failed merge at 70% not 0%", () => {
    const view = resolveInstantPremiumProgress({
      status: "failed",
      phase: "failed",
      progressPercent: 0,
      exportFailure: {
        exportId: "e1",
        exportStatus: "failed",
        exportFailureReason: "merge_failed",
        exportLastError: "concat failed",
        workerError: "concat failed",
        failedAtStage: "merge_clips",
        displayProgress: 70,
        isExportFailure: true,
        finalRebuildFailed: false,
      },
    });
    assert.equal(view.displayPercent, 70);
    assert.equal(view.stage, "merge_clips");
    assert.equal(view.activeOperation, "idle");
  });

  it("shows repair activeOperation even when export status is failed", () => {
    const view = resolveInstantPremiumProgress({
      status: "failed",
      phase: "failed",
      progressPercent: 12,
      isRestoringFinalVideo: true,
      exportFailure: {
        exportId: "e1",
        exportStatus: "failed",
        exportFailureReason: "merge_failed",
        exportLastError: "upload failed",
        workerError: null,
        failedAtStage: "merge_clips",
        displayProgress: 70,
        isExportFailure: true,
        finalRebuildFailed: false,
      },
    });
    assert.equal(view.activeOperation, "repair");
    assert.ok(view.displayPercent >= 10);
  });

  it("prioritizes rebuild over failed snapshot", () => {
    const view = resolveInstantPremiumProgress({
      status: "failed",
      phase: "failed",
      progressPercent: 0,
      isRebuildingFinalVideo: true,
      exportFailure: {
        exportId: "e1",
        exportStatus: "failed",
        exportFailureReason: "merge_failed",
        exportLastError: "old",
        workerError: null,
        failedAtStage: "merge_clips",
        displayProgress: 70,
        isExportFailure: true,
        finalRebuildFailed: false,
      },
    });
    assert.equal(view.activeOperation, "rebuild");
    assert.equal(view.displayPercent, 70);
  });

  it("detects stuck export after 90s without progress change", () => {
    const now = Date.now();
    assert.equal(
      isInstantExportProgressStuck({
        isActive: true,
        lastProgressChangeAtMs: now - INSTANT_EXPORT_STUCK_MS - 1,
        nowMs: now,
      }),
      true
    );
  });

  it("does not flag stuck while repair is in progress", () => {
    const now = Date.now();
    assert.equal(
      isInstantExportProgressStuck({
        isActive: true,
        lastProgressChangeAtMs: now - INSTANT_EXPORT_STUCK_MS - 1,
        nowMs: now,
        repairInProgress: true,
      }),
      false
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferFailedExportDisplayProgress,
  inferFailedExportStage,
  resolveExportFailureDiagnostics,
  userSafeExportFailureKey,
} from "@/lib/instant-premium-export-failure";

describe("instant premium export failure diagnostics", () => {
  it("infers merge failure progress at 70% when export progress is 0", () => {
    assert.equal(
      inferFailedExportDisplayProgress({
        failureReason: "merge_failed",
        exportProgress: 0,
        exportStatus: "failed",
      }),
      70
    );
  });

  it("infers upload failure at 85%", () => {
    assert.equal(
      inferFailedExportDisplayProgress({
        failureReason: "export_upload_auth_failed",
        exportProgress: 0,
        exportStatus: "failed",
      }),
      85
    );
  });

  it("maps overlay failure to poster stage", () => {
    const stage = inferFailedExportStage({
      failureReason: "overlay_failed",
      displayProgress: 75,
      exportStatus: "failed_overlay",
    });
    assert.equal(stage, "poster_compositing");
  });

  it("surfaces rebuild failure with export error", () => {
    const diag = resolveExportFailureDiagnostics({
      projectId: "p1",
      projectStatus: "completed",
      failureReason: "merge_failed",
      overlayFailed: false,
      instantFinalRebuildStatus: "failed",
      instantWorkerJobStatus: "failed",
      lastOverlayError: null,
      export: {
        id: "e1",
        status: "completed",
        progress: 70,
        errorMessage: "FFmpeg concat exited 1",
        provider: "instant-local-ffmpeg",
      },
    });
    assert.ok(diag);
    assert.equal(diag.exportLastError, "FFmpeg concat exited 1");
    assert.equal(diag.finalRebuildFailed, true);
    assert.equal(diag.isExportFailure, true);
    assert.equal(diag.displayProgress, 70);
  });

  it("picks user-safe keys per failure reason", () => {
    assert.equal(userSafeExportFailureKey("overlay_failed"), "instant.exportFailure.overlay");
    assert.equal(userSafeExportFailureKey("merge_failed", true), "instant.exportFailure.rebuild");
  });
});

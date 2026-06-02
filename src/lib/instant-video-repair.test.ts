import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeVideoRepairAudit,
  readVideoRepairAudit,
  resolveVideoRepairStageFromExport,
} from "@/lib/instant-video-repair";

describe("instant-video-repair", () => {
  it("maps export stage to repair stage labels", () => {
    assert.equal(
      resolveVideoRepairStageFromExport({
        repairRunning: true,
        exportProgress: 12,
        exportStatus: "rendering",
        projectStatus: "rendering",
        finalExportStage: "download_segments",
      }),
      "checking_source"
    );
    assert.equal(
      resolveVideoRepairStageFromExport({
        repairRunning: true,
        exportProgress: 60,
        exportStatus: "rendering",
        projectStatus: "rendering",
        finalExportStage: "overlay",
      }),
      "reapplying_texts"
    );
    assert.equal(
      resolveVideoRepairStageFromExport({
        repairRunning: true,
        exportProgress: 95,
        exportStatus: "rendering",
        projectStatus: "rendering",
        finalExportStage: "upload",
      }),
      "uploading_final"
    );
  });

  it("stores repair audit in instantFinalRebuildAuditJson", () => {
    const merged = mergeVideoRepairAudit(null, {
      status: "running",
      stage: "started",
      startedAt: "2026-06-02T10:00:00.000Z",
      updatedAt: "2026-06-02T10:00:01.000Z",
      source: "repair-api",
    });
    const audit = readVideoRepairAudit(merged);
    assert.equal(audit?.status, "running");
    assert.equal(audit?.stage, "started");
    assert.equal(audit?.source, "repair-api");
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildRepairAdminStatusFields,
  INSTANT_REPAIR_STATUS_STALE_MS,
  isRepairStatusStale,
  resolveRepairWorkerStatusKey,
  resolveVideoRepairStepIndex,
  VIDEO_REPAIR_STEP_COUNT,
} from "@/lib/instant-video-repair-display";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("instant-video-repair-display", () => {
  it("maps repair stages to 1..4 step index", () => {
    assert.equal(resolveVideoRepairStepIndex("checking_source"), 1);
    assert.equal(resolveVideoRepairStepIndex("preparing_clean"), 2);
    assert.equal(resolveVideoRepairStepIndex("reapplying_texts"), 3);
    assert.equal(resolveVideoRepairStepIndex("uploading_final"), 4);
    assert.equal(VIDEO_REPAIR_STEP_COUNT, 4);
  });

  it("flags stale repair status after 30 seconds", () => {
    const now = 1_000_000;
    assert.equal(isRepairStatusStale(now - INSTANT_REPAIR_STATUS_STALE_MS - 1, now), true);
    assert.equal(isRepairStatusStale(now - 10_000, now), false);
  });

  it("builds admin status fields from snapshot", () => {
    const fields = buildRepairAdminStatusFields({
      activeOperation: "repair",
      workerJobStatus: "running",
      videoRepairStage: "checking_source",
      videoRepairUpdatedAt: "2026-06-02T12:00:00.000Z",
      progressPercent: 72,
      exportStatus: "rendering",
      repairAdminDetail: {
        stage: "checking_source",
        exportProgress: 72,
        exportStatus: "rendering",
        updatedAt: "2026-06-02T12:00:00.000Z",
      },
    } as never);
    assert.equal(fields.activeOperation, "repair");
    assert.equal(fields.workerJobStatus, "running");
    assert.equal(fields.repairStage, "checking_source");
    assert.match(fields.exportProgress, /72%/);
    assert.equal(fields.lastRepairUpdate, "2026-06-02T12:00:00.000Z");
  });

  it("resolves worker status key from worker job", () => {
    assert.equal(
      resolveRepairWorkerStatusKey({ workerJobStatus: "queued" } as never),
      "instant.videoRepair.workerQueued"
    );
    assert.equal(
      resolveRepairWorkerStatusKey({ workerJobStatus: "running" } as never),
      "instant.videoRepair.executing"
    );
  });

  it("InstantVideoRepairCard shows step progress, last update, and still-busy message", () => {
    const src = readFileSync(
      join(__dirname, "../components/instant/instant-video-repair-card.tsx"),
      "utf8"
    );
    assert.match(src, /instant\.videoRepair\.stepProgress/);
    assert.match(src, /instant\.progress\.lastUpdatedPrefix/);
    assert.match(src, /resolveRepairWorkerStatusKey/);
    assert.match(src, /instant\.videoRepair\.stillBusy/);
    assert.match(src, /INSTANT_REPAIR_STATUS_STALE_MS/);
    assert.match(src, /instant\.videoRepair\.admin\.activeOperation/);
    assert.match(src, /lastPolledAtMs/);
    assert.match(src, /lastProgressChangeAtMs/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  clipsReadyForFinalizeRepair,
  detectFinalizationStuck,
  FINALIZATION_STUCK_MS,
  isExportMergeStuck,
  isWorkerJobStuck,
  REPAIR_MERGE_START_PROGRESS,
} from "./finalize-repair";

describe("detectFinalizationStuck", () => {
  const now = Date.now();
  const old = new Date(now - FINALIZATION_STUCK_MS - 60_000);
  const recent = new Date(now - 60_000);

  const completedTransitions = [
    { status: "completed", outputVideoUrl: "https://cdn.example/a.mp4" },
    { status: "completed", outputVideoUrl: "https://cdn.example/b.mp4" },
  ];

  it("returns not stuck when final export is completed", () => {
    const info = detectFinalizationStuck({
      status: "completed",
      instantWorkerJobStatus: null,
      instantWorkerJobStartedAt: null,
      transitions: completedTransitions,
      exports: [
        {
          status: "completed",
          progress: 100,
          outputVideoUrl: "https://cdn.example/final.mp4",
          updatedAt: old,
        },
      ],
    });
    assert.equal(info.isStuck, false);
    assert.equal(info.shouldAutoRepair, false);
  });

  it("detects export stuck at 70% after threshold", () => {
    const info = detectFinalizationStuck({
      status: "rendering",
      instantWorkerJobStatus: null,
      instantWorkerJobStartedAt: null,
      transitions: completedTransitions,
      exports: [
        {
          status: "rendering",
          progress: 70,
          outputVideoUrl: null,
          updatedAt: old,
        },
      ],
    });
    assert.equal(info.isStuck, true);
    assert.equal(info.shouldAutoRepair, true);
    assert.equal(info.reason, "export_rendering_stuck");
  });

  it("does not auto-repair while merge still in progress window", () => {
    const info = detectFinalizationStuck({
      status: "rendering",
      instantWorkerJobStatus: "running",
      instantWorkerJobStartedAt: recent,
      transitions: completedTransitions,
      exports: [
        {
          status: "rendering",
          progress: 70,
          outputVideoUrl: null,
          updatedAt: recent,
        },
      ],
    });
    assert.equal(info.isStuck, false);
    assert.equal(info.mergeInProgress, true);
    assert.equal(info.shouldAutoRepair, false);
  });

  it("clipsReadyForFinalizeRepair ignores stale story rows without primary video", () => {
    assert.equal(
      clipsReadyForFinalizeRepair("story", [
        {
          order: 0,
          status: "completed",
          outputVideoUrl: "https://blob.example.com/segment-1.mp4",
        },
        { order: 1, status: "completed", outputVideoUrl: null },
      ]),
      true
    );
    assert.equal(
      clipsReadyForFinalizeRepair("story", [
        { order: 0, status: "queued", outputVideoUrl: null },
        { order: 1, status: "completed", outputVideoUrl: "https://blob.example.com/segment-2.mp4" },
      ]),
      false
    );
  });

  it("clipsReadyForFinalizeRepair requires all segments in transition mode", () => {
    assert.equal(
      clipsReadyForFinalizeRepair("transition", [
        { order: 0, status: "completed", outputVideoUrl: "https://a.mp4" },
        { order: 1, status: "completed", outputVideoUrl: "https://b.mp4" },
      ]),
      true
    );
    assert.equal(
      clipsReadyForFinalizeRepair("transition", [
        { order: 0, status: "completed", outputVideoUrl: "https://a.mp4" },
        { order: 1, status: "queued", outputVideoUrl: null },
      ]),
      false
    );
  });

  it("repair merge restart progress is below stuck merge threshold", () => {
    assert.equal(REPAIR_MERGE_START_PROGRESS, 10);
    assert.ok(REPAIR_MERGE_START_PROGRESS < 55);
  });

  it("finalize repair path does not call Vidu", () => {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const src = fs.readFileSync(path.join(root, "instant-premium/finalize-repair.ts"), "utf8");
    assert.ok(!src.includes("triggerVidu"));
    assert.ok(!src.includes("createVidu"));
    assert.ok(src.includes("ensureStoryModeTransitionRows"));
    assert.ok(src.includes("resetInstantRepairExportState"));
  });

  it("detects worker job stuck", () => {
    assert.equal(
      isWorkerJobStuck({
        instantWorkerJobStatus: "running",
        instantWorkerJobStartedAt: old,
      }),
      true
    );
    assert.equal(
      isExportMergeStuck({
        status: "rendering",
        progress: 70,
        updatedAt: old,
      }),
      true
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FINALIZATION_STUCK_MS,
  detectFinalizationStuck,
  isExportMergeStuck,
  isWorkerJobStuck,
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  finalizeRebuildAssemblyTrace,
  startRebuildAssemblyTrace,
  upsertRebuildSegmentTrace,
} from "@/server/instant-premium/rebuild-assembly-trace";
import { validateRebuildFinalOutput } from "@/server/instant-premium/rebuild-output-validation";

describe("validateRebuildFinalOutput", () => {
  it("fails when middle segment missing from concat trace", async () => {
    const projectId = "test-missing-middle";
    startRebuildAssemblyTrace({
      projectId,
      rebuildId: "r1",
      workspacePath: "/tmp/ws",
      previousFinalHash: null,
    });
    upsertRebuildSegmentTrace(projectId, {
      transitionId: "t0",
      segmentIndex: 0,
      sourceVideoUrl: "https://x/0.mp4",
      downloadedFilePath: "/tmp/0.mp4",
      downloadedFileHash: "a".repeat(64),
      concatInputPath: "/tmp/concat-0.mp4",
      concatInputHash: "a".repeat(64),
      durationSec: 5,
    });
    upsertRebuildSegmentTrace(projectId, {
      transitionId: "t2",
      segmentIndex: 2,
      sourceVideoUrl: "https://x/2.mp4",
      downloadedFilePath: "/tmp/2.mp4",
      downloadedFileHash: "c".repeat(64),
      concatInputPath: "/tmp/concat-2.mp4",
      concatInputHash: "c".repeat(64),
      durationSec: 5,
    });

    const result = await validateRebuildFinalOutput({
      projectId,
      finalOutputPath: "/nonexistent/final.mp4",
      expectedSegmentCount: 3,
      perSegmentDurationSec: 5,
    });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("middle segment")));
    assert.equal(result.middleSegmentInConcat, false);
  });
});

describe("finalizeRebuildAssemblyTrace metadata", () => {
  it("stores rebuild candidate url on trace", () => {
    const projectId = "test-candidate-meta";
    startRebuildAssemblyTrace({
      projectId,
      rebuildId: "r2",
      workspacePath: "/tmp/ws2",
      previousFinalHash: "prev",
    });
    const trace = finalizeRebuildAssemblyTrace(projectId, {
      rebuildCandidateUrl: "https://blob.example/candidate.mp4",
      validationOk: true,
      validationErrors: [],
    });
    assert.equal(trace?.rebuildCandidateUrl, "https://blob.example/candidate.mp4");
    assert.equal(trace?.validationOk, true);
  });
});

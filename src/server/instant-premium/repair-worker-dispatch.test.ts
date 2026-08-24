import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { clipsReadyForFinalizeRepair } from "@/server/instant-premium/finalize-repair";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("repair worker dispatch", () => {
  it("finalize repair exposes awaited worker dispatch helper", () => {
    const src = readFileSync(join(__dirname, "finalize-repair.ts"), "utf8");
    assert.match(src, /dispatchInstantPremiumWorkerMerge/);
    assert.match(src, /requestWorkerInstantPremiumProcess/);
    // running is set only after worker acknowledgement (not before invoke)
    assert.match(src, /"completed" : "running"/);
    assert.match(src, /instantWorkerJobStatus: "queued"/);
  });

  it("worker job sets running before merge when clips are complete", () => {
    const src = readFileSync(join(__dirname, "worker-job.ts"), "utf8");
    assert.match(src, /transitionsAllCompleted/);
    assert.match(src, /instantWorkerJobStatus: "running"/);
    assert.match(src, /executeInstantPremiumMerge/);
  });

  it("repair with all segment URLs is merge-eligible without Vidu", () => {
    assert.equal(
      clipsReadyForFinalizeRepair("transition", [
        { order: 0, status: "completed", outputVideoUrl: "https://blob/a.mp4" },
        { order: 1, status: "completed", outputVideoUrl: "https://blob/b.mp4" },
      ]),
      true
    );
  });

  it("finalize repair orchestrate awaits worker dispatch in-request", () => {
    const src = readFileSync(join(__dirname, "finalize-repair.ts"), "utf8");
    assert.match(src, /runFinalExportToCompletion/);
    assert.match(src, /merge_completion_poll_failed/);
    assert.match(src, /await_dispatch_in_request/);
    assert.match(src, /FINAL_MERGE_DISPATCH_START/);
    assert.match(src, /markFinalMergeDispatchFailed/);
    assert.match(src, /claimFinalMergeQueued/);
    assert.match(src, /await dispatchInstantPremiumWorkerMerge/);
  });

  it("status route allows long enough maxDuration for in-request merge handoff", () => {
    const src = readFileSync(
      join(__dirname, "../../app/api/instant-premium/projects/[id]/status/route.ts"),
      "utf8"
    );
    assert.match(src, /export const maxDuration = 300/);
  });

  it("reconcile re-dispatches stale queued repair when clips exist", () => {
    const src = readFileSync(join(__dirname, "reconcile-video-repair.ts"), "utf8");
    assert.match(src, /stale_queued_redispatch|stale_running_redispatch/);
    assert.match(src, /dispatchInstantPremiumWorkerMerge/);
  });
});

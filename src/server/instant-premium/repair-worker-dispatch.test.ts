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
    assert.match(src, /instantWorkerJobStatus: "running"/);
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

  it("finalize repair orchestrate polls after worker dispatch", () => {
    const src = readFileSync(join(__dirname, "finalize-repair.ts"), "utf8");
    assert.match(src, /runFinalExportToCompletion/);
    assert.match(src, /merge_completion_poll_failed/);
    assert.ok(
      src.includes("await pollCompletion()") || src.includes("await runFinalExportToCompletion")
    );
  });

  it("reconcile re-dispatches stale queued repair when clips exist", () => {
    const src = readFileSync(join(__dirname, "reconcile-video-repair.ts"), "utf8");
    assert.match(src, /stale_queued_redispatch|stale_running_redispatch/);
    assert.match(src, /dispatchInstantPremiumWorkerMerge/);
  });
});

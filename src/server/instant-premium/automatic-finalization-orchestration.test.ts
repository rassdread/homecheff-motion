import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  clipsReadyForFinalizeRepair,
  detectFinalizationStuck,
  FINALIZATION_STUCK_MS,
} from "@/server/instant-premium/finalize-repair";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname);

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("automatic finalization orchestration contract", () => {
  const segmentsReady = [
    { order: 0, status: "completed", outputVideoUrl: "https://blob/a.mp4" },
    { order: 1, status: "completed", outputVideoUrl: "https://blob.b/b.mp4" },
  ];

  it("1–2: provider segments complete → finalization eligible (clips ready)", () => {
    assert.equal(clipsReadyForFinalizeRepair("transition", segmentsReady), true);
  });

  it("3–4: dispatch writes queued before ack; failure clears immortal running", () => {
    const src = read("finalize-repair.ts");
    assert.match(src, /FINAL_MERGE_DISPATCH_START/);
    assert.match(src, /FINAL_MERGE_DISPATCH_ACCEPTED|FINAL_MERGE_WORKER_COMPLETED/);
    assert.match(src, /FINAL_MERGE_DISPATCH_FAILED/);
    assert.match(src, /markFinalMergeDispatchFailed/);
    assert.match(src, /"completed" : "running"/);
    const dispatchFn = src.slice(src.indexOf("export async function dispatchInstantPremiumWorkerMerge"));
    const queuedBeforeRequest =
      dispatchFn.indexOf('instantWorkerJobStatus: "queued"') <
      dispatchFn.indexOf("requestWorkerInstantPremiumProcess");
    assert.equal(queuedBeforeRequest, true);
  });

  it("5–8: claim + stale lease semantics prevent duplicate / immortal running", () => {
    const src = read("finalize-repair.ts");
    assert.match(src, /claimFinalMergeQueued/);
    assert.match(src, /FINAL_MERGE_CLAIMED/);
    assert.match(src, /FINAL_MERGE_CLAIM_SKIPPED/);
    assert.match(src, /false_running_export_idle/);

    const now = Date.now();
    const recent = new Date(now - 30_000);
    const stale = new Date(now - FINALIZATION_STUCK_MS - 1_000);
    const base = {
      status: "rendering",
      transitions: segmentsReady.map(({ status, outputVideoUrl }) => ({
        status,
        outputVideoUrl,
      })),
      exports: [
        {
          status: "pending",
          progress: 0,
          outputVideoUrl: null,
          updatedAt: recent,
        },
      ],
    };

    const active = detectFinalizationStuck({
      ...base,
      instantWorkerJobStatus: "queued",
      instantWorkerJobStartedAt: recent,
    });
    assert.equal(active.mergeInProgress, true);
    assert.equal(active.shouldAutoRepair, false);

    const staleLease = detectFinalizationStuck({
      ...base,
      instantWorkerJobStatus: "running",
      instantWorkerJobStartedAt: stale,
      exports: [
        {
          status: "pending",
          progress: 0,
          outputVideoUrl: null,
          updatedAt: stale,
        },
      ],
    });
    assert.equal(staleLease.shouldAutoRepair, true);
    assert.equal(staleLease.mergeInProgress, false);
  });

  it("9–10 / 20: recovery / repair path does not call Vidu or OpenAI generation", () => {
    const repair = read("start-instant-video-repair.ts");
    const finalize = read("finalize-repair.ts");
    for (const src of [repair, finalize]) {
      assert.ok(!/triggerVidu|createVidu|openai\.|images\.generate/i.test(src));
    }
    assert.match(repair, /syncFinalVideoArtifactsFromBlob|orchestrateFinalMerge|dispatchInstantPremiumWorkerMerge/);
  });

  it("11–12: existing final short-circuits; rebuild shares runFinalExportToCompletion", () => {
    const finalize = read("finalize-repair.ts");
    const rebuild = read("rebuild-final-video.ts");
    assert.match(finalize, /isInstantPremiumExportCompleted/);
    assert.match(rebuild, /runFinalExportToCompletion/);
    assert.match(rebuild, /force:\s*true/);
  });

  it("13–15: version/billing safety markers remain on rebuild audit path", () => {
    const rebuild = read("rebuild-final-video.ts");
    assert.match(rebuild, /ProjectRenderVersion|renderVersion|billingImpact|aiCreditsUsed/);
  });

  it("16–18: status path awaits worker dispatch in-request and awaits repair acceptance", () => {
    const finalize = read("finalize-repair.ts");
    const status = read("status-service.ts");
    assert.match(finalize, /await_dispatch_in_request/);
    assert.match(finalize, /await dispatchInstantPremiumWorkerMerge/);
    assert.match(status, /await startInstantVideoRepair/);
    assert.match(status, /await orchestrateFinalMerge/);
    assert.ok(!status.includes("void startInstantVideoRepair(projectId"));
  });

  it("19: stale threshold stays above typical 23s merge and under prior 5min stall", () => {
    assert.ok(FINALIZATION_STUCK_MS > 25_000);
    assert.ok(FINALIZATION_STUCK_MS < 5 * 60_000);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { isInstantVideoRepairInProgress } from "@/server/instant-premium/start-instant-video-repair";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("repair API route returns quickly without awaiting full FFmpeg", () => {
  const route = readFileSync(
    join(__dirname, "../../app/api/instant-premium/projects/[id]/repair-final-video/route.ts"),
    "utf8"
  );
  assert.match(route, /startInstantVideoRepair/);
  assert.doesNotMatch(route, /repairInstantPremiumFinalVideo/);
  assert.doesNotMatch(route, /awaitWorker:\s*true/);
  assert.match(route, /\?\s*202/);
});

test("start repair dispatches worker in background with local fallback", () => {
  const src = readFileSync(join(__dirname, "start-instant-video-repair.ts"), "utf8");
  assert.match(src, /syncFinalVideoArtifactsFromBlob/);
  assert.match(src, /dispatchInstantPremiumWorkerMerge/);
  assert.match(src, /worker_dispatch_fallback_local/);
  assert.match(src, /executeInstantVideoRepairBackground/);
  assert.doesNotMatch(src, /from ["']@\/server\/video-providers\/vidu/);
});

test("repair in progress follows videoRepair audit status", () => {
  const stale = new Date(Date.now() - 10 * 60 * 1000);
  const inProgress = isInstantVideoRepairInProgress({
    instantFinalRebuildAuditJson: {
      videoRepair: {
        status: "running",
        stage: "started",
        startedAt: stale.toISOString(),
        updatedAt: stale.toISOString(),
      },
    },
    instantWorkerJobStatus: "queued",
    instantWorkerJobStartedAt: stale,
    status: "failed",
    transitions: [{ status: "completed", outputVideoUrl: "https://blob/seg.mp4" }],
    exports: [
      {
        status: "rendering",
        progress: 10,
        outputVideoUrl: null,
        updatedAt: stale,
      },
    ],
  });
  assert.equal(inProgress, true);
});

test("duplicate repair click is blocked while merge in progress", () => {
  const recent = new Date();
  const inProgress = isInstantVideoRepairInProgress({
    instantFinalRebuildAuditJson: {
      videoRepair: {
        status: "running",
        stage: "started",
        startedAt: recent.toISOString(),
        updatedAt: recent.toISOString(),
      },
    },
    instantWorkerJobStatus: "running",
    instantWorkerJobStartedAt: recent,
    status: "rendering",
    transitions: [{ status: "completed", outputVideoUrl: "https://blob/seg.mp4" }],
    exports: [
      {
        status: "rendering",
        progress: 20,
        outputVideoUrl: null,
        updatedAt: recent,
      },
    ],
  });
  assert.equal(inProgress, true);
});

test("orchestrateFinalMerge no longer awaits solely because force=true", () => {
  const src = readFileSync(join(__dirname, "finalize-repair.ts"), "utf8");
  assert.doesNotMatch(src, /awaitWorker \|\| options\?\.force/);
});

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

test("start repair uses worker dispatch without blocking awaitWorker", () => {
  const src = readFileSync(join(__dirname, "start-instant-video-repair.ts"), "utf8");
  assert.match(src, /syncFinalVideoArtifactsFromBlob/);
  assert.match(src, /after\s*\(/);
  assert.match(src, /awaitWorker:\s*false/);
  assert.doesNotMatch(src, /from ["']@\/server\/video-providers\/vidu/);
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

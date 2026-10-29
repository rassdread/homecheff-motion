import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { timelineExportStage, timelineExportStageKey } from "@/lib/studio-timeline-export-status";
import { FILM_EXPORT_CONCURRENCY } from "@/server/studio/film-timeline-worker-job";
import { FILM_WORKER_ACCEPT_TIMEOUT_MS } from "@/lib/video-worker-client";

describe("async film export contract", () => {
  it("returns a job from the existing worker without waiting for the MP4", async () => {
    const route = await readFile(
      new URL("../../app/api/studio/projects/[projectId]/timeline/render/route.ts", import.meta.url),
      "utf8",
    );
    const worker = await readFile(new URL("../../../worker/video-worker.ts", import.meta.url), "utf8");
    const client = await readFile(new URL("../../lib/video-worker-client.ts", import.meta.url), "utf8");
    assert.match(route, /export async function GET/);
    assert.match(route, /acceptWorkerFilmTimelineRender/);
    assert.match(route, /readOwnedTimelineDownload/);
    assert.doesNotMatch(route, /billProviderAction|requireStudioCredits/);
    assert.match(client, /FILM_WORKER_ACCEPT_TIMEOUT_MS = 15_000/);
    assert.doesNotMatch(client, /film-timeline[\s\S]*timeout\(180_000\)/);
    assert.match(worker, /finishFilmInBackground/);
    assert.match(worker, /res\.status\(202\)\.json/);
    assert.equal(worker.includes("message: error instanceof Error ? error.message : \"Film export failed.\""), false);
    assert.equal(FILM_EXPORT_CONCURRENCY, 1);
    assert.equal(FILM_WORKER_ACCEPT_TIMEOUT_MS, 15_000);
  });

  it("maps coarse stages and does not invent a percent", () => {
    assert.equal(timelineExportStage("queued", { stage: "preparing" }), "preparing");
    assert.equal(timelineExportStage("processing", { stage: "rendering_scenes" }), "rendering_scenes");
    assert.equal(timelineExportStage("processing", { stage: "processing_audio" }), "processing_audio");
    assert.equal(timelineExportStage("processing", { stage: "finalizing" }), "finalizing");
    assert.equal(timelineExportStage("processing", { stage: "saving" }), "saving");
    assert.equal(timelineExportStage("succeeded", { stage: "saving" }), "completed");
    assert.equal(timelineExportStage("failed", {}), "failed");
    assert.equal(timelineExportStage("cancelled", {}), "cancelled");
    assert.equal(timelineExportStageKey("rendering_scenes"), "studio.workspace.v278.exportRendering");
    assert.equal(timelineExportStage("processing", { percent: 40 }), "preparing");
  });
});

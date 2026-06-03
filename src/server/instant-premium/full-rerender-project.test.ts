import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  detectFullRerenderBlockReason,
  FULL_RERENDER_ALREADY_RUNNING,
  FULL_RERENDER_NOT_READY,
  FULL_RERENDER_WRONG_TYPE,
  resolveImageViduSource,
} from "@/server/instant-premium/full-rerender-project";
import {
  isFullRerenderInProgress,
  mergeFullRerenderAudit,
  readFullRerenderAudit,
} from "@/lib/full-rerender-audit";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("full rerender project", () => {
  it("rejects non-instant project type in service source", () => {
    const src = readFileSync(join(__dirname, "full-rerender-project.ts"), "utf8");
    assert.match(src, /project\.projectType !== "instant_premium"/);
    assert.match(src, /FULL_RERENDER_WRONG_TYPE/);
  });

  it("rejects project without images", () => {
    const src = readFileSync(join(__dirname, "full-rerender-project.ts"), "utf8");
    assert.match(src, /!project\.images\.length/);
    assert.match(src, /no images to rerender/i);
  });

  it("does not depend on ProjectRenderVersion table", () => {
    const src = readFileSync(join(__dirname, "full-rerender-project.ts"), "utf8");
    assert.doesNotMatch(src, /render-version-service/);
    assert.doesNotMatch(src, /createPendingFullRerenderVersion/);
  });

  it("persists provided sceneTexts before rerender", () => {
    const src = readFileSync(join(__dirname, "full-rerender-project.ts"), "utf8");
    assert.match(src, /persistInstantSceneTextsForProject/);
    assert.match(src, /sceneTexts !== undefined/);
  });

  it("archives previous final URL", () => {
    const src = readFileSync(join(__dirname, "full-rerender-project.ts"), "utf8");
    assert.match(src, /instantPreviousFinalVideoUrl: previousFinalVideoUrl/);
    assert.match(src, /previousFinalVideoUrl/);
  });

  it("archives previous transition URLs in audit JSON", () => {
    const audit = mergeFullRerenderAudit(null, {
      rebuildType: "full_rerender",
      status: "running",
      startedAt: "2026-06-03T12:00:00.000Z",
      previousTransitions: [
        { order: 0, outputVideoUrl: "https://blob/seg-0.mp4", providerJobId: "job-1" },
      ],
      newProviderJobsCreated: true,
    });
    const entry = readFullRerenderAudit(audit);
    assert.equal(entry?.previousTransitions?.[0]?.outputVideoUrl, "https://blob/seg-0.mp4");
    assert.equal(entry?.newProviderJobsCreated, true);
    assert.equal(entry?.rebuildType, "full_rerender");
  });

  it("resets all transitions to queued and clears provider fields", () => {
    const src = readFileSync(join(__dirname, "full-rerender-project.ts"), "utf8");
    assert.match(src, /status: "queued"/);
    assert.match(src, /providerJobId: null/);
    assert.match(src, /outputVideoUrl: null/);
    assert.match(src, /errorMessage: null/);
    assert.match(src, /progress: 0/);
  });

  it("calls startProjectJobs", () => {
    const src = readFileSync(join(__dirname, "full-rerender-project.ts"), "utf8");
    assert.match(src, /await startProjectJobs\(projectId\)/);
  });

  it("blocks while rebuild/repair/generation is running", () => {
    assert.equal(
      detectFullRerenderBlockReason({
        status: "rendering",
        instantFinalRebuildStatus: "running",
        instantFinalRebuildAuditJson: null,
        instantWorkerJobStatus: null,
        instantWorkerJobStartedAt: null,
        transitions: [],
        exports: [],
      }),
      "A text rebuild is already running."
    );

    assert.equal(
      detectFullRerenderBlockReason({
        status: "generating",
        instantFinalRebuildStatus: null,
        instantFinalRebuildAuditJson: {
          fullRerender: {
            rebuildType: "full_rerender",
            status: "running",
            startedAt: "2026-06-03T12:00:00.000Z",
            newProviderJobsCreated: true,
          },
        },
        instantWorkerJobStatus: null,
        instantWorkerJobStartedAt: null,
        transitions: [],
        exports: [],
      }),
      "A full rerender is already in progress."
    );

    assert.equal(
      detectFullRerenderBlockReason({
        status: "generating",
        instantFinalRebuildStatus: null,
        instantFinalRebuildAuditJson: null,
        instantWorkerJobStatus: null,
        instantWorkerJobStartedAt: null,
        transitions: [{ status: "generating", providerJobId: "job-1", outputVideoUrl: null }],
        exports: [],
      }),
      "Video generation is still in progress."
    );
  });

  it("API returns progressRoute", () => {
    const route = readFileSync(
      join(__dirname, "../../app/api/instant-premium/projects/[id]/full-rerender/route.ts"),
      "utf8"
    );
    const service = readFileSync(join(__dirname, "full-rerender-project.ts"), "utf8");
    assert.match(route, /fullRerenderInstantPremiumProjectWithStatus/);
    assert.match(service, /progressRoute:/);
    assert.match(service, /\/animate\/instant\/progress\?projectId=/);
  });

  it("resolveImageViduSource prefers viduInputUrl then previewUrl then storageKey", () => {
    assert.equal(
      resolveImageViduSource({
        viduInputUrl: "https://vidu.example/a.jpg",
        previewUrl: "https://preview.example/a.jpg",
        storageKey: "images/a.jpg",
      }),
      "https://vidu.example/a.jpg"
    );
    assert.equal(
      resolveImageViduSource({
        viduInputUrl: null,
        previewUrl: "https://preview.example/a.jpg",
        storageKey: "images/a.jpg",
      }),
      "https://preview.example/a.jpg"
    );
    assert.equal(
      resolveImageViduSource({
        viduInputUrl: null,
        previewUrl: null,
        storageKey: null,
      }),
      null
    );
  });

  it("marks language exports as needing refresh on start", () => {
    const src = readFileSync(join(__dirname, "full-rerender-project.ts"), "utf8");
    assert.match(src, /markLanguageExportsNeedsRefresh/);
  });

  it("exports stable error codes", () => {
    assert.equal(FULL_RERENDER_ALREADY_RUNNING, "FULL_RERENDER_ALREADY_RUNNING");
    assert.equal(FULL_RERENDER_NOT_READY, "FULL_RERENDER_NOT_READY");
    assert.equal(FULL_RERENDER_WRONG_TYPE, "FULL_RERENDER_WRONG_TYPE");
  });

  it("detects in-progress full rerender audit", () => {
    assert.equal(
      isFullRerenderInProgress({
        fullRerender: {
          rebuildType: "full_rerender",
          status: "running",
          startedAt: "2026-06-03T12:00:00.000Z",
          newProviderJobsCreated: true,
        },
      }),
      true
    );
    assert.equal(
      isFullRerenderInProgress({
        fullRerender: {
          rebuildType: "full_rerender",
          status: "completed",
          startedAt: "2026-06-03T12:00:00.000Z",
          newProviderJobsCreated: true,
        },
      }),
      false
    );
  });

  it("client exposes postFullRerenderInstantProject helper", () => {
    const client = readFileSync(join(__dirname, "../../lib/instant-export-client.ts"), "utf8");
    assert.match(client, /export async function postFullRerenderInstantProject/);
    assert.match(client, /full-rerender/);
  });

  it("final commit clears running full rerender audit", () => {
    const commit = readFileSync(
      join(__dirname, "../instant-premium/final-video-export-commit.ts"),
      "utf8"
    );
    assert.match(commit, /isFullRerenderInProgress/);
    assert.match(commit, /clearRunningFullRerenderAudit/);
    assert.match(commit, /status: "completed"/);
  });

  it("segment failure marks full rerender audit failed", () => {
    const jobs = readFileSync(join(__dirname, "../animation-jobs/service.ts"), "utf8");
    assert.match(jobs, /markFullRerenderFailedIfRunning/);
  });

  it("merge failure marks full rerender audit failed", () => {
    const merge = readFileSync(join(__dirname, "../instant-premium/merge-instant-project.ts"), "utf8");
    assert.match(merge, /markFullRerenderFailedIfRunning/);
  });

  it("text-only rerender does not call Vidu or startProjectJobs", () => {
    const rebuild = readFileSync(
      join(__dirname, "../instant-premium/rebuild-final-video.ts"),
      "utf8"
    );
    assert.match(rebuild, /newProviderJobsCreated: false/);
    assert.doesNotMatch(rebuild, /startProjectJobs/);
    assert.doesNotMatch(rebuild, /getVideoProvider/);
  });

  it("archives previous final URL without deleting it on rerender start", () => {
    const src = readFileSync(join(__dirname, "full-rerender-project.ts"), "utf8");
    assert.match(src, /instantPreviousFinalVideoUrl: previousFinalVideoUrl/);
    assert.doesNotMatch(src, /scheduleDeleteOldFinalBlob/);
  });
});

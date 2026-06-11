/**
 * Async editor segment click job contracts.
 * Run: npx tsx --test src/lib/editor-segment-click-job.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  createEditorSegmentClickJob,
  getEditorSegmentClickJob,
  markEditorSegmentClickJobReady,
  markEditorSegmentClickJobRunning,
  resolveStaleEditorSegmentClickJob,
} from "@/server/editor/editor-segment-click-job-store";
import {
  EDITOR_JOB_CLICK_DEADLINE_MS,
  EDITOR_JOB_REPLICATE_TIMEOUT_MS,
  EDITOR_CLICK_ROUTE_DEADLINE_MS,
} from "@/server/editor/replicate-sam3-editor-segment";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("editor segment click async job", () => {
  it("job store creates queued job with required fields", () => {
    const job = createEditorSegmentClickJob({
      userId: "user-1",
      sessionId: "sess-1",
      prompt: "globe",
      imageUrl: "https://example.com/globe.png",
      clickPoint: { x: 0.5, y: 0.18 },
      parentLayerId: "parent-1",
      editorObjectId: "child-1",
      createCutout: true,
    });
    assert.equal(job.status, "queued");
    assert.equal(job.prompt, "globe");
    assert.ok(job.jobId);
    const loaded = getEditorSegmentClickJob(job.jobId);
    assert.equal(loaded?.status, "queued");
    markEditorSegmentClickJobRunning(job.jobId);
    markEditorSegmentClickJobReady(job.jobId, {
      maskUrl: "https://blob.example/mask.png",
      boundingBox: { x: 0.3, y: 0.1, width: 0.4, height: 0.4 },
      polygon: [],
    });
    const ready = getEditorSegmentClickJob(job.jobId);
    assert.equal(ready?.status, "ready");
    assert.ok(ready?.result?.maskUrl);
  });

  it("async job timeouts exceed sync route budget", () => {
    assert.ok(EDITOR_JOB_REPLICATE_TIMEOUT_MS > EDITOR_CLICK_ROUTE_DEADLINE_MS);
    assert.ok(EDITOR_JOB_CLICK_DEADLINE_MS > EDITOR_JOB_REPLICATE_TIMEOUT_MS);
  });

  it("start route returns jobId quickly and schedules runner", () => {
    const start = read("src/app/api/editor/segment/click/start/route.ts");
    assert.match(start, /createEditorSegmentClickJob/);
    assert.match(start, /scheduleEditorSegmentClickJob/);
    assert.match(start, /status: "queued"/);
    assert.match(start, /jobId: job\.jobId/);
  });

  it("status route returns ready or failed with retryable flag", () => {
    const status = read("src/app/api/editor/segment/click/status/route.ts");
    assert.match(status, /searchParams\.get\("jobId"\)/);
    assert.match(status, /status: "ready"/);
    assert.match(status, /retryable/);
  });

  it("workspace prompt flow uses start + poll not sync click", () => {
    const workspace = read("src/components/editor/editor-canvas-workspace.tsx");
    assert.match(workspace, /startEditorSegmentClickJob/);
    assert.match(workspace, /pollEditorSegmentClickJob/);
    assert.match(workspace, /runPromptSubLayerSegmentation[\s\S]*startEditorSegmentClickJob/);
  });

  it("sync click route remains for compatibility", () => {
    const click = read("src/app/api/editor/segment/click/route.ts");
    assert.match(click, /segmentByClick/);
  });

  it("provider supports asyncJob extended deadlines", () => {
    const provider = read("src/server/editor/editor-segmentation-provider.ts");
    assert.match(provider, /asyncJob/);
    assert.match(provider, /EDITOR_JOB_REPLICATE_TIMEOUT_MS/);
    assert.match(provider, /replicate_prediction_start/);
    assert.match(provider, /replicate_prediction_complete/);
  });

  it("client poll config matches sprint bounds", () => {
    const client = read("src/lib/editor-segment-click-job-client.ts");
    assert.match(client, /EDITOR_SEGMENT_JOB_POLL_MS = 1_800/);
    assert.match(client, /EDITOR_SEGMENT_JOB_MAX_WAIT_MS = 90_000/);
  });

  it("stale queued/running jobs resolve to timeout", () => {
    const job = createEditorSegmentClickJob({
      userId: "user-1",
      sessionId: "sess-1",
      prompt: "globe",
      imageUrl: "https://example.com/globe.png",
      clickPoint: { x: 0.5, y: 0.18 },
      parentLayerId: null,
      editorObjectId: "child-1",
      createCutout: true,
    });
    const g = globalThis as { editorSegmentClickJobs?: Map<string, typeof job> };
    const stored = g.editorSegmentClickJobs?.get(job.jobId);
    if (stored) {
      g.editorSegmentClickJobs?.set(job.jobId, {
        ...stored,
        createdAt: Date.now() - EDITOR_JOB_CLICK_DEADLINE_MS - 20_000,
      });
    }
    const resolved = resolveStaleEditorSegmentClickJob(job.jobId);
    assert.equal(resolved?.status, "timeout");
  });

  it("production logging helper and runner orphan guard exist", () => {
    const log = read("src/server/editor/editor-segment-click-job-log.ts");
    assert.match(log, /\[editor-segment-job\]/);
    assert.match(log, /jobId/);
    assert.match(log, /finalResult/);
    const runner = read("src/server/editor/editor-segment-click-job-runner.ts");
    assert.match(runner, /markJobOrphanedTimeout/);
    assert.match(runner, /logEditorSegmentJob/);
  });

  it("status route resolves stale jobs before responding", () => {
    const status = read("src/app/api/editor/segment/click/status/route.ts");
    assert.match(status, /resolveStaleEditorSegmentClickJob/);
    assert.match(status, /logEditorSegmentJob/);
  });

  it("workspace clears segment job UI in finally (no stuck banner)", () => {
    const workspace = read("src/components/editor/editor-canvas-workspace.tsx");
    const fnStart = workspace.indexOf("const runPromptSubLayerSegmentation");
    const fnEnd = workspace.indexOf("const handleClickSegmentObject", fnStart);
    assert.ok(fnStart >= 0 && fnEnd > fnStart);
    const fnBody = workspace.slice(fnStart, fnEnd);
    assert.match(fnBody, /clearSegmentJobUi/);
    assert.match(fnBody, /finally[\s\S]*clearSegmentJobUi/);
    assert.match(fnBody, /startEditorSegmentClickJob/);
    assert.match(fnBody, /pollEditorSegmentClickJob/);
    assert.doesNotMatch(fnBody, /postEditorSegmentClick/);
  });
});

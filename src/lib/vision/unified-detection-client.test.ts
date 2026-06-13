import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  resetUnifiedDetectionMetricsForTests,
  getUnifiedDetectionMetricsSnapshot,
  recordUnifiedDetectionMetric,
} from "@/lib/vision/unified-detection-metrics";
import {
  buildUnifiedDetectionLabels,
  toUnifiedDetectionStatus,
} from "@/lib/vision/unified-detection-types";
import { shouldUseWorkerDetectionBackend } from "@/lib/vision/unified-detection-client";
import { buildEditorDetectionMeta } from "@/lib/editor-detection-meta";

describe("unified detection types", () => {
  it("buildUnifiedDetectionLabels deduplicates labels", () => {
    const labels = buildUnifiedDetectionLabels([
      { label: "person", confidence: 0.9, box: { x: 0, y: 0, width: 0.2, height: 0.4 } },
      { label: "person", confidence: 0.8, box: { x: 0.5, y: 0, width: 0.2, height: 0.4 } },
      { label: "tie", confidence: 0.7, box: { x: 0.3, y: 0.4, width: 0.1, height: 0.2 } },
    ]);
    assert.deepEqual(labels, ["person", "tie"]);
  });

  it("toUnifiedDetectionStatus maps worker success to active", () => {
    assert.equal(
      toUnifiedDetectionStatus({
        failed: false,
        backend: "video-worker",
        detections: [{ label: "person", confidence: 0.9, box: { x: 0, y: 0, width: 0.1, height: 0.1 } }],
      }),
      "active"
    );
  });
});

describe("unified detection metrics", () => {
  beforeEach(() => resetUnifiedDetectionMetricsForTests());
  afterEach(() => resetUnifiedDetectionMetricsForTests());

  it("records worker inference metrics", () => {
    recordUnifiedDetectionMetric({
      backend: "video-worker",
      consumer: "editor",
      detectionCount: 3,
      inferenceMs: 420,
    });
    const snapshot = getUnifiedDetectionMetricsSnapshot();
    assert.equal(snapshot.inferenceCount, 1);
    assert.equal(snapshot.workerInferenceCount, 1);
    assert.equal(snapshot.lastBackend, "video-worker");
    assert.equal(snapshot.averageInferenceMs, 420);
  });
});

describe("shouldUseWorkerDetectionBackend", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ["VERCEL", "VIDEO_RENDER_MODE", "VIDEO_WORKER_BASE_URL"]) {
      saved[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("returns true on Vercel with worker mode configured", () => {
    process.env.VERCEL = "1";
    process.env.VIDEO_RENDER_MODE = "worker";
    process.env.VIDEO_WORKER_BASE_URL = "https://homecheff-motion.onrender.com";
    assert.equal(shouldUseWorkerDetectionBackend(), true);
  });

  it("returns false without worker URL", () => {
    delete process.env.VERCEL;
    delete process.env.VIDEO_RENDER_MODE;
    delete process.env.VIDEO_WORKER_BASE_URL;
    assert.equal(shouldUseWorkerDetectionBackend(), false);
  });
});

describe("buildEditorDetectionMeta", () => {
  it("marks worker success as active with onnxAvailable", () => {
    const meta = buildEditorDetectionMeta({
      detection: {
        detections: [{ label: "person", confidence: 0.9, box: { x: 0, y: 0, width: 0.2, height: 0.5 } }],
        available: true,
        backend: "video-worker",
        status: "active",
        inferenceMs: 300,
        detectedAt: "2026-06-13T00:00:00.000Z",
        failed: false,
        detectorKind: "rtdetr",
      },
      source: "hybrid",
      objectCount: 2,
    });
    assert.equal(meta.status, "active");
    assert.equal(meta.backend, "video-worker");
    assert.equal(meta.onnxAvailable, true);
    assert.equal(meta.userMessageKey, undefined);
  });

  it("surfaces fallback message when worker unavailable", () => {
    const meta = buildEditorDetectionMeta({
      detection: {
        detections: [],
        available: false,
        backend: "unavailable",
        status: "unavailable",
        inferenceMs: 12,
        detectedAt: "2026-06-13T00:00:00.000Z",
        failed: true,
        error: "worker down",
      },
      source: "heuristic",
      objectCount: 1,
    });
    assert.equal(meta.userMessageKey, "editor.detectionStatus.unavailable");
  });
});

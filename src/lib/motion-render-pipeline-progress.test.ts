import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMotionRenderPipelineContext,
  buildMotionRenderPipelineStepOrder,
  isMotionRenderPipelineActive,
  resolveMotionRenderPipelineProgress,
} from "@/lib/motion-render-pipeline-progress";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

function baseSnapshot(
  overrides: Partial<InstantPremiumStatusResponse> = {}
): InstantPremiumStatusResponse {
  return {
    projectId: "p1",
    projectType: "instant_premium",
    status: "running",
    phase: "generating_clips",
    progressPercent: 40,
    currentStage: "segment_rendering",
    activeOperation: "segment_rendering",
    segments: [
      { index: 0, status: "generating", sourceImageId: "i1", sourceImageUrl: null, videoUrl: null, durationSeconds: 5, providerTaskId: null, error: null },
      { index: 1, status: "queued", sourceImageId: "i2", sourceImageUrl: null, videoUrl: null, durationSeconds: 5, providerTaskId: null, error: null },
    ],
    finalVideoUrl: null,
    finalDurationSeconds: null,
    downloadable: false,
    errorMessage: null,
    ...overrides,
  };
}

describe("motion render pipeline progress", () => {
  it("builds minimal step order without studio or voice", () => {
    const order = buildMotionRenderPipelineStepOrder(
      buildMotionRenderPipelineContext({})
    );
    assert.deepEqual(order, [
      "load_concept",
      "prepare_segments",
      "render_segments",
      "merge_video",
      "quality_check",
      "save_video",
    ]);
  });

  it("includes studio and voice steps when applicable", () => {
    const order = buildMotionRenderPipelineStepOrder(
      buildMotionRenderPipelineContext({
        hasStudioImport: true,
        voiceEnabled: true,
        subtitlesEnabled: true,
        usesStoryOverlay: true,
      })
    );
    assert.ok(order.includes("analyze_storyboard"));
    assert.ok(order.includes("process_voice"));
    assert.ok(order.includes("process_audio"));
    assert.ok(order.includes("add_subtitles"));
    assert.ok(order.includes("prepare_texts"));
  });

  it("hides voice steps when voice is disabled", () => {
    const order = buildMotionRenderPipelineStepOrder(
      buildMotionRenderPipelineContext({ voiceEnabled: false })
    );
    assert.equal(order.includes("process_voice"), false);
    assert.equal(order.includes("process_audio"), false);
  });

  it("marks segment rendering as active during generating_clips", () => {
    const progress = resolveMotionRenderPipelineProgress({
      snapshot: baseSnapshot({ progressPercent: 35 }),
    });
    assert.equal(progress.phase, "running");
    assert.equal(progress.activeStepId, "render_segments");
    const active = progress.steps.find((s) => s.status === "active");
    assert.equal(active?.id, "render_segments");
    assert.ok(progress.showRenderingMessage);
  });

  it("transitions to merge step during finalizing", () => {
    const progress = resolveMotionRenderPipelineProgress({
      snapshot: baseSnapshot({
        status: "finalizing",
        phase: "merging_clips",
        progressPercent: 74,
        currentStage: "merge_clips",
        segments: [
          { index: 0, status: "completed", sourceImageId: "i1", sourceImageUrl: "u", videoUrl: "u", durationSeconds: 5, providerTaskId: "j", error: null },
        ],
      }),
    });
    assert.equal(progress.activeStepId, "merge_video");
    const merge = progress.steps.find((s) => s.id === "merge_video");
    assert.equal(merge?.status, "active");
    const render = progress.steps.find((s) => s.id === "render_segments");
    assert.equal(render?.status, "completed");
  });

  it("maps completed state to all steps done", () => {
    const progress = resolveMotionRenderPipelineProgress({
      snapshot: baseSnapshot({
        status: "completed",
        phase: "completed",
        progressPercent: 100,
        currentStage: "completed",
      }),
    });
    assert.equal(progress.phase, "completed");
    assert.ok(progress.steps.every((s) => s.status === "completed"));
    assert.equal(progress.showRenderingMessage, false);
  });

  it("maps failed merge to failed merge step", () => {
    const progress = resolveMotionRenderPipelineProgress({
      snapshot: baseSnapshot({
        status: "failed",
        phase: "failed",
        progressPercent: 70,
        currentStage: "failed",
        failedAtStage: "merge_clips",
        exportFailureReason: "merge_failed",
      }),
    });
    assert.equal(progress.phase, "failed");
    assert.equal(progress.failedStepId, "merge_video");
    const failed = progress.steps.find((s) => s.status === "failed");
    assert.equal(failed?.id, "merge_video");
  });

  it("uses finalExportStage overlay for build_overlays step", () => {
    const progress = resolveMotionRenderPipelineProgress({
      snapshot: baseSnapshot({
        status: "finalizing",
        phase: "merging_clips",
        progressPercent: 76,
        currentStage: "export_video",
        finalExportStage: "overlay",
        lockedTextLayerCount: 2,
        instantTextRenderMode: "locked_text",
      }),
      context: buildMotionRenderPipelineContext({
        lockedTextLayerCount: 2,
        instantTextRenderMode: "locked_text",
      }),
    });
    assert.equal(progress.activeStepId, "build_overlays");
  });

  it("story mode context keeps segment rendering step", () => {
    const progress = resolveMotionRenderPipelineProgress({
      snapshot: baseSnapshot({
        renderPipelineContext: {
          instantMode: "story",
          hasStudioImport: false,
          voiceEnabled: false,
          subtitlesEnabled: false,
          hasStoryOverlay: true,
        },
        progressPercent: 25,
      }),
    });
    assert.equal(progress.activeStepId, "render_segments");
  });

  it("provides ETA only during segment rendering with partial completion", () => {
    const progress = resolveMotionRenderPipelineProgress({
      snapshot: baseSnapshot({
        progressPercent: 30,
        segments: [
          { index: 0, status: "completed", sourceImageId: "i1", sourceImageUrl: "u", videoUrl: "u", durationSeconds: 5, providerTaskId: "j", error: null },
          { index: 1, status: "generating", sourceImageId: "i2", sourceImageUrl: null, videoUrl: null, durationSeconds: 5, providerTaskId: "j2", error: null },
          { index: 2, status: "queued", sourceImageId: "i3", sourceImageUrl: null, videoUrl: null, durationSeconds: 5, providerTaskId: null, error: null },
        ],
      }),
    });
    assert.ok(progress.estimatedRemainingSeconds != null);
    assert.ok(progress.estimatedRemainingSeconds >= 30);
  });

  it("does not show ETA during merge phase", () => {
    const progress = resolveMotionRenderPipelineProgress({
      snapshot: baseSnapshot({
        status: "finalizing",
        phase: "merging_clips",
        progressPercent: 80,
        currentStage: "merge_clips",
      }),
    });
    assert.equal(progress.estimatedRemainingSeconds, null);
  });

  it("isMotionRenderPipelineActive is true only while running", () => {
    const running = resolveMotionRenderPipelineProgress({ snapshot: baseSnapshot() });
    assert.equal(isMotionRenderPipelineActive(running), true);
    const done = resolveMotionRenderPipelineProgress({
      snapshot: baseSnapshot({ status: "completed", phase: "completed", currentStage: "completed", progressPercent: 100 }),
    });
    assert.equal(isMotionRenderPipelineActive(done), false);
  });
});

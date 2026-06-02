import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveTextRerenderLocalPhase,
  isLanguageExportProgressActive,
  isTextRerenderProgressActive,
  resolveLanguageExportProgress,
  resolveTextRerenderProgress,
  TEXT_RERENDER_STEP_ORDER,
} from "@/lib/text-language-render-progress";

describe("text-language-render-progress", () => {
  it("maps saving storyboard to step 1 for text rerender", () => {
    const view = resolveTextRerenderProgress({ localPhase: "saving" });
    assert.equal(view.phase, "running");
    assert.equal(view.activeStepId, "saving_storyboard");
    assert.equal(view.steps[0]?.status, "active");
    assert.equal(view.percent, 8);
  });

  it("maps final export overlay stage to building overlay", () => {
    const view = resolveTextRerenderProgress({
      localPhase: "polling",
      finalExportStage: "overlay",
      progressPercent: 74,
      isRebuildingFinalVideo: true,
    });
    assert.equal(view.activeStepId, "building_overlay");
    assert.equal(view.steps[1]?.status, "completed");
    assert.equal(view.steps[2]?.status, "active");
    assert.equal(view.percent, 74);
  });

  it("maps upload stage to assembling video", () => {
    const view = resolveTextRerenderProgress({
      localPhase: "polling",
      finalExportStage: "upload",
      progressPercent: 91,
      isRebuildingFinalVideo: true,
    });
    assert.equal(view.activeStepId, "assembling_video");
    assert.equal(view.percent, 91);
  });

  it("marks failed rebuild on the active pipeline step", () => {
    const view = resolveTextRerenderProgress({
      localPhase: "failed",
      finalExportStage: "overlay",
      rebuildFailed: true,
      errorMessage: "Overlay failed",
    });
    assert.equal(view.phase, "failed");
    assert.equal(view.failedStepId, "building_overlay");
    assert.equal(view.steps[2]?.status, "failed");
    assert.equal(view.errorMessage, "Overlay failed");
  });

  it("completes all text rerender steps when rebuild finishes", () => {
    const view = resolveTextRerenderProgress({ localPhase: "completed" });
    assert.equal(view.phase, "completed");
    assert.equal(view.percent, 100);
    assert.ok(view.steps.every((step) => step.status === "completed"));
    assert.equal(view.steps.length, TEXT_RERENDER_STEP_ORDER.length);
  });

  it("derives local phase from saving and rebuilding flags", () => {
    assert.equal(
      deriveTextRerenderLocalPhase({ savingStoryboard: true, isRebuildingFinalVideo: true }),
      "saving"
    );
    assert.equal(
      deriveTextRerenderLocalPhase({ isRebuildingFinalVideo: true }),
      "polling"
    );
    assert.equal(deriveTextRerenderLocalPhase({ rebuildFailed: true }), "failed");
  });

  it("detects active text rerender progress", () => {
    assert.equal(isTextRerenderProgressActive({ localPhase: "idle" }), false);
    assert.equal(isTextRerenderProgressActive({ localPhase: "polling" }), true);
    assert.equal(
      isTextRerenderProgressActive({ localPhase: "idle", isRebuildingFinalVideo: true }),
      true
    );
  });

  it("maps language export prepare phases to early steps", () => {
    const loading = resolveLanguageExportProgress({
      preparePhase: "loading_layers",
      renderPhase: "idle",
    });
    assert.equal(loading.activeStepId, "loading_source_text");

    const translating = resolveLanguageExportProgress({
      preparePhase: "translating",
      renderPhase: "idle",
    });
    assert.equal(translating.activeStepId, "translating");
    assert.equal(translating.steps[0]?.status, "completed");
  });

  it("skips text protection for story overlay language export render", () => {
    const view = resolveLanguageExportProgress({
      preparePhase: "ready",
      renderPhase: "starting",
      usesStoryOverlay: true,
    });
    assert.equal(view.activeStepId, "building_overlay");
    assert.equal(view.steps[2]?.status, "completed");
  });

  it("advances language export render to assembling after elapsed time", () => {
    const now = Date.now();
    const view = resolveLanguageExportProgress({
      preparePhase: "ready",
      renderPhase: "rendering",
      usesStoryOverlay: false,
      renderStartedAtMs: now - 60_000,
      nowMs: now,
    });
    assert.equal(view.activeStepId, "assembling_video");
  });

  it("marks failed language export on prepare failure", () => {
    const view = resolveLanguageExportProgress({
      preparePhase: "failed",
      renderPhase: "idle",
      errorMessage: "Translation failed",
    });
    assert.equal(view.phase, "failed");
    assert.equal(view.failedStepId, "loading_source_text");
  });

  it("detects active language export progress", () => {
    assert.equal(
      isLanguageExportProgressActive({ preparePhase: "idle", renderPhase: "idle" }),
      false
    );
    assert.equal(
      isLanguageExportProgressActive({ preparePhase: "ready", renderPhase: "rendering" }),
      true
    );
  });
});

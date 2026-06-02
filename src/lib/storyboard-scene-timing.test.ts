import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveInstantPremiumOutputPlan } from "@/lib/instant-premium-output-plan";
import {
  getSceneTimingWindows,
  getSceneTransitionDurationSeconds,
  getStoryTransitionDurationSeconds,
  hasCustomTransitionDurations,
  hasPerSceneDurations,
  normalizeSceneText,
  normalizeStoryboardScenes,
  resolveViduSegmentDurationsFromStoryboard,
  splitSequenceSceneTiming,
} from "@/lib/story-overlay-templates";

describe("storyboard transition timing", () => {
  it("normalizeStoryboardScenes preserves old JSON without durationSeconds", () => {
    const scenes = normalizeStoryboardScenes(
      [{ template: "hero", heroText: "HELLO" }],
      2,
      5
    );
    assert.equal(scenes.length, 2);
    assert.equal(scenes[0]!.heroText, "HELLO");
    assert.equal(scenes[0]!.transitionDurationSeconds, 5);
    assert.equal(scenes[1]!.transitionDurationSeconds, undefined);
  });

  it("hasCustomTransitionDurations is false for legacy heroText only", () => {
    assert.equal(hasCustomTransitionDurations([{ template: "hero", heroText: "A" }]), false);
    assert.equal(hasPerSceneDurations([{ template: "hero", heroText: "A" }]), false);
  });

  it("hasCustomTransitionDurations is true when transition duration is set", () => {
    assert.equal(
      hasCustomTransitionDurations([
        { template: "hero", heroText: "A", transitionDurationSeconds: 7 },
      ]),
      true
    );
  });

  it("getStoryTransitionDurationSeconds sums transitions only (not last frame)", () => {
    const total = getStoryTransitionDurationSeconds(
      [
        { transitionDurationSeconds: 3 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 7 },
      ],
      3,
      5
    );
    assert.equal(total, 8);
  });

  it("legacy durationSeconds on last frame does not add to video length", () => {
    const total = getStoryTransitionDurationSeconds(
      [
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 7 },
        { durationSeconds: 7 },
      ],
      9,
      5
    );
    assert.equal(total, 42);
  });

  it("nine images with eight transitions sums transition durations", () => {
    const scenes = [
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 7 },
      { transitionDurationSeconds: 7 },
      {},
    ];
    assert.equal(resolveViduSegmentDurationsFromStoryboard(scenes, 9, 5).length, 8);
    assert.equal(getStoryTransitionDurationSeconds(scenes, 9, 5), 44);
  });

  it("falls back to transition count times global duration", () => {
    const total = getStoryTransitionDurationSeconds([{ template: "hero", heroText: "A" }], 5, 5);
    assert.equal(total, 20);
  });

  it("getSceneTimingWindows uses transition blocks without scaling", () => {
    const scenes = [
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
    ] as const;
    const windows = getSceneTimingWindows(scenes, 10, 2);
    assert.equal(windows.length, 2);
    assert.ok(Math.abs(windows[0]!.sceneDuration - 5) < 0.01);
    assert.ok(Math.abs(windows[1]!.sceneDuration - 5) < 0.01);
    assert.ok(windows[1]!.end <= 10);
  });

  it("last frame timing window uses previous segment hold when unset", () => {
    const scenes = [
      { transitionDurationSeconds: 3 },
      { transitionDurationSeconds: 7 },
      {},
    ];
    const windows = getSceneTimingWindows(scenes, 17, 3);
    assert.equal(windows.length, 3);
    assert.ok(Math.abs(windows[2]!.storyboardDuration - 7) < 0.01);
    assert.ok(windows[2]!.end > windows[2]!.start);
  });

  it("getSceneTimingWindows keeps equal split without custom transitions", () => {
    const windows = getSceneTimingWindows(
      [{ template: "hero", heroText: "A" }],
      9,
      3
    );
    assert.equal(windows.length, 3);
    assert.equal(windows[0]!.plannedDuration, 3);
  });

  it("splitSequenceSceneTiming reserves finale share", () => {
    const split = splitSequenceSceneTiming(0, 8, true);
    assert.ok(split.linesEnd - split.linesStart > 4);
    assert.ok(split.finaleEnd - split.finaleStart >= 2);
    assert.equal(split.finaleEnd, 8);
  });

  it("output plan aligns storyboard and provider duration in story mode", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 9,
      instantMode: "story",
      transitionSeconds: 5,
      sceneTexts: [
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 7 },
        { transitionDurationSeconds: 7 },
        {},
      ],
    });
    assert.equal(plan.transitionCount, 8);
    assert.equal(plan.providerDurationSeconds, 44);
    assert.equal(plan.storyboardDurationSeconds, 44);
    assert.equal(plan.durationScale, 1);
  });

  it("legacy durationSeconds fallback maps to transition duration", () => {
    assert.equal(getSceneTransitionDurationSeconds({ durationSeconds: 7 }, 5), 7);
    assert.equal(
      getSceneTransitionDurationSeconds({ transitionDurationSeconds: 3, durationSeconds: 7 }, 5),
      3
    );
  });

  it("normalizeSceneText stores heroFinaleText", () => {
    const scene = normalizeSceneText({
      template: "sequence",
      lines: ["One", "Two"],
      heroFinaleText: "FINALE",
    });
    assert.equal(scene.heroFinaleText, "FINALE");
  });
});

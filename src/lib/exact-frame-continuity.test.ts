import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildExactFrameContinuationPromptLine,
  buildSegmentJoinPlan,
  resolveFrameContinuityMode,
  resolveMergeDissolveRatio,
  resolveSegmentJoinMode,
  scoreKeyframePairQuick,
  transitionSecondsForJoinMode,
  transitionSecondsForSimilarity,
} from "@/lib/exact-frame-continuity";

describe("exact frame continuity", () => {
  it("detects same image id as continuation", () => {
    const score = scoreKeyframePairQuick({
      endImageId: "img-2",
      startImageId: "img-2",
      endPreviewUrl: "https://a/2.jpg",
      startPreviewUrl: "https://b/2.jpg",
    });
    assert.equal(score.mode, "continuation");
    assert.equal(score.similarity, 1);
    assert.equal(resolveSegmentJoinMode(1), "direct_micro_stitch");
  });

  it("uses lower dissolve when similarity is high", () => {
    assert.equal(resolveMergeDissolveRatio(0.999), 0.02);
    assert.equal(resolveMergeDissolveRatio(0.996), 0.08);
    assert.ok(resolveMergeDissolveRatio(0.98) >= 0.3);
  });

  it("similarity >= 0.998 chooses direct_micro_stitch", () => {
    assert.equal(resolveSegmentJoinMode(0.998), "direct_micro_stitch");
    assert.equal(resolveSegmentJoinMode(0.9985), "direct_micro_stitch");
  });

  it("similarity 0.995–0.998 chooses optical_micro_blend", () => {
    assert.equal(resolveSegmentJoinMode(0.997), "optical_micro_blend");
    assert.equal(resolveSegmentJoinMode(0.995), "optical_micro_blend");
  });

  it("scales transition duration down for exact match", () => {
    const base = 8 / 30;
    const short = transitionSecondsForSimilarity(base, 0.999);
    const long = transitionSecondsForSimilarity(base, 0.98);
    assert.ok(short < long);
    assert.equal(transitionSecondsForJoinMode(base, "direct_micro_stitch"), 1 / 30);
  });

  it("builds continuation prompt line only in continuation mode", () => {
    assert.ok(buildExactFrameContinuationPromptLine("continuation").includes("Continue existing motion"));
    assert.equal(buildExactFrameContinuationPromptLine("normal"), "");
  });

  it("join plan marks continuation above threshold", () => {
    const plan = buildSegmentJoinPlan({
      segmentA: 0,
      segmentB: 1,
      score: { similarity: 0.997, mode: "continuation", reason: "same_url" },
      baseTransitionSec: 0.27,
    });
    assert.equal(plan.mode, "continuation");
    assert.equal(plan.joinMode, "optical_micro_blend");
    assert.equal(resolveFrameContinuityMode(plan.similarity), "continuation");
  });
});

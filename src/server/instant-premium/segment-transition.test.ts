import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAPCUT_SMOOTH_FRAMES_DEFAULT,
  DEFAULT_SEGMENT_TRANSITION_TYPE,
  getEdgeTrimFrames,
  resolveSegmentTransitionType,
  transitionDurationFrames,
  transitionDurationSeconds,
} from "@/server/instant-premium/segment-transition";

describe("segment transition", () => {
  it("defaults to capcut_smooth", () => {
    assert.equal(resolveSegmentTransitionType(undefined), DEFAULT_SEGMENT_TRANSITION_TYPE);
    assert.equal(DEFAULT_SEGMENT_TRANSITION_TYPE, "capcut_smooth");
  });

  it("reads segmentTransitionType from poster settings", () => {
    assert.equal(
      resolveSegmentTransitionType({ version: 1, segmentTransitionType: "motion_blend" }),
      "motion_blend"
    );
  });

  it("uses 6–10 frame capcut_smooth overlap", () => {
    assert.equal(transitionDurationFrames("capcut_smooth"), CAPCUT_SMOOTH_FRAMES_DEFAULT);
    const sec = transitionDurationSeconds("capcut_smooth");
    assert.ok(sec >= 6 / 30 && sec <= 10 / 30);
  });

  it("trims duplicate edge frames for middle segments", () => {
    assert.deepEqual(getEdgeTrimFrames(0, 3, "capcut_smooth"), { outgoing: 2, incoming: 0 });
    assert.deepEqual(getEdgeTrimFrames(1, 3, "capcut_smooth"), { outgoing: 2, incoming: 1 });
    assert.deepEqual(getEdgeTrimFrames(2, 3, "capcut_smooth"), { outgoing: 0, incoming: 1 });
    assert.deepEqual(getEdgeTrimFrames(1, 3, "straight_cut"), { outgoing: 0, incoming: 0 });
  });
});

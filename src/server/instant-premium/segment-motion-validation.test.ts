import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FROZEN_FRAME_DELTA_THRESHOLD,
  meanAbsDiffGrayscale,
  motionScoreFromSamples,
} from "@/server/instant-premium/segment-motion-validation";

describe("segment motion validation", () => {
  it("detects identical frames as frozen", () => {
    const frame = Buffer.alloc(32 * 32, 128);
    const result = motionScoreFromSamples([frame, frame, frame]);
    assert.equal(result.likelyFrozen, true);
    assert.ok(result.motionScore < FROZEN_FRAME_DELTA_THRESHOLD);
  });

  it("detects changing frames as animated", () => {
    const a = Buffer.alloc(32 * 32, 40);
    const b = Buffer.alloc(32 * 32, 200);
    const result = motionScoreFromSamples([a, b, a]);
    assert.equal(result.likelyFrozen, false);
    assert.ok(result.motionScore >= FROZEN_FRAME_DELTA_THRESHOLD);
  });

  it("meanAbsDiff is zero for identical buffers", () => {
    const frame = Buffer.from([10, 20, 30, 40]);
    assert.equal(meanAbsDiffGrayscale(frame, frame), 0);
  });
});

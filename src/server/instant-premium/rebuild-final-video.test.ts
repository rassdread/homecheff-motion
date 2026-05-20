import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REBUILD_FINAL_EXPORT_PROGRESS } from "@/server/instant-premium/rebuild-final-video";
import { resolvePosterMotionBlendStrength } from "@/lib/poster-motion-preserve";
import { DEFAULT_POSTER_MOTION_SETTINGS } from "@/lib/poster-motion-preserve";

describe("rebuild final video", () => {
  it("uses merge-stage export progress", () => {
    assert.equal(REBUILD_FINAL_EXPORT_PROGRESS, 70);
  });

  it("resolves blend strength for logging metadata", () => {
    assert.equal(
      resolvePosterMotionBlendStrength({
        ...DEFAULT_POSTER_MOTION_SETTINGS,
        preserveAllText: true,
      }),
      0.1
    );
  });
});

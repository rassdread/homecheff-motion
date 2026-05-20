import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REBUILD_FINAL_EXPORT_PROGRESS,
  REBUILD_SEGMENTS_MISSING,
} from "@/server/instant-premium/rebuild-final-video";
import { resolvePosterMotionBlendStrength } from "@/lib/poster-motion-preserve";
import { DEFAULT_POSTER_MOTION_SETTINGS } from "@/lib/poster-motion-preserve";
import { finalBlobPathname } from "@/lib/final-video-storage";

describe("rebuild final video", () => {
  it("uses merge-stage export progress", () => {
    assert.equal(REBUILD_FINAL_EXPORT_PROGRESS, 70);
  });

  it("exposes segments-missing error code", () => {
    assert.equal(REBUILD_SEGMENTS_MISSING, "REBUILD_SEGMENTS_MISSING");
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

  it("targets versioned blob path on rebuild", () => {
    assert.equal(finalBlobPathname("proj", 2), "motion/final/proj/final-v2.mp4");
  });
});

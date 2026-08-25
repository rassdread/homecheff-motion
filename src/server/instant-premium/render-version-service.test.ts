import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { finalBlobPathname } from "@/lib/final-video-storage";
import { resolveFinalBlobVersionForUpload } from "@/server/instant-premium/render-version-service";

describe("resolveFinalBlobVersionForUpload", () => {
  it("uses render version number for full rerender pending versions", () => {
    assert.equal(
      resolveFinalBlobVersionForUpload({
        pendingRenderVersionNumber: 3,
        isMergeOnlyTextRebuild: false,
        nextTextRebuildCount: 2,
      }),
      3
    );
    assert.equal(finalBlobPathname("proj-1", 3), "motion/final/proj-1/final-v3.mp4");
  });

  it("uses text rebuild count for merge-only rebuilds", () => {
    assert.equal(
      resolveFinalBlobVersionForUpload({
        pendingRenderVersionNumber: null,
        isMergeOnlyTextRebuild: true,
        nextTextRebuildCount: 2,
      }),
      2
    );
  });

  it("uses legacy final.mp4 path for first-time merge without pending version", () => {
    assert.equal(
      resolveFinalBlobVersionForUpload({
        pendingRenderVersionNumber: null,
        isMergeOnlyTextRebuild: false,
        nextTextRebuildCount: 0,
      }),
      0
    );
    assert.equal(finalBlobPathname("proj-1", 0), "motion/final/proj-1/final.mp4");
  });

  it("bumps versioned blob path for automatic re-finalization after prior rebuilds", () => {
    assert.equal(
      resolveFinalBlobVersionForUpload({
        pendingRenderVersionNumber: null,
        isMergeOnlyTextRebuild: false,
        nextTextRebuildCount: 5,
        existingRebuildCount: 4,
      }),
      5
    );
    assert.equal(
      finalBlobPathname("proj-1", 5),
      "motion/final/proj-1/final-v5.mp4"
    );
    assert.notEqual(
      finalBlobPathname("proj-1", 5),
      "motion/final/proj-1/final.mp4"
    );
  });
});

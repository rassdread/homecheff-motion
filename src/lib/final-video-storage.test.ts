import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendFinalVideoRebuildAudit,
  finalBlobPathname,
  parseFinalVideoRebuildAuditJson,
  resolvePublicFinalVideoUrl,
  withFinalVideoCacheBust,
} from "@/lib/final-video-storage";

describe("final video storage", () => {
  it("uses stable path for first export and versioned path on rebuild", () => {
    assert.equal(finalBlobPathname("p1"), "motion/final/p1/final.mp4");
    assert.equal(finalBlobPathname("p1", 1), "motion/final/p1/final-v1.mp4");
    assert.equal(finalBlobPathname("p1", 3), "motion/final/p1/final-v3.mp4");
  });

  it("appends cache-bust query params", () => {
    const url = withFinalVideoCacheBust("https://example.com/final.mp4", 2, "2026-05-19T12:00:00.000Z");
    assert.match(url, /[?&]v=2/);
    assert.match(url, /[?&]t=/);
  });

  it("shows final url during rebuild while export is rendering", () => {
    const url = resolvePublicFinalVideoUrl({
      outputVideoUrl: "https://blob.example/final.mp4",
      exportStatus: "rendering",
      projectStatus: "rendering",
      rebuildStatus: "running",
      rebuildCount: 1,
      rebuiltAt: null,
    });
    assert.ok(url?.includes("v=1"));
  });

  it("hides url when rendering without rebuild and no completed export", () => {
    const url = resolvePublicFinalVideoUrl({
      outputVideoUrl: null,
      exportStatus: "rendering",
      projectStatus: "rendering",
      rebuildStatus: null,
      rebuildCount: 0,
    });
    assert.equal(url, null);
  });

  it("records non-billable rebuild audit events", () => {
    const first = appendFinalVideoRebuildAudit(null, {
      type: "final_video_rebuild",
      billingImpact: "none",
      aiCreditsUsed: 0,
      provider: "internal_merge",
      source: "existing_segments",
      rebuildType: "merge_only",
      usedExistingSegments: true,
      newProviderJobsCreated: false,
      estimatedAdditionalAiCost: 0,
      projectId: "p1",
      segmentCount: 3,
      rebuildCount: 1,
      previousFinalVideoUrl: "https://old/final.mp4",
      newFinalVideoUrl: "https://new/final-v1.mp4",
      recordedAt: "2026-05-19T12:00:00.000Z",
      status: "completed",
    });
    const events = parseFinalVideoRebuildAuditJson(first);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.aiCreditsUsed, 0);
    assert.equal(events[0]?.newProviderJobsCreated, false);
  });
});

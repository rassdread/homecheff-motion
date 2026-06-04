import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectVersionHistoryVideoUrls,
  isVideoUrlReferencedByVersionHistory,
} from "@/lib/video-version-retention";

describe("video version retention", () => {
  it("collects render version and audit URLs", () => {
    const urls = collectVersionHistoryVideoUrls({
      instantPreviousFinalVideoUrl: "https://blob.example/prev.mp4?v=1",
      renderVersions: [
        { finalVideoUrl: "https://blob.example/v2.mp4", cleanVideoUrl: "https://blob.example/c2.mp4" },
      ],
      instantFinalRebuildAuditJson: {
        events: [
          {
            type: "final_video_rebuild",
            previousFinalVideoUrl: "https://blob.example/audit-prev.mp4",
            newFinalVideoUrl: "https://blob.example/audit-new.mp4",
          },
        ],
      },
    });
    assert.ok(urls.some((u) => u.includes("prev.mp4")));
    assert.ok(urls.some((u) => u.includes("v2.mp4")));
    assert.ok(urls.some((u) => u.includes("audit-prev.mp4")));
  });

  it("matches URLs ignoring cache-bust query params", () => {
    const source = {
      renderVersions: [{ finalVideoUrl: "https://blob.example/v2.mp4?v=2&t=99" }],
    };
    assert.equal(
      isVideoUrlReferencedByVersionHistory("https://blob.example/v2.mp4?v=0", source),
      true
    );
  });
});

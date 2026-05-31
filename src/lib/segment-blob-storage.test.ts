import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBlobSegmentUrl, segmentBlobPathname } from "@/lib/segment-blob-storage";

describe("segment-blob-storage", () => {
  it("detects blob segment URLs", () => {
    assert.equal(
      isBlobSegmentUrl(
        "https://example.public.blob.vercel-storage.com/motion/segments/proj1/segment-1.mp4"
      ),
      true
    );
    assert.equal(isBlobSegmentUrl("https://video.cf.vidu.com/infer/foo.mp4"), false);
    assert.equal(isBlobSegmentUrl(null), false);
  });

  it("builds deterministic blob pathnames", () => {
    assert.equal(segmentBlobPathname("abc", 0), "motion/segments/abc/segment-1.mp4");
    assert.equal(segmentBlobPathname("abc", 2), "motion/segments/abc/segment-3.mp4");
  });
});

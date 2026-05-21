import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSegmentJoinMode } from "@/lib/exact-frame-continuity";
import { resolveSharedKeyframeJoinInput } from "@/server/instant-premium/seamless-segment-join";

describe("seamless segment join", () => {
  it("unifies preview URLs on shared keyframe boundary", () => {
    const input = resolveSharedKeyframeJoinInput(
      "img-b",
      "https://cdn.example.com/b.jpg",
      "img-b",
      "https://cdn.example.com/b.jpg",
      0,
      1
    );
    assert.equal(input.sharedKeyframe, true);
    assert.equal(input.endPreviewUrl, input.startPreviewUrl);
    assert.equal(resolveSegmentJoinMode(1), "direct_micro_stitch");
  });

  it("keeps separate previews when boundary images differ", () => {
    const input = resolveSharedKeyframeJoinInput(
      "img-a",
      "https://cdn.example.com/a.jpg",
      "img-b",
      "https://cdn.example.com/b.jpg",
      0,
      1
    );
    assert.equal(input.sharedKeyframe, false);
    assert.notEqual(input.endPreviewUrl, input.startPreviewUrl);
  });
});

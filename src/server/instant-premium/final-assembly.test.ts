import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowsPlainSegmentPassthrough,
  resolveFinalAssemblyMode,
  shouldRunSegmentCompositor,
} from "@/server/instant-premium/final-assembly";

describe("final assembly mode", () => {
  it("maps poster_motion_preserve to poster_composite_segments", () => {
    assert.equal(resolveFinalAssemblyMode("poster_motion_preserve"), "poster_composite_segments");
    assert.equal(shouldRunSegmentCompositor("poster_composite_segments"), true);
    assert.equal(allowsPlainSegmentPassthrough("poster_composite_segments"), false);
  });

  it("maps hybrid and legacy modes to concat_segments_only", () => {
    assert.equal(resolveFinalAssemblyMode("hybrid_overlay"), "concat_segments_only");
    assert.equal(resolveFinalAssemblyMode("deevid_text_safe"), "concat_segments_only");
    assert.equal(shouldRunSegmentCompositor("concat_segments_only"), false);
    assert.equal(allowsPlainSegmentPassthrough("concat_segments_only"), true);
  });

  it("runs compositor for static_poster_motion fallback mode", () => {
    assert.equal(shouldRunSegmentCompositor("static_poster_motion"), true);
    assert.equal(allowsPlainSegmentPassthrough("static_poster_motion"), false);
  });
});

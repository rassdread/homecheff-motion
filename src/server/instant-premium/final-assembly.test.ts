import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  POSTER_MOTION_PRESERVE_ASSEMBLY_RULES,
  buildFinalAssemblyLogBase,
  resolveFinalAssemblyMode,
  resolveFinalAssemblyTransitionType,
  shouldRunSegmentCompositor,
  usesRawAnimatedSegments,
} from "@/server/instant-premium/final-assembly";

describe("final assembly mode", () => {
  it("maps poster_motion_preserve to raw_motion_concat by default", () => {
    assert.equal(resolveFinalAssemblyMode("poster_motion_preserve"), "raw_motion_concat");
    assert.equal(usesRawAnimatedSegments("raw_motion_concat"), true);
    assert.equal(shouldRunSegmentCompositor("raw_motion_concat"), false);
  });

  it("allows advanced poster_composite_segments when settings opt in", () => {
    assert.equal(
      resolveFinalAssemblyMode("poster_motion_preserve", {
        version: 1,
        advancedSegmentComposite: true,
      }),
      "poster_composite_segments"
    );
    assert.equal(shouldRunSegmentCompositor("poster_composite_segments"), true);
  });

  it("maps hybrid and legacy modes to concat_segments_only", () => {
    assert.equal(resolveFinalAssemblyMode("hybrid_overlay"), "concat_segments_only");
    assert.equal(resolveFinalAssemblyMode("deevid_text_safe"), "concat_segments_only");
    assert.equal(shouldRunSegmentCompositor("concat_segments_only"), false);
    assert.equal(usesRawAnimatedSegments("concat_segments_only"), true);
  });

  it("runs compositor for static_poster_motion fallback mode", () => {
    assert.equal(shouldRunSegmentCompositor("static_poster_motion"), true);
    assert.equal(usesRawAnimatedSegments("static_poster_motion"), false);
  });

  it("exposes poster motion preserve assembly rules", () => {
    assert.equal(POSTER_MOTION_PRESERVE_ASSEMBLY_RULES.useRawAnimatedSegments, true);
    assert.equal(POSTER_MOTION_PRESERVE_ASSEMBLY_RULES.allowPosterOverlay, false);
    assert.equal(POSTER_MOTION_PRESERVE_ASSEMBLY_RULES.allowFullFrameBlend, false);
  });

  it("resolves transition type for multi-segment merge", () => {
    assert.equal(resolveFinalAssemblyTransitionType(3, 5), "crossfade");
    assert.equal(resolveFinalAssemblyTransitionType(3, null), "concat");
    assert.equal(resolveFinalAssemblyTransitionType(1, 5), "none");
  });

  it("builds assembly log base with raw segments for poster preserve default", () => {
    const base = buildFinalAssemblyLogBase({
      projectId: "p1",
      assemblyMode: "raw_motion_concat",
      segmentCount: 3,
      perSegmentDurationSeconds: 5,
    });
    assert.equal(base.usedRawSegments, true);
    assert.equal(base.usedComposite, false);
    assert.equal(base.transitionType, "crossfade");
  });
});

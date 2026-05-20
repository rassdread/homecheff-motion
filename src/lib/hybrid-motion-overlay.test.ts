import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bboxToPolygon,
  collectProjectTextPatches,
  DEFAULT_TEXT_RENDER_MODE,
  normalizeTextRenderMode,
  parseImageTextPatches,
  shouldMaskForVidu,
  usesHybridPostReprojection,
  usesAggressivePreAiNeutralize,
  usesCriticalTypographyPrompt,
  usesHybridPreAiNeutralize,
  usesPixelPreservedPatches,
} from "./hybrid-motion-overlay";

describe("hybrid-motion-overlay modes", () => {
  it("defaults to poster_motion_preserve", () => {
    assert.equal(DEFAULT_TEXT_RENDER_MODE, "poster_motion_preserve");
    assert.equal(normalizeTextRenderMode(undefined), "poster_motion_preserve");
  });

  it("poster_motion_preserve skips OCR mask pipeline", () => {
    assert.equal(usesHybridPreAiNeutralize("poster_motion_preserve"), false);
    assert.equal(shouldMaskForVidu("poster_motion_preserve"), false);
  });

  it("hybrid modes use pre-AI neutralize and post reprojection", () => {
    assert.equal(usesHybridPreAiNeutralize("deevid_text_safe"), true);
    assert.equal(usesAggressivePreAiNeutralize("deevid_text_safe"), true);
    assert.equal(usesHybridPostReprojection("deevid_text_safe"), true);
    assert.equal(usesCriticalTypographyPrompt("deevid_text_safe"), true);
    assert.equal(usesHybridPreAiNeutralize("hybrid_overlay"), true);
    assert.equal(usesHybridPostReprojection("hybrid_overlay"), true);
    assert.equal(usesHybridPreAiNeutralize("ai_protection"), true);
    assert.equal(usesHybridPostReprojection("ai_protection"), false);
    assert.equal(shouldMaskForVidu("none"), false);
    assert.equal(usesPixelPreservedPatches("deevid_text_safe"), true);
    assert.equal(usesPixelPreservedPatches("hybrid_overlay"), true);
  });

  it("builds polygon from bbox and collects patches", () => {
    const poly = bboxToPolygon({ x: 0.1, y: 0.2, width: 0.3, height: 0.1 });
    assert.equal(poly.length, 4);
    const snap = parseImageTextPatches({
      version: 1,
      patches: [
        {
          id: "b1",
          text: "Hi",
          polygon: poly,
          bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.1 },
          patchUrl: "https://example.com/p.png",
          patchWidth: 100,
          patchHeight: 40,
          padding: 0.08,
          zIndex: 1,
          confidence: 0.9,
        },
      ],
    });
    assert.ok(snap);
    const collected = collectProjectTextPatches([
      { order: 0, instantTextPatches: snap },
    ]);
    assert.equal(collected.length, 1);
    assert.equal(collected[0].text, "Hi");
  });
});

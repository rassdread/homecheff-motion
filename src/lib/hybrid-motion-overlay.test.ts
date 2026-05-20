import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_TEXT_RENDER_MODE,
  normalizeTextRenderMode,
  shouldMaskForVidu,
  usesHybridPostReprojection,
  usesHybridPreAiNeutralize,
} from "./hybrid-motion-overlay";

describe("hybrid-motion-overlay modes", () => {
  it("defaults to hybrid_overlay", () => {
    assert.equal(DEFAULT_TEXT_RENDER_MODE, "hybrid_overlay");
    assert.equal(normalizeTextRenderMode(undefined), "hybrid_overlay");
  });

  it("hybrid modes use pre-AI neutralize and post reprojection", () => {
    assert.equal(usesHybridPreAiNeutralize("hybrid_overlay"), true);
    assert.equal(usesHybridPostReprojection("hybrid_overlay"), true);
    assert.equal(usesHybridPreAiNeutralize("ai_protection"), true);
    assert.equal(usesHybridPostReprojection("ai_protection"), false);
    assert.equal(shouldMaskForVidu("none"), false);
  });
});

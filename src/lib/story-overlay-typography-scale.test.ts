import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  scaleStoryOverlayFontSize,
  scaleStoryOverlayTemplateBase,
  STORY_ASS_SUBTITLE_GAP_PX,
  STORY_HEADLINE_TO_TITLE_RATIO,
  STORY_LAYER_SUBTITLE_VERTICAL_GAP_PX,
  STORY_OVERLAY_HEADLINE_SCALE,
  STORY_OVERLAY_SUBTITLE_SCALE,
  STORY_OVERLAY_TITLE_SCALE,
} from "@/lib/story-overlay-typography-scale";

describe("story overlay typography scale", () => {
  it("applies headline, title, and subtitle scale factors", () => {
    assert.equal(STORY_OVERLAY_HEADLINE_SCALE, 1.3);
    assert.equal(STORY_OVERLAY_TITLE_SCALE, 1.2);
    assert.equal(STORY_OVERLAY_SUBTITLE_SCALE, 1.1);
    assert.equal(scaleStoryOverlayFontSize("headline", 100), 130);
    assert.equal(scaleStoryOverlayFontSize("title", 72), 86);
    assert.equal(scaleStoryOverlayFontSize("subtitle", 48), 53);
  });

  it("scales template min/default/max together", () => {
    const scaled = scaleStoryOverlayTemplateBase({
      default: 118,
      min: 78,
      max: 144,
      role: "headline",
    });
    assert.equal(scaled.default, 153);
    assert.equal(scaled.min, 101);
    assert.equal(scaled.max, 187);
  });

  it("keeps headline-to-title fallback ratio aligned with global scale", () => {
    assert.ok(STORY_HEADLINE_TO_TITLE_RATIO > 1.28);
    assert.ok(STORY_LAYER_SUBTITLE_VERTICAL_GAP_PX > 12);
    assert.ok(STORY_ASS_SUBTITLE_GAP_PX > 8);
  });
});

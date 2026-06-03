import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bandAnchorY,
  defaultBandForOverlayKind,
  defaultBandForSceneLayer,
  nextAlternateBand,
  STORY_LAYOUT_BAND_ORDER,
} from "@/server/animation-export/story-overlay-layout-bands";

describe("story-overlay-layout-bands", () => {
  it("assigns headline/title/subtitle to distinct vertical bands", () => {
    assert.equal(defaultBandForSceneLayer("headline"), "top");
    assert.equal(defaultBandForSceneLayer("title"), "upper_middle");
    assert.equal(defaultBandForSceneLayer("subtitle"), "center");
    assert.equal(defaultBandForOverlayKind("finale_footer"), "bottom");
  });

  it("orders band anchors top to bottom on 9:16 frame", () => {
    const ys = STORY_LAYOUT_BAND_ORDER.map((band) => bandAnchorY(band, 1920));
    for (let i = 1; i < ys.length; i += 1) {
      assert.ok(ys[i]! > ys[i - 1]!, `${STORY_LAYOUT_BAND_ORDER[i]} should be below ${STORY_LAYOUT_BAND_ORDER[i - 1]}`);
    }
  });

  it("nextAlternateBand skips occupied bands", () => {
    const used = new Set(["top", "upper_middle"] as const);
    assert.equal(nextAlternateBand("top", used), "center");
  });
});

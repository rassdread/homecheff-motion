import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  confirmedBlocks,
  defaultAnimationForTextBlock,
  detectedBlockToRecord,
  layerAnchorFromBbox,
} from "@/lib/baked-text-detection";

describe("baked text detection helpers", () => {
  it("defaults UI-like blocks to no animation", () => {
    const anim = defaultAnimationForTextBlock({
      text: "12:30",
      bbox: { x: 0.1, y: 0.2, width: 0.2, height: 0.05 },
      blockType: "ui",
    });
    assert.equal(anim, "none");
  });

  it("requires confirmed flag for checkout blocks", () => {
    const record = detectedBlockToRecord({
      id: "a",
      text: "Hello",
      confidence: 0.9,
      bbox: { x: 0.1, y: 0.1, width: 0.3, height: 0.1 },
      suggestedFontSize: 28,
      suggestedAlign: "center",
      blockType: "caption",
    });
    assert.equal(confirmedBlocks([{ ...record, confirmed: true }]).length, 1);
    assert.equal(confirmedBlocks([record]).length, 0);
  });

  it("maps bbox to layer anchor", () => {
    const anchor = layerAnchorFromBbox({ x: 0.2, y: 0.3, width: 0.4, height: 0.1 });
    assert.equal(anchor.x, 0.4);
    assert.equal(anchor.y, 0.3);
  });
});

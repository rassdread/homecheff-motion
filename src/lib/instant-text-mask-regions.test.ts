import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import {
  buildViduMaskRegionsFromBlocks,
  expandMaskRegion,
  inferUiContainerMaskRegion,
  mergeOverlappingMaskRegions,
} from "@/lib/instant-text-mask-regions";

function block(
  partial: Partial<BakedTextBlockRecord> & { blockType: BakedTextBlockRecord["blockType"] }
): BakedTextBlockRecord {
  return {
    id: "b1",
    text: "Menu",
    editedText: "Menu",
    confidence: 0.9,
    bbox: partial.bbox ?? { x: 0.1, y: 0.7, width: 0.2, height: 0.05 },
    suggestedFontSize: 24,
    suggestedAlign: "center",
    blockType: partial.blockType,
    kept: true,
    confirmed: true,
    animation: "none",
  };
}

describe("instant-text-mask-regions", () => {
  it("expands bbox with padding", () => {
    const expanded = expandMaskRegion({ x: 0.4, y: 0.4, width: 0.1, height: 0.1 }, 0.3);
    assert.ok(expanded.width > 0.1);
    assert.ok(expanded.x < 0.4);
  });

  it("expands UI blocks to container scale", () => {
    const ui = inferUiContainerMaskRegion(block({ blockType: "ui" }));
    assert.ok(ui.width >= 0.4);
    assert.ok(ui.height >= 0.2);
  });

  it("merges overlapping regions", () => {
    const merged = mergeOverlappingMaskRegions([
      { x: 0.1, y: 0.1, width: 0.3, height: 0.2 },
      { x: 0.2, y: 0.15, width: 0.3, height: 0.2 },
    ]);
    assert.equal(merged.length, 1);
  });

  it("builds aggressive mask list from blocks", () => {
    const regions = buildViduMaskRegionsFromBlocks(
      [
        block({ blockType: "ui" }),
        block({ blockType: "cta", bbox: { x: 0.5, y: 0.8, width: 0.15, height: 0.04 } }),
      ],
      true
    );
    assert.ok(regions.length >= 1);
    for (const r of regions) {
      assert.ok(r.width > 0.1);
    }
  });
});

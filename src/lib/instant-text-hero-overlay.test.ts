import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import {
  applyDefaultReprojectInVideo,
  capHeroReprojectBlocks,
  classifyOcrTextDensity,
  heroBlocksForReprojection,
  isSingleClearHeadline,
  MAX_HERO_OVERLAYS_PER_IMAGE,
  normalizeHeroReprojectBlocks,
} from "@/lib/instant-text-hero-overlay";

function block(partial: Partial<BakedTextBlockRecord> & { id: string; text: string }): BakedTextBlockRecord {
  return {
    id: partial.id,
    text: partial.text,
    editedText: partial.editedText ?? partial.text,
    confidence: partial.confidence ?? 0.9,
    bbox: partial.bbox ?? { x: 0.1, y: 0.1, width: 0.5, height: 0.12 },
    suggestedFontSize: 32,
    suggestedAlign: "center",
    blockType: "other",
    kept: partial.kept ?? true,
    confirmed: partial.confirmed ?? true,
    animation: "fade-in",
    reprojectInVideo: partial.reprojectInVideo,
  };
}

describe("instant-text-hero-overlay", () => {
  it("classifies dense images", () => {
    assert.equal(classifyOcrTextDensity(3), "sparse");
    assert.equal(classifyOcrTextDensity(4), "text_dense");
  });

  it("does not auto-reproject dense OCR", () => {
    const blocks = Array.from({ length: 5 }, (_, i) =>
      block({ id: `b${i}`, text: `Line ${i}`, confidence: 0.95 })
    );
    const normalized = normalizeHeroReprojectBlocks(blocks);
    assert.equal(heroBlocksForReprojection(normalized).length, 0);
  });

  it("auto-reprojects only a single clear headline", () => {
    const blocks = [block({ id: "h1", text: "Summer Sale", confidence: 0.92 })];
    assert.equal(isSingleClearHeadline(blocks), true);
    const normalized = applyDefaultReprojectInVideo(blocks);
    assert.equal(heroBlocksForReprojection(normalized).length, 1);
    assert.equal(normalized[0].reprojectInVideo, true);
  });

  it("caps hero reproject selection", () => {
    let blocks = Array.from({ length: 5 }, (_, i) =>
      block({ id: `b${i}`, text: `Hero ${i}`, reprojectInVideo: true })
    );
    blocks = capHeroReprojectBlocks(blocks);
    assert.equal(heroBlocksForReprojection(blocks).length, MAX_HERO_OVERLAYS_PER_IMAGE);
  });
});

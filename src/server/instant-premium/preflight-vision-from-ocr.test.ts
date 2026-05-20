import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import {
  derivePreflightVisionFromOcrBlocks,
  emptyPreflightVisionFromOcr,
} from "@/server/instant-premium/preflight-vision-from-ocr";

const block = (overrides: Partial<BakedTextBlockRecord> = {}): BakedTextBlockRecord => ({
  id: "b1",
  text: "Sale",
  editedText: "Sale",
  confidence: 0.9,
  bbox: { x: 0.1, y: 0.1, width: 0.3, height: 0.08 },
  suggestedFontSize: 28,
  suggestedAlign: "center",
  blockType: "cta",
  kept: true,
  confirmed: false,
  animation: "fade-in",
  ...overrides,
});

describe("preflight vision from OCR", () => {
  it("returns no readable text when blocks are empty", () => {
    const vision = emptyPreflightVisionFromOcr();
    assert.equal(vision.hasReadableText, false);
    assert.equal(vision.distortionRisk, "none");
  });

  it("derives readable text and risk from OCR blocks", () => {
    const vision = derivePreflightVisionFromOcrBlocks([
      block({ blockType: "ui", confidence: 0.95 }),
    ]);
    assert.equal(vision.hasReadableText, true);
    assert.equal(vision.hasPhoneOrUiText, true);
    assert.equal(vision.distortionRisk, "high");
  });
});

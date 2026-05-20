import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BAKED_TEXT_LARGE_TEXT_MIN_CHARS,
  BAKED_TEXT_OCR_CONFIDENCE_THRESHOLD,
  shouldPromptBakedTextReview,
} from "@/lib/baked-text-auto-scan";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";

const block = (patch: Partial<BakedTextBlockRecord>): BakedTextBlockRecord => ({
  id: "b1",
  text: "Hi",
  editedText: "Hi",
  confidence: 0.4,
  bbox: { x: 0.1, y: 0.1, width: 0.05, height: 0.03 },
  suggestedFontSize: 24,
  suggestedAlign: "center",
  blockType: "other",
  kept: true,
  confirmed: false,
  animation: "fade-in",
  ...patch,
});

describe("baked text auto-scan thresholds", () => {
  it("returns false for empty blocks", () => {
    assert.equal(shouldPromptBakedTextReview([]), false);
  });

  it("returns false for low-confidence tiny noise", () => {
    assert.equal(shouldPromptBakedTextReview([block({ text: "a", editedText: "a" })]), false);
  });

  it("returns true for UI blocks", () => {
    assert.equal(shouldPromptBakedTextReview([block({ blockType: "ui", text: "12:30" })]), true);
  });

  it("returns true when confidence exceeds threshold", () => {
    assert.equal(
      shouldPromptBakedTextReview([
        block({ confidence: BAKED_TEXT_OCR_CONFIDENCE_THRESHOLD, text: "ok", editedText: "ok" }),
      ]),
      true
    );
  });

  it("returns true for large readable copy", () => {
    const long = "x".repeat(BAKED_TEXT_LARGE_TEXT_MIN_CHARS);
    assert.equal(shouldPromptBakedTextReview([block({ text: long, editedText: long })]), true);
  });
});

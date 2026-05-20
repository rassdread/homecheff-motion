import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAutoConfirmToBlocks,
  BAKED_TEXT_AUTO_CONFIRM_MIN_CONFIDENCE,
  canAutoConfirmBakedTextBlocks,
  isAutoConfirmBakedTextEnabledFromEnv,
  resolveAutoConfirmBakedTextBlocks,
} from "@/lib/baked-text-auto-confirm";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";

const block = (patch: Partial<BakedTextBlockRecord>): BakedTextBlockRecord => ({
  id: "b1",
  text: "Fresh pasta",
  editedText: "Fresh pasta",
  confidence: 0.92,
  bbox: { x: 0.1, y: 0.1, width: 0.3, height: 0.08 },
  suggestedFontSize: 28,
  suggestedAlign: "center",
  blockType: "caption",
  kept: true,
  confirmed: false,
  animation: "fade-in",
  ...patch,
});

describe("baked text auto-confirm", () => {
  it("reads AUTO_CONFIRM_BAKED_TEXT env", () => {
    assert.equal(isAutoConfirmBakedTextEnabledFromEnv("true"), true);
    assert.equal(isAutoConfirmBakedTextEnabledFromEnv("false"), false);
  });

  it("allows auto-confirm when all blocks are high confidence", () => {
    assert.equal(
      canAutoConfirmBakedTextBlocks([
        block({ confidence: BAKED_TEXT_AUTO_CONFIRM_MIN_CONFIDENCE }),
        block({ id: "b2", text: "€12", editedText: "€12" }),
      ]),
      true
    );
  });

  it("requires review when any block is below threshold", () => {
    assert.equal(
      canAutoConfirmBakedTextBlocks([block({ confidence: BAKED_TEXT_AUTO_CONFIRM_MIN_CONFIDENCE - 0.01 })]),
      false
    );
  });

  it("preserves exact OCR text on auto-confirm", () => {
    const confirmed = applyAutoConfirmToBlocks([
      block({ text: "Menu", editedText: "Menu edited", confirmed: false }),
    ]);
    assert.equal(confirmed[0].editedText, "Menu");
    assert.equal(confirmed[0].confirmed, true);
  });

  it("resolves auto-confirm only when enabled", () => {
    const low = resolveAutoConfirmBakedTextBlocks(
      [block({ confidence: 0.5 })],
      true
    );
    assert.equal(low.autoConfirmed, false);

    const high = resolveAutoConfirmBakedTextBlocks([block({})], true);
    assert.equal(high.autoConfirmed, true);
    assert.equal(high.blocks[0].confirmed, true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import {
  buildHardTextLockPromptLine,
  buildLockedTextRegionsFromBlocks,
  defaultTextLockMode,
  imageNeedsTextLockWarning,
  MAX_LOCKED_TEXT_REGIONS,
  normalizeBlocksWithTextLock,
} from "@/lib/hard-text-lock";
import { buildCompactViduMotionPrompt } from "@/lib/vidu-prompt-budget";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";

const block = (patch: Partial<BakedTextBlockRecord>): BakedTextBlockRecord => ({
  id: "b1",
  text: "Welkom bij HomeCheff",
  editedText: "Welkom bij HomeCheff",
  confidence: 0.92,
  bbox: { x: 0.1, y: 0.08, width: 0.8, height: 0.12 },
  suggestedFontSize: 32,
  suggestedAlign: "center",
  blockType: "sign",
  kept: true,
  confirmed: true,
  animation: "none",
  ...patch,
});

describe("hard text lock", () => {
  it("cartoon animation defaults to auto_hard_lock", () => {
    assert.equal(defaultTextLockMode("cartoon_animation"), "auto_hard_lock");
    assert.equal(defaultTextLockMode("clean_motion"), "prompt_only");
  });

  it("text-heavy poster creates locked regions", () => {
    const regions = buildLockedTextRegionsFromBlocks(
      [block({}), block({ id: "b2", text: "Shop now", blockType: "cta", bbox: { x: 0.2, y: 0.7, width: 0.5, height: 0.1 } })],
      "auto_hard_lock"
    );
    assert.ok(regions.length >= 1);
    assert.match(regions[0]!.textPreview, /HomeCheff/);
  });

  it("caps locked regions to prevent overlay spam", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      block({ id: `b${i}`, text: `Line ${i}`, bbox: { x: 0.05, y: 0.05 + i * 0.1, width: 0.4, height: 0.08 } })
    );
    const regions = buildLockedTextRegionsFromBlocks(many, "auto_hard_lock");
    assert.equal(regions.length, MAX_LOCKED_TEXT_REGIONS);
  });

  it("compact prompt includes facial priority and text lock", () => {
    const profile = resolvePremiumPolishProfile({
      version: 1,
      animationStyleId: "cartoon_animation",
      textLockMode: "auto_hard_lock",
    });
    const motion = buildCompactViduMotionPrompt(profile, {
      transitionOrder: 0,
      transitionTotal: 2,
      lockedTextRegionCount: 2,
    });
    assert.match(motion, /Prioritize living faces/i);
    assert.match(motion, /LOCKED_TEXT_REGIONS/i);
  });

  it("auto hard lock sets reproject flags within cap", () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      block({ id: `b${i}`, bbox: { x: 0.1, y: 0.05 + i * 0.12, width: 0.7, height: 0.1 } })
    );
    const out = normalizeBlocksWithTextLock(many, "auto_hard_lock");
    const reproject = out.filter((b) => b.reprojectInVideo).length;
    assert.ok(reproject <= MAX_LOCKED_TEXT_REGIONS);
    assert.ok(reproject >= 1);
  });

  it("buildHardTextLockPromptLine works without region count", () => {
    const line = buildHardTextLockPromptLine("auto_hard_lock", 0);
    assert.match(line, /headlines, CTA/i);
  });

  it("warns when important text is not locked", () => {
    const important = block({ confirmed: false });
    assert.equal(
      imageNeedsTextLockWarning([important], "auto_hard_lock", 0),
      true
    );
  });
});

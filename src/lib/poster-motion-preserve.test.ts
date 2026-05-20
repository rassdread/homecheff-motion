import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_POSTER_MOTION_SETTINGS,
  parsePosterMotionSettings,
  POSTER_MOTION_PRESERVE_PROMPT_BLOCK,
} from "./poster-motion-preserve";
import {
  normalizeTextRenderMode,
  shouldMaskForVidu,
  usesPosterBaseComposite,
  usesPosterMotionPreserve,
} from "./hybrid-motion-overlay";

describe("poster_motion_preserve architecture", () => {
  it("parses default poster settings", () => {
    const s = parsePosterMotionSettings(undefined);
    assert.equal(s.preserveAllText, true);
    assert.equal(s.animateForegroundOnly, true);
    assert.deepEqual(s, DEFAULT_POSTER_MOTION_SETTINGS);
  });

  it("poster mode skips OCR masking and uses base composite", () => {
    assert.equal(normalizeTextRenderMode("poster_motion_preserve"), "poster_motion_preserve");
    assert.equal(usesPosterMotionPreserve("poster_motion_preserve"), true);
    assert.equal(shouldMaskForVidu("poster_motion_preserve"), false);
    assert.equal(usesPosterBaseComposite("poster_motion_preserve"), true);
  });

  it("includes poster motion prompt block", () => {
    assert.match(POSTER_MOTION_PRESERVE_PROMPT_BLOCK, /POSTER MOTION PRESERVE/);
    assert.match(POSTER_MOTION_PRESERVE_PROMPT_BLOCK, /Do NOT regenerate/);
  });
});

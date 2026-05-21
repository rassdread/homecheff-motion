import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANIMATION_STYLE_IDS } from "@/lib/animation-style-types";
import { buildInstantVideoPrompt } from "@/lib/instant-premium-prompt";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import {
  applyViduPromptBudget,
  buildBudgetedViduPrompt,
  buildCompactViduMotionPrompt,
  COMPACT_TEXT_PRESERVATION_LINE,
  deduplicatePromptText,
  validateViduPromptLength,
  VIDU_PROMPT_HARD_MAX_CHARS,
  VIDU_PROMPT_MAX_CHARS,
} from "@/lib/vidu-prompt-budget";

describe("vidu prompt budget", () => {
  it("cartoon preset compact motion stays under 3500 chars", () => {
    const profile = resolvePremiumPolishProfile({
      version: 1,
      animationStyleId: "cartoon_animation",
    });
    const motion = buildCompactViduMotionPrompt(profile, {
      transitionOrder: 1,
      transitionTotal: 3,
      userIntent: "Chef mascot promo for HomeCheff",
    });
    assert.ok(motion.length < VIDU_PROMPT_MAX_CHARS, `motion len ${motion.length}`);
    assert.match(motion, /Freeze all text/);
    assert.match(motion, /cartoon animation/i);
    assert.match(motion, /PREMIUM COMIC-STRIP ENGINE/i);
    assert.match(motion, /GLOBAL MASCOT \(HomeCheff\)/i);
    assert.match(motion, /Moderately expressive facial expression cycle/i);
  });

  it("all animation presets stay under budget when fully composed", () => {
    for (const styleId of ANIMATION_STYLE_IDS) {
      const main = buildInstantVideoPrompt({
        stylePreset: "food_promo",
        duration: 8,
        aspectRatio: "9:16",
        userIntent: "Premium social ad with mascots",
        selectedChips: ["cinematic_soft", "more_dynamic"],
        posterMotionActive: true,
        textRenderMode: "poster_motion_preserve",
        polishSettingsRaw: { version: 1, animationStyleId: styleId },
        transitionOrder: 0,
        transitionTotal: 2,
      });
      const { prompt } = buildBudgetedViduPrompt({
        storyBlock: main,
        motionBlock: "",
        segmentHint: "Segment 1/2: opening beat.",
      });
      assert.ok(
        prompt.length <= VIDU_PROMPT_HARD_MAX_CHARS,
        `${styleId} prompt ${prompt.length} exceeds hard max`
      );
      assert.ok(
        prompt.length <= VIDU_PROMPT_MAX_CHARS + 200,
        `${styleId} prompt ${prompt.length} over target`
      );
    }
  });

  it("deduplicates repeated preservation phrases", () => {
    const raw = [
      COMPACT_TEXT_PRESERVATION_LINE,
      "Never morph or redraw on-screen text, logos, or UI.",
      "Freeze all typography and logos — animate subjects only.",
    ].join("\n");
    const out = deduplicatePromptText(raw);
    const preservationMatches = out.match(/freeze|never|morph|text/gi) ?? [];
    assert.ok(preservationMatches.length <= 6);
  });

  it("applyViduPromptBudget never exceeds hard max", () => {
    const huge = "A".repeat(20_000);
    const { prompt, log } = applyViduPromptBudget({
      blocks: [
        { id: "p1", priority: 1, text: COMPACT_TEXT_PRESERVATION_LINE },
        { id: "p2", priority: 1, text: huge },
        { id: "p3", priority: 3, text: "Optional social polish ".repeat(200) },
      ],
    });
    assert.ok(prompt.length <= VIDU_PROMPT_HARD_MAX_CHARS);
    assert.ok(log.charsAfter <= VIDU_PROMPT_HARD_MAX_CHARS);
    const check = validateViduPromptLength(prompt);
    assert.equal(check.ok, true);
  });

  it("drops priority 3 blocks first when over budget", () => {
    const { log } = applyViduPromptBudget({
      maxChars: 400,
      blocks: [
        { id: "core", priority: 1, text: COMPACT_TEXT_PRESERVATION_LINE },
        { id: "motion", priority: 2, text: "Motion energy: expressive. Continuity: smooth." },
        { id: "social", priority: 3, text: "Social polish ".repeat(80) },
      ],
    });
    assert.ok(log.droppedBlocks.includes("social") || log.truncatedBlocks.length > 0);
  });
});

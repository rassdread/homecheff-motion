import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  mergeCharacterIdentityForm,
  emptyCharacterIdentityForm,
} from "@/lib/studio-character-identity-fields";
import { buildCharacterIdentityPrefillFromImages } from "@/lib/studio-character-identity-image-prefill";
import { mergeCharacterIdentityPrefills } from "@/lib/studio-character-identity-prefill-merge";
import { buildCharacterIdentityPrefillFromPrompt } from "@/lib/studio-character-identity-prompt-prefill";
import { buildCharacterVoiceHintFromPrefill } from "@/lib/studio-character-identity-voice-hints";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

const CHEF_PROMPT =
  "Een witte cartoon-mascotte zonder huidskleur, koksmuts, groene schort, houten lepel, warm en grappig, geschikt voor HomeCheff food promo's.";

const DESIGNER_PROMPT =
  "Een urban designer mascot met naald en klos, premium streetwear uitstraling, blauw-groene HomeCheff accenten.";

describe("character image & prompt identity prefill", () => {
  it("prompt-only prefill maps chef mascot example", () => {
    const result = buildCharacterIdentityPrefillFromPrompt({
      input: { prompt: CHEF_PROMPT, usageContext: "food promo" },
      locale: "nl",
    });
    assert.equal(result.prefill.characterType, "mascot");
    assert.equal(result.prefill.visualStyle, "2d_cartoon");
    assert.equal(result.prefill.colorTheme, "homecheff");
    assert.ok(result.prefill.forbiddenElements?.toLowerCase().includes("huidskleur"));
    assert.ok(result.prefill.clothing?.toLowerCase().includes("kok") || result.reasons.some((r) => r.includes("chef")));
    assert.ok(result.voiceDirectionHint.toLowerCase().includes("chef") || result.voiceDirectionHint.includes("Warm"));
  });

  it("prompt-only prefill maps designer example", () => {
    const result = buildCharacterIdentityPrefillFromPrompt({
      input: { prompt: DESIGNER_PROMPT },
      locale: "nl",
    });
    assert.equal(result.prefill.characterType, "mascot");
    assert.ok(result.prefill.accessories?.toLowerCase().includes("naald") || result.reasons.some((r) => r.includes("needle")));
    assert.equal(result.prefill.colorTheme, "homecheff");
  });

  it("image + prompt merge detects color conflict", () => {
    const prompt = buildCharacterIdentityPrefillFromPrompt({
      input: { prompt: "Groene schort, warme chef mascotte" },
    });
    const image = buildCharacterIdentityPrefillFromImages({
      analysis: {
        clothing: "blue jacket",
        colorTheme: "premium navy blue",
        characterType: "mascot",
        confidence: 0.8,
      },
      input: { imageUrls: ["https://example.com/x.jpg"] },
    });
    const merged = mergeCharacterIdentityPrefills({ prompt, image });
    assert.ok((merged.conflicts ?? []).length > 0);
  });

  it("image + prompt merge prefers prompt for forbidden elements", () => {
    const prompt = buildCharacterIdentityPrefillFromPrompt({
      input: { prompt: "Mascot zonder huidskleur vermijden" },
    });
    const image = buildCharacterIdentityPrefillFromImages({
      analysis: { characterType: "mascot", visualStyle: "3d cartoon", confidence: 0.7 },
      input: { imageUrls: ["https://example.com/x.jpg"] },
    });
    const merged = mergeCharacterIdentityPrefills({ prompt, image });
    assert.ok(merged.prefill.forbiddenElements?.length);
    assert.equal(merged.prefill.visualStyle, "3d_cartoon");
  });

  it("voice hint suggests chef narrator for chef outfit", () => {
    const hint = buildCharacterVoiceHintFromPrefill(
      { clothing: "Chef outfit", personality: "warm" },
      "chef kitchen promo"
    );
    assert.match(hint.direction, /chef|Warm/i);
  });

  it("use proposal requires explicit merge (no auto-save)", () => {
    const result = buildCharacterIdentityPrefillFromPrompt({
      input: { prompt: CHEF_PROMPT },
    });
    const empty = emptyCharacterIdentityForm();
    assert.equal(empty.characterType, "");
    const merged = mergeCharacterIdentityForm(empty, result.prefill);
    assert.equal(merged.characterType, "mascot");
  });

  it("form exposes four entry paths including prompt_prefill", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-form.tsx"),
      "utf8"
    );
    assert.match(src, /prompt_prefill/);
    assert.match(src, /StudioCharacterPromptPrefillPanel/);
    assert.match(src, /image_prefill/);
  });

  it("has nl/en i18n parity for prefill sprint keys", () => {
    const keys = [
      "studio.characters.createEntryPromptPrefillTitle",
      "studio.characters.prefill.proposalTitle",
      "studio.characters.prefill.useProposal",
      "studio.characters.prefill.adjustFirst",
      "studio.characters.prefill.brandDisclaimer",
      "studio.characters.prefill.conflict.colorTheme",
      "studio.characters.promptPrefill.title",
      "studio.characterIdentity.suggestion.availableFromPrompt",
    ] as const;
    for (const key of keys) {
      assert.ok(nl[key], `missing nl ${key}`);
      assert.ok(en[key], `missing en ${key}`);
    }
  });
});

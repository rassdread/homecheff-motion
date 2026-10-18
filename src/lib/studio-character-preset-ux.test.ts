import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildCharacterStructuredIdentityPromptLines } from "@/lib/studio-character-identity-prompt-lines";
import {
  CHARACTER_IDENTITY_ADVANCED_STYLES,
  CHARACTER_IDENTITY_CORE_STYLES,
  characterIdentityStylePrompt,
} from "@/lib/studio-character-identity-presets";

describe("character preset ux", () => {
  it("maps every visual style id into a generation phrase and keeps unknown values", () => {
    for (const styleId of [...CHARACTER_IDENTITY_CORE_STYLES, ...CHARACTER_IDENTITY_ADVANCED_STYLES]) {
      const phrase = characterIdentityStylePrompt(styleId);
      assert.notEqual(phrase, styleId);
      const lines = buildCharacterStructuredIdentityPromptLines(`hc:style=${styleId}`);
      assert.equal(lines[0], `Visual style: ${phrase}.`);
    }
    const custom = buildCharacterStructuredIdentityPromptLines("hc:style=cinematic cartoon");
    assert.equal(custom[0], "Visual style: cinematic cartoon.");
  });

  it("uses one style card, a voice picker, and the four editor steps", () => {
    const builder = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-identity-builder.tsx"),
      "utf8"
    );
    const voice = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx"),
      "utf8"
    );
    const form = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-form.tsx"),
      "utf8"
    );
    assert.doesNotMatch(builder, /rounded-lg border px-2 py-2 text-left text-xs/);
    assert.match(builder, /StudioCharacterIdentityStylePreviewCard/);
    assert.match(voice, /Kies een stem/);
    assert.match(voice, /Aanbevolen/);
    assert.match(voice, /Alle stemmen/);
    assert.match(voice, /Mijn stemmen/);
    assert.match(form, /Uiterlijk/);
    assert.match(form, /Stem & spraak/);
    assert.match(form, /Geavanceerde instellingen/);
    assert.match(form, /workflowStep/);
  });
});

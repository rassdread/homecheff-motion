import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  characterIdentityCompletenessTier,
  characterIdentityFormFromCharacter,
  characterIdentityFormToPatch,
  mapCharacterTypeToRole,
  resolveCharacterVoiceIdentityStatus,
} from "@/lib/studio-character-identity-fields";
import {
  listVisibleCharacterStyles,
  isAdvancedCharacterStyle,
} from "@/lib/studio-character-identity-presets";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { studioCharacterListItem } from "@/test/studio-api-fixtures";

describe("studio-character-identity-fields", () => {
  it("maps extended character type to db role", () => {
    assert.equal(mapCharacterTypeToRole("robot"), "object");
    assert.equal(mapCharacterTypeToRole("mascot"), "mascot");
  });

  it("round-trips structured visual keywords through form patch", () => {
    const character = studioCharacterListItem({
      id: "c1",
      name: "Chef Marco",
      role: "mascot",
      isMascot: true,
      visualKeywords:
        "hc:type=mascot,hc:style=3d_cartoon,hc:shape=rounded,hc:energy=friendly,hc:color=homecheff",
      defaultClothing: "Green apron",
      personality: "Warm chef",
      continuityNotes: "Kitchen promos\n\n[identity:forbidden]\nNo realistic blood",
    });

    const form = characterIdentityFormFromCharacter(character);
    assert.equal(form.characterType, "mascot");
    assert.equal(form.visualStyle, "3d_cartoon");
    assert.equal(form.shapeLanguage, "rounded");
    assert.equal(form.energy, "friendly");
    assert.equal(form.colorTheme, "homecheff");
    assert.equal(form.forbiddenElements, "No realistic blood");

    const patch = characterIdentityFormToPatch(form);
    assert.ok(patch.visualKeywords?.includes("hc:style=3d_cartoon"));
    assert.ok(patch.continuityNotes?.includes("[identity:forbidden]"));
  });

  it("computes completeness tier from identity engine", () => {
    const sparse = studioCharacterListItem({ id: "c1", name: "X" });
    const rich = studioCharacterListItem({
      id: "c1",
      name: "Chef Marco",
      description: "Chef",
      personality: "Warm",
      appearanceMemory: "Apron",
      visualKeywords: "hc:style=flat_cartoon,hc:energy=friendly",
      referenceImageUrl: "https://example.com/x.jpg",
    });
    const sparseScore = identityCompleteness(toIdentitySpec(sparse));
    const richScore = identityCompleteness(toIdentitySpec(rich));
    assert.equal(characterIdentityCompletenessTier(richScore), "complete");
    assert.equal(characterIdentityCompletenessTier(sparseScore), "missing");
  });

  it("resolves voice identity status", () => {
    assert.equal(
      resolveCharacterVoiceIdentityStatus(
        studioCharacterListItem({ id: "c1", name: "A", voiceEnabled: false, voiceProfile: "" })
      ),
      "none"
    );
    assert.equal(
      resolveCharacterVoiceIdentityStatus(
        studioCharacterListItem({
          id: "c1",
          name: "A",
          voiceEnabled: true,
          voiceProfile: "clone:abc",
        })
      ),
      "clone"
    );
    assert.equal(
      resolveCharacterVoiceIdentityStatus(
        studioCharacterListItem({
          id: "c1",
          name: "A",
          voiceEnabled: true,
          voiceProfile: "warm_narrator",
          voiceLock: true,
        })
      ),
      "locked"
    );
  });
});

describe("studio-character-identity-presets visibility", () => {
  it("hides advanced styles for simple users", () => {
    const simple = listVisibleCharacterStyles(false);
    assert.ok(simple.includes("flat_cartoon"));
    assert.ok(!simple.includes("cyberpunk"));
    assert.ok(isAdvancedCharacterStyle("cyberpunk"));
  });

  it("shows advanced styles when enabled", () => {
    const advanced = listVisibleCharacterStyles(true);
    assert.ok(advanced.includes("cyberpunk"));
  });
});

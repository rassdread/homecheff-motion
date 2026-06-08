import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { classifyVoiceAccent } from "@/lib/studio-voice-accent-model";
import {
  evaluatePersonaAccentMatch,
  voiceMatchesPersonaPreset,
} from "@/lib/studio-voice-persona-accent-match";
import {
  buildVoicePersonaPresets,
  findPersonaPresetById,
  scoreVoiceForPreset,
  VOICE_PERSONA_PRESET_DEFINITIONS,
} from "@/lib/studio-voice-persona-presets";
import {
  mockVoiceLibraryCatalog,
  type VoiceLibraryCatalog,
  type VoiceLibraryEntry,
} from "@/lib/studio-voice-library-catalog";

function voice(partial: Partial<VoiceLibraryEntry> & Pick<VoiceLibraryEntry, "id" | "name">): VoiceLibraryEntry {
  return {
    accent: "",
    gender: "",
    age: "",
    language: "en",
    description: "",
    labels: {},
    previewUrl: "",
    category: "premade",
    ...partial,
  };
}

function presetDef(id: string) {
  const def = VOICE_PERSONA_PRESET_DEFINITIONS.find((p) => p.id === id);
  assert.ok(def, `missing preset ${id}`);
  return def!;
}

describe("studio-voice-persona-accent-match strict rules", () => {
  it("Jamaican preset never matches American voices", () => {
    const jamaican = presetDef("jamaican_street_chef");
    const american = voice({
      id: "am-1",
      name: "Rachel",
      accent: "american",
      language: "en",
      labels: { accent: "american", language: "en" },
    });
    assert.equal(voiceMatchesPersonaPreset(american, jamaican), false);
    assert.equal(scoreVoiceForPreset(american, jamaican), 0);
  });

  it("British preset never matches American voices", () => {
    const british = presetDef("british_chef");
    const american = voice({
      id: "am-2",
      name: "Antoni",
      accent: "american",
      language: "en",
      labels: { accent: "american", language: "en" },
    });
    assert.equal(voiceMatchesPersonaPreset(american, british), false);
  });

  it("Dutch preset never matches English voices", () => {
    const dutch = presetDef("dutch_grower");
    const english = voice({
      id: "en-1",
      name: "Daniel",
      accent: "british",
      language: "en",
      labels: { accent: "british", language: "en" },
    });
    assert.equal(voiceMatchesPersonaPreset(english, dutch), false);
  });

  it("Jamaican preset matches Jamaican and Caribbean voices", () => {
    const jamaican = presetDef("jamaican_street_chef");
    const jVoice = voice({
      id: "jm-1",
      name: "Marcus",
      accent: "jamaican",
      language: "en",
      labels: { accent: "jamaican" },
    });
    const cVoice = voice({
      id: "cb-1",
      name: "Keisha",
      accent: "caribbean",
      language: "en",
      labels: { accent: "caribbean" },
    });
    assert.equal(voiceMatchesPersonaPreset(jVoice, jamaican), true);
    assert.equal(voiceMatchesPersonaPreset(cVoice, jamaican), true);
    assert.match(evaluatePersonaAccentMatch(jVoice, jamaican).matchingReason ?? "", /^canonical:/);
  });

  it("British preset matches en-GB locale metadata", () => {
    const british = presetDef("british_chef");
    const gbVoice = voice({
      id: "gb-1",
      name: "George",
      accent: "british",
      language: "en",
      labels: { accent: "british", locale: "en-GB" },
    });
    assert.equal(voiceMatchesPersonaPreset(gbVoice, british), true);
    assert.equal(classifyVoiceAccent(gbVoice.accent)?.id, "english.british");
  });

  it("Dutch preset matches nl-NL Dutch metadata only", () => {
    const dutch = presetDef("dutch_grower");
    const nlVoice = voice({
      id: "nl-1",
      name: "Sanne",
      accent: "dutch",
      language: "nl",
      labels: { accent: "dutch", language: "nl", locale: "nl-NL" },
    });
    const flemish = voice({
      id: "be-1",
      name: "Lucas",
      accent: "flemish",
      language: "nl",
      labels: { accent: "flemish", locale: "nl-BE" },
    });
    assert.equal(voiceMatchesPersonaPreset(nlVoice, dutch), true);
    assert.equal(voiceMatchesPersonaPreset(flemish, dutch), false);
  });

  it("Surinamese metadata does not satisfy Dutch Grower preset", () => {
    const dutch = presetDef("dutch_grower");
    const surinamese = voice({
      id: "sr-1",
      name: "Asha",
      accent: "surinamese",
      language: "nl",
      labels: { accent: "surinamese", language: "nl" },
    });
    assert.equal(voiceMatchesPersonaPreset(surinamese, dutch), false);
  });
});

describe("buildVoicePersonaPresets strict resolution", () => {
  it("live catalog with only American voices disables Jamaican and British presets", () => {
    const liveCatalog: VoiceLibraryCatalog = {
      version: 1,
      source: "elevenlabs",
      fetchedAt: new Date().toISOString(),
      voices: [
        voice({
          id: "only-american-female",
          name: "Generic Voice",
          accent: "american",
          gender: "female",
          language: "en",
          labels: { accent: "american", gender: "female", language: "en" },
        }),
        voice({
          id: "only-american-male",
          name: "Generic Male",
          accent: "american",
          gender: "male",
          language: "en",
          labels: { accent: "american", gender: "male", language: "en" },
        }),
      ],
    };

    const presets = buildVoicePersonaPresets(liveCatalog);
    const jamaican = presets.find((p) => p.id === "jamaican_street_chef");
    const british = presets.find((p) => p.id === "british_chef");
    const dutch = presets.find((p) => p.id === "dutch_grower");
    const american = presets.find((p) => p.id === "american_food_host");

    assert.ok(jamaican);
    assert.equal(jamaican!.available, false);
    assert.equal(jamaican!.voiceId, "");
    assert.equal(jamaican!.matchingReason, null);
    assert.equal(jamaican!.unavailableSuggestionKey, "studio.voicePersona.unavailable.browseOrClone");

    assert.ok(british);
    assert.equal(british!.available, false);

    assert.ok(dutch);
    assert.equal(dutch!.available, false);

    assert.ok(american);
    assert.equal(american!.available, true);
    assert.equal(american!.voiceId, "only-american-female");
    assert.ok(american!.matchingReason?.startsWith("canonical:"));
    assert.equal(american!.matchedAccentId, "english.american");
  });

  it("unavailable preset is disabled with empty voice id", () => {
    const catalog = mockVoiceLibraryCatalog();
    const presets = buildVoicePersonaPresets(catalog);
    const unavailable = presets.filter((p) => !p.available);
    for (const preset of unavailable) {
      assert.equal(preset.voiceId, "");
      assert.equal(preset.available, false);
      assert.equal(preset.matchingReason, null);
    }
  });

  it("available preset includes matchingReason and matched accent", () => {
    const catalog = mockVoiceLibraryCatalog();
    const british = findPersonaPresetById(catalog, "british_chef");
    assert.ok(british);
    assert.equal(british!.available, true);
    assert.ok(british!.matchingReason);
    assert.equal(british!.matchedAccentId, "english.british");
    assert.ok(british!.matchedAccentLabelKey);
    assert.ok(british!.voiceName.length > 0);
    assert.notEqual(british!.voiceName.toLowerCase(), "rachel");
  });

  it("Jamaican preset on mock catalog uses Jamaican voice not American", () => {
    const catalog = mockVoiceLibraryCatalog();
    const jamaican = findPersonaPresetById(catalog, "jamaican_street_chef");
    assert.ok(jamaican?.available);
    const matched = catalog.voices.find((v) => v.id === jamaican!.voiceId);
    assert.ok(matched);
    assert.ok(["jamaican", "caribbean"].includes(matched!.accent.toLowerCase()));
    assert.notEqual(classifyVoiceAccent(matched!.accent)?.id, "english.american");
  });

  it("Dutch preset on mock catalog uses Dutch voice not English", () => {
    const catalog = mockVoiceLibraryCatalog();
    const dutch = findPersonaPresetById(catalog, "dutch_grower");
    assert.ok(dutch?.available);
    const matched = catalog.voices.find((v) => v.id === dutch!.voiceId);
    assert.ok(matched);
    assert.equal(matched!.language, "nl");
    assert.equal(classifyVoiceAccent(matched!.accent)?.id, "dutch.nederlands");
  });

  it("African market farmer is unavailable when no South African voice exists", () => {
    const catalog = mockVoiceLibraryCatalog();
    const farmer = findPersonaPresetById(catalog, "african_market_farmer");
    assert.ok(farmer);
    assert.equal(farmer!.available, false);
  });
});

describe("persona preset UI transparency", () => {
  it("persona cards show matched accent and provider voice name", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-voice-library-section.tsx"),
      "utf8"
    );
    assert.match(src, /preset\.voiceName/);
    assert.match(src, /preset\.matchedAccentLabelKey/);
    assert.match(src, /preset\.matchingReason/);
    assert.match(src, /preset\.unavailableSuggestionKey/);
  });
});

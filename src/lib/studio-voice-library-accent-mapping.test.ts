import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyVoiceAccent, buildVoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import {
  inferAccentFromLocale,
  mapElevenLabsVoice,
  mockVoiceLibraryCatalog,
  normalizeLanguageCode,
  type VoiceLibraryCatalog,
} from "@/lib/studio-voice-library-catalog";
import { buildVoicePersonaPresets, MIN_PERSONA_MATCH_SCORE } from "@/lib/studio-voice-persona-presets";

describe("mapElevenLabsVoice accent metadata mapping", () => {
  it("Case 1: uses labels.accent when present", () => {
    const voice = mapElevenLabsVoice({
      voice_id: "abc123",
      name: "Daniel",
      labels: { accent: "british", gender: "male", age: "middle aged", language: "en" },
      preview_url: "https://example.com/d.mp3",
      category: "premade",
    });
    assert.ok(voice);
    assert.equal(voice!.accent, "british");
    assert.equal(voice!.language, "en");
    assert.equal(classifyVoiceAccent(voice!.accent)?.id, "english.british");
  });

  it("Case 2: uses verified_languages accent when labels are empty", () => {
    const voice = mapElevenLabsVoice({
      voice_id: "live-british",
      name: "George",
      labels: { gender: "male" },
      verified_languages: [
        {
          language: "en",
          locale: "en-GB",
          accent: "British",
          model_id: "eleven_multilingual_v2",
          preview_url: "https://example.com/gb.mp3",
        },
      ],
      category: "premade",
    });
    assert.ok(voice);
    assert.equal(voice!.accent.toLowerCase(), "british");
    assert.equal(voice!.language, "en");
    assert.equal(classifyVoiceAccent(voice!.accent)?.id, "english.british");
  });

  it("Case 3: locale nl-BE maps to flemish accent and nl language", () => {
    assert.equal(inferAccentFromLocale("nl-BE"), "flemish");
    assert.equal(normalizeLanguageCode("nl-BE"), "nl");

    const voice = mapElevenLabsVoice({
      voice_id: "live-flemish",
      name: "Lucas",
      labels: {},
      verified_languages: [
        {
          language: "nl",
          locale: "nl-BE",
          accent: null,
          model_id: "eleven_multilingual_v2",
        },
      ],
    });
    assert.ok(voice);
    assert.equal(voice!.language, "nl");
    assert.equal(voice!.accent, "flemish");
    assert.equal(classifyVoiceAccent(voice!.accent)?.id, "dutch.vlaams");
  });

  it("Case 4: latin american does not classify as american English", () => {
    assert.equal(classifyVoiceAccent("latin american")?.id, "spanish.latin_american");
    assert.notEqual(classifyVoiceAccent("latin american")?.id, "english.american");

    const voice = mapElevenLabsVoice({
      voice_id: "live-latin",
      name: "Mateo",
      labels: { accent: "latin american", language: "es" },
    });
    assert.ok(voice);
    assert.equal(classifyVoiceAccent(voice!.accent)?.id, "spanish.latin_american");
  });

  it("Case 5: mock catalog still builds rich filters", () => {
    const catalog = mockVoiceLibraryCatalog();
    const filters = buildVoiceLibraryFilterOptions(catalog);
    assert.equal(catalog.source, "mock");
    assert.ok(filters.accents.some((a) => a.id === "english.british"));
    assert.ok(filters.accents.some((a) => a.id === "dutch.vlaams"));
    assert.ok(filters.languages.some((l) => l.value === "nl"));
  });

  it("Case 6: live-like catalog does not assign random persona when no match", () => {
    const liveCatalog: VoiceLibraryCatalog = {
      version: 1,
      source: "elevenlabs",
      fetchedAt: new Date().toISOString(),
      voices: [
        {
          id: "only-american-female",
          name: "Generic Voice",
          accent: "american",
          gender: "female",
          age: "young",
          language: "en",
          description: "",
          labels: { accent: "american", gender: "female", language: "en" },
          previewUrl: "",
          category: "premade",
        },
      ],
    };

    const presets = buildVoicePersonaPresets(liveCatalog);
    const jamaican = presets.find((p) => p.id === "jamaican_street_chef");
    const dutch = presets.find((p) => p.id === "dutch_grower");

    assert.ok(jamaican);
    assert.equal(jamaican!.available, false);
    assert.equal(jamaican!.voiceId, "");

    assert.ok(dutch);
    assert.equal(dutch!.available, false);

    const americanHost = presets.find((p) => p.id === "american_food_host");
    assert.ok(americanHost);
    assert.equal(americanHost!.available, true);
    assert.equal(americanHost!.voiceId, "only-american-female");
    assert.ok(
      americanHost!.resolved ||
        buildVoicePersonaPresets(liveCatalog).some((p) => p.available)
    );
  });

  it("maps verified_languages language without hardcoded EN fallback", () => {
    const voice = mapElevenLabsVoice({
      voice_id: "nl-voice",
      name: "Sanne",
      labels: {},
      verified_languages: [
        {
          language: "nl",
          locale: "nl-NL",
          accent: "Dutch",
          model_id: "eleven_multilingual_v2",
        },
      ],
    });
    assert.ok(voice);
    assert.equal(voice!.language, "nl");
    assert.equal(voice!.accent.toLowerCase(), "dutch");
  });

  it("requires minimum persona score of 5", () => {
    assert.equal(MIN_PERSONA_MATCH_SCORE, 5);
  });
});

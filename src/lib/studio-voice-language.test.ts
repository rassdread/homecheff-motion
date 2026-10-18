import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildVoiceLibraryCatalog,
  clearVoiceLibraryCatalogCacheForTests,
  mapElevenLabsVoice,
} from "@/lib/studio-voice-library-catalog";
import { mapElevenLabsSharedVoice } from "@/lib/studio-voice-shared-catalog";
import {
  canonicalVoiceAge,
  canonicalVoiceLanguage,
  sortVoiceLanguageOptions,
  voiceLanguageLabel,
} from "@/lib/studio-voice-language";

describe("voice language identifiers", () => {
  it("maps verified codes and names without merging Filipino and Tagalog", () => {
    assert.equal(canonicalVoiceLanguage("EN"), "en");
    assert.equal(canonicalVoiceLanguage("ENGLISH"), "en");
    assert.equal(canonicalVoiceLanguage("en-GB"), "en");
    assert.equal(canonicalVoiceLanguage("eng"), "en");
    assert.equal(canonicalVoiceLanguage("NL"), "nl");
    assert.equal(canonicalVoiceLanguage("nederlands"), "nl");
    assert.equal(canonicalVoiceLanguage("DE"), "de");
    assert.equal(canonicalVoiceLanguage("ES"), "es");
    assert.equal(canonicalVoiceLanguage("FIL"), "fil");
    assert.equal(canonicalVoiceLanguage("filipino"), "fil");
    assert.equal(canonicalVoiceLanguage("tl"), "tl");
    assert.equal(canonicalVoiceLanguage("xx-custom"), "xx");
    assert.equal(canonicalVoiceLanguage(""), "");
    assert.equal(voiceLanguageLabel("en"), "Engels");
    assert.equal(voiceLanguageLabel("fil"), "Filipijns");
    assert.equal(voiceLanguageLabel("xx"), "xx");
    assert.equal(canonicalVoiceAge("Middle Aged"), "middle_aged");
    assert.equal(canonicalVoiceAge("middle_aged"), "middle_aged");
    assert.equal(canonicalVoiceAge("young"), "young");
  });

  it("puts popular languages first and keeps the rest alphabetical in Dutch", () => {
    const sorted = sortVoiceLanguageOptions([
      { value: "ja" },
      { value: "es" },
      { value: "de" },
      { value: "nl" },
      { value: "fr" },
      { value: "en" },
    ]).map((option) => option.value);
    assert.deepEqual(sorted, ["nl", "en", "de", "fr", "es", "ja"]);
  });

  it("keeps the provider language while storing the canonical code", () => {
    const voice = mapElevenLabsVoice({
      voice_id: "voice-en",
      name: "Ada",
      labels: { language: "ENGLISH", accent: "british", gender: "female" },
    });
    assert.equal(voice?.language, "en");
    assert.equal(voice?.labels.provider_language, "ENGLISH");
    const shared = mapElevenLabsSharedVoice({
      voice_id: "voice-shared",
      name: "Luz",
      language: "ES",
      descriptive: "calm",
      use_case: "narrative",
      locale: "es-ES",
    });
    assert.equal(shared?.language, "es");
    assert.equal(shared?.labels.provider_language, "ES");
    assert.equal(shared?.labels.descriptive, "calm");
    assert.equal(shared?.labels.use_case, "narrative");
    assert.equal(shared?.labels.locale, "es-ES");
  });
});

describe("voice catalog cache", () => {
  it("uses one load when two callers ask at the same time and no provider key is set", async () => {
    if (process.env.ELEVENLABS_API_KEY?.trim()) {
      return;
    }
    clearVoiceLibraryCatalogCacheForTests();
    const [first, second] = await Promise.all([
      buildVoiceLibraryCatalog(),
      buildVoiceLibraryCatalog(),
    ]);
    assert.equal(first, second);
    assert.equal(first.source, "mock");
    clearVoiceLibraryCatalogCacheForTests();
  });
});

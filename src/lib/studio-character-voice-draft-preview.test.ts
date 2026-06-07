import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCharacterVoicePreviewBody,
  characterVoicePreviewEndpoint,
  resolveDefaultCharacterPreviewText,
} from "@/lib/studio-character-voice-preview-client";
import {
  resolveCharacterVoicePreviewScript,
} from "@/server/studio/synthesize-character-voice-preview";
import { defaultCharacterVoicePreviewLine } from "@/lib/studio-character-voice";

describe("studio-character-voice-draft-preview", () => {
  it("routes draft preview when characterId is missing", () => {
    assert.equal(
      characterVoicePreviewEndpoint(null),
      "/api/studio/characters/voice-preview-draft"
    );
  });

  it("routes saved preview when characterId exists", () => {
    assert.equal(
      characterVoicePreviewEndpoint("char-1"),
      "/api/studio/characters/char-1/voice-preview"
    );
  });

  it("builds draft preview body from form state", () => {
    const body = buildCharacterVoicePreviewBody({
      characterId: null,
      characterName: "Chef Sergio",
      voiceProfile: "warm_narrator",
      language: "nl",
      sampleLine: "Welkom bij HomeCheff.",
    });
    assert.equal(body.characterName, "Chef Sergio");
    assert.equal(body.voiceProfile, "warm_narrator");
    assert.equal(body.voiceLanguage, "nl");
    assert.equal(body.sampleLine, "Welkom bij HomeCheff.");
  });

  it("builds saved preview body with unsaved overrides", () => {
    const body = buildCharacterVoicePreviewBody({
      characterId: "char-1",
      characterName: "Chef Sergio",
      voiceProfile: "documentary",
      language: "en",
      sampleLine: "Hello from the form.",
    });
    assert.equal(body.language, "en");
    assert.equal(body.voiceProfile, "documentary");
    assert.equal(body.characterName, "Chef Sergio");
    assert.equal(body.sampleLine, "Hello from the form.");
    assert.equal("voiceLanguage" in body, false);
  });

  it("uses default preview text per language", () => {
    assert.equal(
      resolveDefaultCharacterPreviewText("Sergio", "nl"),
      defaultCharacterVoicePreviewLine("Sergio", "nl")
    );
    assert.match(resolveDefaultCharacterPreviewText("Sergio", "en"), /Sergio/);
  });

  it("respects preview text override in script resolution", () => {
    const script = resolveCharacterVoicePreviewScript({
      characterName: "Chef",
      language: "nl",
      sampleLine: "Vandaag laat ik je iets bijzonders zien.",
    });
    assert.equal(script, "Vandaag laat ik je iets bijzonders zien.");
  });

  it("falls back to default line when sample text empty", () => {
    const script = resolveCharacterVoicePreviewScript({
      characterName: "Chef Sergio",
      language: "en",
    });
    assert.equal(script, "Hello, I am Chef Sergio.");
  });

  it("i18n default lines match nl and en expectations", () => {
    assert.equal(defaultCharacterVoicePreviewLine("Sergio", "nl"), "Hallo, ik ben Sergio.");
    assert.equal(defaultCharacterVoicePreviewLine("Sergio", "en"), "Hello, I am Sergio.");
  });
});

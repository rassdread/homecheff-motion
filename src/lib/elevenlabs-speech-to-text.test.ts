import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeSttLanguageCode,
  parseElevenLabsSpeechToTextResponse,
  transcribeMockSpeech,
} from "@/lib/elevenlabs-speech-to-text";

describe("elevenlabs-speech-to-text", () => {
  it("normalizes supported language codes", () => {
    assert.equal(normalizeSttLanguageCode("nl-NL"), "nl");
    assert.equal(normalizeSttLanguageCode("xx"), undefined);
  });

  it("parses word-level API response", () => {
    const result = parseElevenLabsSpeechToTextResponse({
      text: "Hello world",
      language_code: "en",
      words: [
        { text: "Hello", start: 0, end: 0.4, type: "word" },
        { text: " ", start: 0.4, end: 0.4, type: "spacing" },
        { text: "world", start: 0.4, end: 0.9, type: "word" },
      ],
    });
    assert.equal(result.provider, "elevenlabs");
    assert.equal(result.text, "Hello world");
    assert.equal(result.words.length, 3);
    assert.ok(result.durationSeconds >= 0.9);
  });

  it("mock transcribe returns timed words", async () => {
    const result = transcribeMockSpeech({
      audioUrl: "https://example.com/audio.mp3",
      languageCode: "en",
      fallbackScript: "One two three",
      expectedDurationSeconds: 3,
    });
    assert.equal(result.provider, "mock");
    assert.equal(result.words.length, 3);
    assert.equal(result.durationSeconds, 3);
  });
});

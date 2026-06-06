import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSubtitleEntriesFromTranscriptWords } from "@/lib/studio-subtitle-track";
import { transcribeMockSpeech } from "@/lib/elevenlabs-speech-to-text";

describe("studio speech-to-text foundation flow", () => {
  it("audio → transcript words → subtitle entries", () => {
    const transcript = transcribeMockSpeech({
      audioUrl: "https://blob.example/voice.mp3",
      languageCode: "nl",
      fallbackScript: "Welkom bij HomeCheff. Samen koken we lokaal.",
      expectedDurationSeconds: 6,
    });

    const entries = buildSubtitleEntriesFromTranscriptWords(transcript.words);
    assert.ok(entries.length >= 1);
    assert.ok(entries.every((e) => e.end >= e.start && e.text.trim().length > 0));
    assert.ok(transcript.durationSeconds > 0);
  });
});

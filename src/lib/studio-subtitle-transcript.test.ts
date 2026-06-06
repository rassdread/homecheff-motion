import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSrtFromSubtitleEntries,
  buildSubtitleEntriesFromTranscriptWords,
} from "@/lib/studio-subtitle-track";

describe("buildSubtitleEntriesFromTranscriptWords", () => {
  it("groups words into readable subtitle lines", () => {
    const entries = buildSubtitleEntriesFromTranscriptWords([
      { text: "Welcome", start: 0, end: 0.3, type: "word" },
      { text: "to", start: 0.3, end: 0.45, type: "word" },
      { text: "HomeCheff", start: 0.45, end: 0.9, type: "word" },
      { text: "community", start: 1, end: 1.5, type: "word" },
      { text: "kitchen", start: 1.5, end: 1.9, type: "word" },
    ]);
    assert.ok(entries.length >= 1);
    assert.match(entries[0]!.text, /Welcome/);
    assert.ok(entries[0]!.end > entries[0]!.start);
  });

  it("skips spacing tokens", () => {
    const entries = buildSubtitleEntriesFromTranscriptWords([
      { text: "Hi", start: 0, end: 0.2, type: "word" },
      { text: " ", start: 0.2, end: 0.2, type: "spacing" },
      { text: "there", start: 0.2, end: 0.5, type: "word" },
    ]);
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.text, "Hi there");
  });

  it("builds valid SRT from transcript entries", () => {
    const entries = buildSubtitleEntriesFromTranscriptWords([
      { text: "Line", start: 0, end: 1, type: "word" },
      { text: "one", start: 1, end: 2, type: "word" },
    ]);
    const srt = buildSrtFromSubtitleEntries(entries);
    assert.match(srt, /-->/);
    assert.match(srt, /Line/);
  });
});

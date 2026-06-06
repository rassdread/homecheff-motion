import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveStoryboardTranscriptStatus,
  transcriptStatusLabelKey,
} from "@/lib/studio-subtitle-readiness";

describe("studio-subtitle-readiness", () => {
  it("marks transcript ready when entries exist and voice enabled", () => {
    const status = resolveStoryboardTranscriptStatus({
      voiceEnabled: true,
      audioUrl: "https://example.com/a.mp3",
      audioDurationSeconds: 12,
      subtitleEntries: [{ start: 0, end: 2, text: "Hello" }],
    });
    assert.equal(status.ready, true);
    assert.equal(status.lineCount, 1);
    assert.equal(transcriptStatusLabelKey(status), "studio.transcript.status.ready");
  });

  it("marks transcript missing when voice enabled but no entries", () => {
    const status = resolveStoryboardTranscriptStatus({
      voiceEnabled: true,
      audioUrl: "https://example.com/a.mp3",
      subtitleEntries: [],
    });
    assert.equal(status.ready, false);
    assert.equal(transcriptStatusLabelKey(status), "studio.transcript.status.missing");
  });

  it("ignores transcript when voice disabled", () => {
    const status = resolveStoryboardTranscriptStatus({
      voiceEnabled: false,
      subtitleEntries: [{ start: 0, end: 1, text: "Hi" }],
    });
    assert.equal(status.ready, false);
  });
});

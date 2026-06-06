import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateUploadedAudioDurationSeconds,
  validateStudioAudioUpload,
} from "@/lib/studio-audio-upload-validation";
import {
  isUploadedStoryboardVoice,
  parseStoryboardVoiceMetadata,
  storyboardVoiceDisplayName,
} from "@/lib/studio-storyboard-audio";
import {
  audioLinkedStatusLabelKey,
  resolveStoryboardTranscriptStatus,
  subtitleStatusLabelKey,
  transcriptStatusLabelKey,
} from "@/lib/studio-subtitle-readiness";

describe("studio-audio-upload-validation", () => {
  it("accepts mp3 wav and m4a", () => {
    for (const fileName of ["clip.mp3", "clip.wav", "clip.m4a"]) {
      const result = validateStudioAudioUpload({
        buffer: Buffer.alloc(2048),
        fileName,
      });
      assert.equal(result.ok, true);
    }
  });

  it("rejects unsupported formats", () => {
    const result = validateStudioAudioUpload({
      buffer: Buffer.alloc(2048),
      fileName: "clip.ogg",
    });
    assert.equal(result.ok, false);
  });

  it("estimates duration from buffer size", () => {
    const seconds = estimateUploadedAudioDurationSeconds(Buffer.alloc(16000), "mp3");
    assert.ok(seconds >= 1);
  });
});

describe("studio-storyboard-audio", () => {
  it("detects uploaded provider voices", () => {
    assert.equal(isUploadedStoryboardVoice({ provider: "upload" }), true);
    assert.equal(
      isUploadedStoryboardVoice({ provider: "elevenlabs", providerMetadata: { source: "upload" } }),
      true
    );
    assert.equal(isUploadedStoryboardVoice({ provider: "elevenlabs" }), false);
  });

  it("parses display metadata", () => {
    const meta = parseStoryboardVoiceMetadata({
      source: "upload",
      displayName: "Intro",
      fileName: "intro.mp3",
    });
    assert.equal(meta.displayName, "Intro");
    assert.equal(
      storyboardVoiceDisplayName({ provider: "upload", providerMetadata: meta, voiceProfile: "" }),
      "Intro"
    );
  });
});

describe("studio-subtitle-readiness external audio", () => {
  it("marks transcript ready with external audio and subtitle lines", () => {
    const status = resolveStoryboardTranscriptStatus({
      voiceEnabled: false,
      hasExternalAudio: true,
      audioUrl: "https://example.com/audio.mp3",
      subtitleEntries: [{ start: 0, end: 2, text: "Hello" }],
    });
    assert.equal(status.ready, true);
    assert.equal(transcriptStatusLabelKey(status), "studio.transcript.status.ready");
    assert.equal(audioLinkedStatusLabelKey(status), "studio.externalAudio.status.linked");
    assert.equal(subtitleStatusLabelKey(status), "studio.externalAudio.subtitles.created");
  });

  it("marks audio missing when no url", () => {
    const status = resolveStoryboardTranscriptStatus({
      voiceEnabled: true,
      audioUrl: null,
      subtitleEntries: [],
    });
    assert.equal(audioLinkedStatusLabelKey(status), "studio.externalAudio.status.missing");
  });
});

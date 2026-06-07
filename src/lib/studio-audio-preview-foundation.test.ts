import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createAudioFileObjectUrl,
  revokeAudioFileObjectUrl,
} from "@/lib/studio-audio-preview-object-url";
import {
  audioPreviewSourceLabelKey,
  isAudioPreviewPlayable,
} from "@/lib/studio-audio-preview-source";
import type { StudioAudioPreviewSource } from "@/types/studio-audio-preview";

describe("studio-audio-preview", () => {
  it("isAudioPreviewPlayable detects valid URLs", () => {
    assert.equal(isAudioPreviewPlayable("https://example.com/a.mp3"), true);
    assert.equal(isAudioPreviewPlayable("  "), false);
    assert.equal(isAudioPreviewPlayable(null), false);
  });

  it("maps all preview sources to i18n keys", () => {
    const sources: StudioAudioPreviewSource[] = [
      "voice_tts",
      "voice_character",
      "voice_clone",
      "voice_clone_sample",
      "narration_upload",
      "music_upload",
      "sfx_upload",
      "mix_narration",
      "mix_music",
      "mix_sfx",
      "subtitle_narration",
      "motion_voice",
    ];
    for (const source of sources) {
      assert.ok(audioPreviewSourceLabelKey(source).startsWith("studio.audioPreview.source."));
    }
  });

  it("creates and revokes blob object URLs for local files", () => {
    const file = new File(["audio-bytes"], "sample.mp3", { type: "audio/mpeg" });
    const url = createAudioFileObjectUrl(file);
    assert.ok(url?.startsWith("blob:"));
    revokeAudioFileObjectUrl(url);
  });

  it("voice TTS source key is stable for player reuse", () => {
    assert.equal(audioPreviewSourceLabelKey("voice_tts"), "studio.audioPreview.source.voiceTts");
  });

  it("music upload source key supports library playback", () => {
    assert.equal(audioPreviewSourceLabelKey("music_upload"), "studio.audioPreview.source.musicUpload");
  });

  it("sfx upload source key supports library playback", () => {
    assert.equal(audioPreviewSourceLabelKey("sfx_upload"), "studio.audioPreview.source.sfxUpload");
  });

  it("subtitle narration source supports subtitle tab audio", () => {
    assert.equal(
      audioPreviewSourceLabelKey("subtitle_narration"),
      "studio.audioPreview.source.subtitleNarration"
    );
  });

  it("clone sample source is distinct from clone result preview", () => {
    assert.notEqual(
      audioPreviewSourceLabelKey("voice_clone_sample"),
      audioPreviewSourceLabelKey("voice_clone")
    );
  });

  it("mix sources cover narration music and sfx lanes", () => {
    assert.equal(audioPreviewSourceLabelKey("mix_narration"), "studio.audioPreview.source.mixNarration");
    assert.equal(audioPreviewSourceLabelKey("mix_music"), "studio.audioPreview.source.mixMusic");
    assert.equal(audioPreviewSourceLabelKey("mix_sfx"), "studio.audioPreview.source.mixSfx");
  });
});

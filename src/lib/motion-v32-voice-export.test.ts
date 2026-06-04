import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMotionStudioAudioExportFromHandoff,
  buildVoiceExportRenderSnapshot,
  parseMotionStudioAudioExport,
  resolveMotionStudioAudioExport,
  shouldApplyStudioVoiceMux,
  shouldBurnStudioSubtitles,
} from "@/lib/motion-voice-export";
import {
  buildStudioNarrationAssContent,
  buildStudioVoiceMuxFfmpegArgs,
} from "@/lib/studio-voice-ffmpeg";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

const handoffWithVoice: Pick<
  MotionHandoffPayload,
  "voiceMetadata" | "subtitleTrack" | "subtitleAvailability"
> = {
  voiceMetadata: {
    ready: true,
    language: "nl",
    provider: "mock",
    voiceProfile: "default",
    voiceStyle: "",
    durationSeconds: 12,
    audioUrl: "https://cdn.example/voice.mp3",
  },
  subtitleAvailability: true,
  subtitleTrack: {
    language: "nl",
    available: true,
    entries: [{ start: 0, end: 2, text: "Hello" }],
    srt: "1\n00:00:00,000 --> 00:00:02,000\nHello\n",
  },
};

describe("Motion V32 — voice export", () => {
  it("builds motion audio export from handoff v12", () => {
    const exp = buildMotionStudioAudioExportFromHandoff(handoffWithVoice);
    assert.equal(exp.voiceAudioUrl, "https://cdn.example/voice.mp3");
    assert.equal(exp.voiceLanguage, "nl");
    assert.equal(exp.subtitleMode, "burn_in");
    assert.equal(exp.subtitleTrack?.entries.length, 1);
  });

  it("stores and reads motionAudioExport from studioHandoffJson", () => {
    const exp = buildMotionStudioAudioExportFromHandoff(handoffWithVoice);
    const stored = { motionAudioExport: exp, voiceMetadata: handoffWithVoice.voiceMetadata };
    const read = resolveMotionStudioAudioExport({ studioHandoffJson: stored });
    assert.equal(read?.voiceAudioUrl, exp.voiceAudioUrl);
  });

  it("voice mux ffmpeg args trim audio to video duration", () => {
    const args = buildStudioVoiceMuxFfmpegArgs({
      videoPath: "/tmp/v.mp4",
      audioPath: "/tmp/a.mp3",
      outputPath: "/tmp/out.mp4",
      videoDurationSeconds: 8,
    });
    assert.ok(args.includes("-t"));
    assert.equal(args[args.indexOf("-t") + 1], "8");
    assert.ok(args.includes("-map"));
  });

  it("subtitle ASS includes dialogue lines", () => {
    const ass = buildStudioNarrationAssContent({
      entries: [{ start: 1, end: 3, text: "Test line" }],
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /Dialogue:/);
    assert.match(ass, /Test line/);
    assert.match(ass, /StudioNarration/);
  });

  it("shouldApplyStudioVoiceMux respects voiceEnabled", () => {
    const exp = buildMotionStudioAudioExportFromHandoff(handoffWithVoice);
    assert.equal(shouldApplyStudioVoiceMux(exp), true);
    assert.equal(shouldApplyStudioVoiceMux({ ...exp, voiceEnabled: false }), false);
  });

  it("shouldBurnStudioSubtitles requires burn_in mode", () => {
    const exp = buildMotionStudioAudioExportFromHandoff(handoffWithVoice);
    assert.equal(shouldBurnStudioSubtitles(exp), true);
    assert.equal(
      shouldBurnStudioSubtitles({ ...exp, subtitleMode: "metadata_only" }),
      false
    );
  });

  it("render snapshot records mux flags", () => {
    const exp = buildMotionStudioAudioExportFromHandoff(handoffWithVoice);
    const snap = buildVoiceExportRenderSnapshot({
      ...exp,
      lastMux: { audioMuxed: true, subtitleBurned: false, at: "2026-01-01T00:00:00.000Z", error: null },
    });
    assert.equal(snap?.audioMuxed, true);
  });

  it("legacy project without handoff voice returns null", () => {
    assert.equal(resolveMotionStudioAudioExport({ studioHandoffJson: null }), null);
  });

  it("parseMotionStudioAudioExport round-trips", () => {
    const exp = buildMotionStudioAudioExportFromHandoff(handoffWithVoice);
    const parsed = parseMotionStudioAudioExport(exp);
    assert.equal(parsed?.voiceProvider, "mock");
  });
});

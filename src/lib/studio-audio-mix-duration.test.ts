import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudioAudioMixFilterComplex,
  buildStudioAudioMixFfmpegArgs,
} from "@/lib/studio-audio-mix-ffmpeg";

const TEN_S_PLAN = {
  totalDurationSeconds: 10,
  voiceVolume: 1,
  musicVolume: 0.7,
  soundVolume: 0.35,
  musicFadeInSeconds: 0.3,
  musicFadeOutSeconds: 0.5,
  musicHardCut: false,
  voiceAudioUrl: null,
  musicAudioUrl: null,
  soundAudioUrl: null,
  musicAssetName: null,
  soundAssetName: null,
  sceneSegments: [],
  mixReady: true,
  discreteSfx: [
    {
      cueId: "early",
      url: "/tmp/sfx1.mp3",
      startSeconds: 1.0,
      durationSeconds: 0.3,
      volume: 0.9,
      assetId: "s1",
    },
    {
      cueId: "late",
      url: "/tmp/sfx2.mp3",
      startSeconds: 5.5,
      durationSeconds: 0.25,
      volume: 0.9,
      assetId: "s2",
    },
  ],
  duckingEnvelopes: [
    {
      startSeconds: 2,
      endSeconds: 4.5,
      musicGain: 0.25,
      ambienceGain: 0.9,
      attackSeconds: 0.15,
      releaseSeconds: 0.35,
    },
  ],
};

describe("studio-audio-mix duration safety (cert P1)", () => {
  it("uses duration=longest so short voice does not truncate late SFX", () => {
    const { filterComplex } = buildStudioAudioMixFilterComplex({
      plan: TEN_S_PLAN,
      hasVoice: true,
      hasMusic: true,
      hasSound: true,
    });
    assert.match(filterComplex, /duration=longest/);
    assert.doesNotMatch(filterComplex, /duration=first/);
    assert.match(filterComplex, /adelay=5500\|5500/);
  });

  it("pads voice to full plan duration", () => {
    const { filterComplex } = buildStudioAudioMixFilterComplex({
      plan: TEN_S_PLAN,
      hasVoice: true,
      hasMusic: true,
      hasSound: false,
    });
    assert.match(filterComplex, /apad,atrim=0:10\.000/);
  });

  it("voice-absent graph still spans plan duration for music and late SFX", () => {
    const { filterComplex } = buildStudioAudioMixFilterComplex({
      plan: TEN_S_PLAN,
      hasVoice: false,
      hasMusic: true,
      hasSound: true,
    });
    assert.match(filterComplex, /atrim=0:10\.000/);
    assert.match(filterComplex, /adelay=5500\|5500/);
  });

  it("ffmpeg args cap output at plan duration", () => {
    const { filterComplex, outputLabel } = buildStudioAudioMixFilterComplex({
      plan: TEN_S_PLAN,
      hasVoice: true,
      hasMusic: true,
      hasSound: false,
    });
    const args = buildStudioAudioMixFfmpegArgs({
      inputPaths: ["/v.mp3", "/m.mp3"],
      outputPath: "/out.m4a",
      filterComplex,
      outputLabel,
      durationSeconds: 10,
    });
    assert.ok(args.includes("-t"));
    assert.ok(args.includes("10"));
  });

  it("ducking envelopes remain in music chain", () => {
    const { filterComplex } = buildStudioAudioMixFilterComplex({
      plan: TEN_S_PLAN,
      hasVoice: true,
      hasMusic: true,
      hasSound: false,
    });
    assert.match(filterComplex, /eval=frame/);
    assert.match(filterComplex, /between\(t/);
  });
});

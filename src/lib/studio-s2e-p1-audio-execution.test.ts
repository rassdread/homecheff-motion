/**
 * S2E-P1 — Ducking runtime + SFX asset resolve closeout tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTimedVolumeFilter,
  mergeDuckingEnvelopes,
  DUCKING_MERGE_GAP_SECONDS,
} from "@/lib/studio-audio-ducking";
import {
  audioAssetCacheKey,
  compactDiscreteSfxForMix,
  resolveDiscreteSfxPathsForMixNullable,
} from "@/lib/studio-audio-mix-assets";
import { buildStudioAudioMixFilterComplex } from "@/lib/studio-audio-mix-ffmpeg";
import {
  buildAudioMixExecutionPlan,
  resolveStudioAudioTimeline,
} from "@/lib/studio-audio-timeline-resolve";

describe("S2E-P1 ducking envelope merge", () => {
  it("merges adjacent cues within gap", () => {
    const merged = mergeDuckingEnvelopes(
      [
        {
          startSeconds: 2,
          endSeconds: 4,
          musicGain: 0.35,
          ambienceGain: 0.5,
          attackSeconds: 0.08,
          releaseSeconds: 0.2,
        },
        {
          startSeconds: 4.1,
          endSeconds: 6,
          musicGain: 0.35,
          ambienceGain: 0.5,
          attackSeconds: 0.08,
          releaseSeconds: 0.2,
        },
      ],
      DUCKING_MERGE_GAP_SECONDS
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0]!.startSeconds, 2);
    assert.equal(merged[0]!.endSeconds, 6);
  });

  it("does not compound overlapping gains", () => {
    const merged = mergeDuckingEnvelopes([
      {
        startSeconds: 1,
        endSeconds: 3,
        musicGain: 0.35,
        ambienceGain: 0.5,
        attackSeconds: 0.08,
        releaseSeconds: 0.2,
      },
      {
        startSeconds: 2,
        endSeconds: 4,
        musicGain: 0.2,
        ambienceGain: 0.4,
        attackSeconds: 0.08,
        releaseSeconds: 0.2,
      },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]!.musicGain, 0.2);
    assert.equal(merged[0]!.ambienceGain, 0.4);
  });

  it("keeps distant cues separate", () => {
    const merged = mergeDuckingEnvelopes([
      {
        startSeconds: 1,
        endSeconds: 2,
        musicGain: 0.35,
        ambienceGain: 0.5,
        attackSeconds: 0.08,
        releaseSeconds: 0.2,
      },
      {
        startSeconds: 5,
        endSeconds: 6,
        musicGain: 0.35,
        ambienceGain: 0.5,
        attackSeconds: 0.08,
        releaseSeconds: 0.2,
      },
    ]);
    assert.equal(merged.length, 2);
  });
});

describe("S2E-P1 FFmpeg timed volume", () => {
  it("no envelopes → static volume", () => {
    assert.equal(
      buildTimedVolumeFilter({ baseVolume: 0.4, envelopes: [], gainKey: "musicGain" }),
      "volume=0.400"
    );
  });

  it("single voice duck embeds between(t)", () => {
    const f = buildTimedVolumeFilter({
      baseVolume: 0.4,
      envelopes: [
        {
          startSeconds: 2,
          endSeconds: 5,
          musicGain: 0.35,
          ambienceGain: 0.5,
          attackSeconds: 0.08,
          releaseSeconds: 0.2,
        },
      ],
      gainKey: "musicGain",
    });
    assert.match(f, /eval=frame/);
    assert.match(f, /between\(t/);
    assert.match(f, /0\.140/); // 0.4 * 0.35
    assert.match(f, /0\.400/);
  });

  it("filter complex uses timed music volume when envelopes present", () => {
    const { filterComplex } = buildStudioAudioMixFilterComplex({
      plan: {
        totalDurationSeconds: 10,
        voiceVolume: 1,
        musicVolume: 0.4,
        soundVolume: 0.3,
        musicFadeInSeconds: 0,
        musicFadeOutSeconds: 0,
        discreteSfx: [],
        musicSourceOffsetSeconds: 1.5,
        duckingEnvelopes: [
          {
            startSeconds: 2,
            endSeconds: 4,
            musicGain: 0.35,
            ambienceGain: 0.5,
            attackSeconds: 0.08,
            releaseSeconds: 0.2,
          },
        ],
      },
      hasVoice: true,
      hasMusic: true,
      hasSound: false,
    });
    assert.match(filterComplex, /atrim=1\.500/);
    assert.match(filterComplex, /eval=frame/);
    assert.match(filterComplex, /between\(t/);
    assert.doesNotMatch(filterComplex, /volume=0\.400\[a/);
  });

  it("no voice / no envelopes keeps simple music volume", () => {
    const { filterComplex } = buildStudioAudioMixFilterComplex({
      plan: {
        totalDurationSeconds: 8,
        voiceVolume: 1,
        musicVolume: 0.5,
        soundVolume: 0.3,
        musicFadeInSeconds: 0,
        musicFadeOutSeconds: 0,
        discreteSfx: [],
        duckingEnvelopes: [],
      },
      hasVoice: false,
      hasMusic: true,
      hasSound: false,
    });
    assert.match(filterComplex, /volume=0\.500/);
    assert.doesNotMatch(filterComplex, /eval=frame/);
  });

  it("multi-speaker envelopes appear in graph after merge", () => {
    const { filterComplex } = buildStudioAudioMixFilterComplex({
      plan: {
        totalDurationSeconds: 12,
        voiceVolume: 1,
        musicVolume: 0.4,
        soundVolume: 0.2,
        musicFadeInSeconds: 0,
        musicFadeOutSeconds: 0,
        discreteSfx: [
          {
            cueId: "flash1",
            url: "https://cdn.example/flash.wav",
            startSeconds: 1.1,
            durationSeconds: 0.2,
            volume: 0.8,
            assetId: "flash",
          },
        ],
        duckingEnvelopes: [
          {
            startSeconds: 1,
            endSeconds: 2.8,
            musicGain: 0.35,
            ambienceGain: 0.5,
            attackSeconds: 0.08,
            releaseSeconds: 0.2,
          },
          {
            startSeconds: 3.1,
            endSeconds: 5,
            musicGain: 0.35,
            ambienceGain: 0.5,
            attackSeconds: 0.08,
            releaseSeconds: 0.2,
          },
        ],
      },
      hasVoice: true,
      hasMusic: true,
      hasSound: false,
    });
    assert.match(filterComplex, /adelay=1100\|1100/);
    assert.match(filterComplex, /eval=frame/);
    assert.match(filterComplex, /amix=inputs=3/);
  });
});

describe("S2E-P1 SFX asset resolve", () => {
  it("strips signed query from cache key", () => {
    assert.equal(
      audioAssetCacheKey("https://cdn.example/a.wav?X-Amz-Signature=abc"),
      "https://cdn.example/a.wav"
    );
    assert.equal(audioAssetCacheKey("/tmp/local.wav"), "/tmp/local.wav");
  });

  it("downloads unique remote once for 3 cues", async () => {
    const downloads: string[] = [];
    const cues = [
      { url: "https://cdn.example/flash.wav?sig=1", cueId: "a" },
      { url: "https://cdn.example/flash.wav?sig=2", cueId: "b" },
      { url: "https://cdn.example/flash.wav?sig=3", cueId: "c" },
    ];
    const result = await resolveDiscreteSfxPathsForMixNullable({
      cues,
      workDir: "/tmp",
      download: async (url, dest) => {
        downloads.push(url);
        void dest;
      },
    });
    assert.equal(downloads.length, 1);
    assert.equal(result.uniqueDownloaded, 1);
    assert.equal(result.reusedCount, 2);
    assert.equal(result.paths.filter(Boolean).length, 3);
    assert.equal(new Set(result.paths.filter(Boolean)).size, 1);
  });

  it("optional missing SFX continues with compacted plan", async () => {
    const cues = [
      { url: "https://cdn.example/ok.wav", cueId: "ok" },
      { url: "https://cdn.example/fail.wav", cueId: "fail" },
    ];
    const result = await resolveDiscreteSfxPathsForMixNullable({
      cues,
      workDir: "/tmp",
      download: async (url) => {
        if (url.includes("fail")) throw new Error("404");
      },
    });
    assert.equal(result.missingOptional, 1);
    assert.equal(result.warnings.length, 1);
    assert.ok(!result.warnings[0]!.includes("sig="));
    const compact = compactDiscreteSfxForMix(cues, result.paths);
    assert.equal(compact.paths.length, 1);
    assert.equal(compact.cues[0]!.cueId, "ok");
  });
});

describe("S2E-P1 timeline → plan unducked base", () => {
  it("music volume stays unducked when voice present; envelopes carry gain", () => {
    const timeline = resolveStudioAudioTimeline({
      projectId: "p1",
      scenes: [{ id: "s1", order: 0, durationSeconds: 8 }],
      voiceEnabled: true,
      voiceAudioUrl: "https://cdn.example/v.mp3",
      voiceDurationSeconds: 3,
      voiceLines: [{ sceneId: "s1", text: "Hello", durationMs: 2500 }],
      musicEnabled: true,
      musicAudioUrl: "https://cdn.example/m.mp3",
      musicVolume: 0.5,
      duckingMode: "music_under_voice",
    });
    assert.equal(timeline.tracks.music[0]?.volume, 0.5);
    assert.ok(timeline.ducking.length >= 1);
    assert.ok(timeline.ducking[0]!.gainMultiplier < 1);
    const mix = buildAudioMixExecutionPlan(timeline);
    assert.equal(mix.staticDuckingApplied, false);
    assert.equal(mix.music.volume, 0.5);
    assert.ok(mix.duckingEnvelopes[0]!.musicGain < 1);
  });

  it("no voice → no envelopes → no timed duck", () => {
    const timeline = resolveStudioAudioTimeline({
      projectId: "p2",
      scenes: [{ id: "s1", order: 0, durationSeconds: 5 }],
      musicEnabled: true,
      musicAudioUrl: "https://cdn.example/m.mp3",
      musicVolume: 0.4,
    });
    assert.equal(timeline.ducking.length, 0);
    const mix = buildAudioMixExecutionPlan(timeline);
    assert.equal(mix.duckingEnvelopes.length, 0);
  });
});

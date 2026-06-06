import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStudioAudioMixFilterComplex } from "@/lib/studio-audio-mix-ffmpeg";
import {
  buildSceneTimelineSegments,
  duckingMusicMultiplier,
  fadeSecondsFromStartBehavior,
  totalDurationFromSegments,
} from "@/lib/studio-audio-mix-timeline";
import { buildStoryboardAudioMixPlan, suggestUserAssetForMusicCue } from "@/lib/studio-audio-mix-resolve";
import { resolveStoryboardAudioMixReadiness } from "@/lib/studio-audio-mix-readiness";
import { studioStoryboardDetail, studioSceneDetail } from "@/test/studio-api-fixtures";
import { validateStudioLibraryAudioUpload } from "@/lib/studio-audio-library-validation";

describe("studio-audio-mix-timeline", () => {
  it("builds scene segments from duration", () => {
    const segments = buildSceneTimelineSegments([
      { id: "a", order: 0, durationSeconds: 5 },
      { id: "b", order: 1, durationSeconds: 3 },
    ]);
    assert.equal(segments.length, 2);
    assert.equal(totalDurationFromSegments(segments), 8);
  });

  it("maps fade behaviors", () => {
    assert.equal(fadeSecondsFromStartBehavior("fade_in"), 2);
    assert.equal(fadeSecondsFromStartBehavior("hard_start"), 0);
  });

  it("reduces music under voice when ducking", () => {
    assert.ok(duckingMusicMultiplier("music_under_voice", true) < 1);
    assert.equal(duckingMusicMultiplier("music_under_voice", false), 1);
  });
});

describe("studio-audio-mix-ffmpeg", () => {
  it("builds amix filter for voice and music", () => {
    const { filterComplex } = buildStudioAudioMixFilterComplex({
      plan: {
        totalDurationSeconds: 10,
        voiceVolume: 0.8,
        musicVolume: 0.4,
        soundVolume: 0.3,
        musicFadeInSeconds: 2,
        musicFadeOutSeconds: 2,
        musicHardCut: false,
        voiceAudioUrl: null,
        musicAudioUrl: null,
        soundAudioUrl: null,
        musicAssetName: null,
        soundAssetName: null,
        sceneSegments: [],
        mixReady: true,
      },
      hasVoice: true,
      hasMusic: true,
      hasSound: false,
    });
    assert.match(filterComplex, /amix=inputs=2/);
    assert.match(filterComplex, /afade=t=in/);
  });
});

describe("studio-audio-mix-resolve", () => {
  it("suggests music asset by mood", () => {
    const asset = suggestUserAssetForMusicCue(
      [
        {
          id: "m1",
          kind: "music",
          name: "Cinematic",
          category: "cinematic",
          mood: "cinematic",
          energy: "high",
          audioUrl: "https://example.com/m.mp3",
          storageKey: "k",
          durationSeconds: 60,
          createdAt: "2026-01-01",
        },
      ],
      { mood: "cinematic", energy: "high" }
    );
    assert.equal(asset?.id, "m1");
  });

  it("builds mix plan with linked assets", () => {
    const storyboard = studioStoryboardDetail({
      musicEnabled: true,
      soundEnabled: true,
      voiceEnabled: true,
      audioAssetLinks: { version: 1, musicAssetId: "m1", soundAssetId: "s1" },
      scenes: [studioSceneDetail({ id: "sc1", order: 0, durationSeconds: 5, title: "One" })],
    });
    const plan = buildStoryboardAudioMixPlan({
      storyboard,
      userLibrary: [
        {
          id: "m1",
          kind: "music",
          name: "Bed",
          category: "cinematic",
          mood: "calm",
          energy: "low",
          audioUrl: "https://example.com/m.mp3",
          storageKey: "k1",
          durationSeconds: 120,
          createdAt: "2026-01-01",
        },
        {
          id: "s1",
          kind: "sfx",
          name: "Room",
          category: "ambience",
          mood: "neutral",
          energy: "low",
          audioUrl: "https://example.com/s.mp3",
          storageKey: "k2",
          durationSeconds: 30,
          createdAt: "2026-01-01",
        },
      ],
      voiceAudioUrl: "https://example.com/v.mp3",
    });
    assert.equal(plan.musicAudioUrl, "https://example.com/m.mp3");
    assert.equal(plan.soundAudioUrl, "https://example.com/s.mp3");
    assert.equal(plan.mixReady, true);
  });
});

describe("studio-audio-mix-readiness", () => {
  it("marks mix ready when lanes linked", () => {
    const status = resolveStoryboardAudioMixReadiness({
      storyboard: studioStoryboardDetail({
        voiceEnabled: true,
        musicEnabled: true,
        soundEnabled: false,
        audioAssetLinks: { version: 1, musicAssetId: "m1" },
      }),
      hasVoiceAudio: true,
      library: [
        {
          id: "m1",
          kind: "music",
          name: "Bed",
          category: "cinematic",
          mood: "calm",
          energy: "low",
          audioUrl: "https://example.com/m.mp3",
          storageKey: "k",
          durationSeconds: 10,
          createdAt: "2026-01-01",
        },
      ],
    });
    assert.equal(status.musicLinked, true);
    assert.equal(status.mixReady, true);
  });
});

describe("studio-audio-library-validation", () => {
  it("accepts mp3 and wav", () => {
    for (const fileName of ["a.mp3", "b.wav"]) {
      const result = validateStudioLibraryAudioUpload({
        buffer: Buffer.alloc(1024),
        fileName,
      });
      assert.equal(result.ok, true);
    }
  });
});

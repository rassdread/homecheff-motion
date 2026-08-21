/**
 * S2E — Unified audio timeline orchestration tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDialogueDurationPolicy,
  hashDialogueText,
  isVoiceAssetStale,
} from "@/lib/studio-audio-dialogue-policy";
import { buildStudioAudioMixFilterComplex } from "@/lib/studio-audio-mix-ffmpeg";
import {
  classifyAudioHintToken,
  deterministicDiscreteOffsetsMs,
  resolvePresetSfxAndAmbienceCues,
} from "@/lib/studio-audio-preset-cues";
import {
  buildPresetAudioCoverageMatrix,
  summarizePresetAudioCoverage,
} from "@/lib/studio-audio-preset-coverage";
import {
  buildAudioMixExecutionPlan,
  countUniqueSfxAssets,
  resolveStudioAudioTimeline,
} from "@/lib/studio-audio-timeline-resolve";
import {
  resolveCanonicalVisualTimeline,
  shiftCuesAfterSceneDurationChange,
  visualTimelineHash,
} from "@/lib/studio-visual-timeline";

describe("S2E canonical visual timeline", () => {
  it("builds scene spans and total duration", () => {
    const timeline = resolveCanonicalVisualTimeline({
      projectId: "sb1",
      scenes: [
        { id: "s1", order: 0, durationSeconds: 5 },
        { id: "s2", order: 1, durationSeconds: 5 },
        { id: "s3", order: 2, durationSeconds: 5 },
      ],
    });
    assert.equal(timeline.sceneSpans.length, 3);
    assert.equal(timeline.totalDurationMs, 15000);
    assert.equal(timeline.sceneSpans[1]!.startMs, 5000);
    assert.equal(timeline.sceneSpans[2]!.startMs, 10000);
    assert.ok(visualTimelineHash(timeline).length >= 16);
  });

  it("shifts later cues when a scene duration grows", () => {
    const before = resolveCanonicalVisualTimeline({
      projectId: "sb",
      scenes: [
        { id: "a", order: 0, durationSeconds: 5 },
        { id: "b", order: 1, durationSeconds: 5 },
        { id: "c", order: 2, durationSeconds: 5 },
      ],
    });
    const after = resolveCanonicalVisualTimeline({
      projectId: "sb",
      scenes: [
        { id: "a", order: 0, durationSeconds: 5 },
        { id: "b", order: 1, durationSeconds: 7 },
        { id: "c", order: 2, durationSeconds: 5 },
      ],
    });
    assert.equal(after.sceneSpans[2]!.startMs, 12000);
    const shifted = shiftCuesAfterSceneDurationChange({
      spansBefore: before.sceneSpans,
      spansAfter: after.sceneSpans,
      sceneRelativeCues: [{ sceneId: "c", offsetMs: 500, durationMs: 800 }],
    });
    assert.equal(shifted[0]!.startMs, 12500);
  });
});

describe("S2E dialogue duration policy", () => {
  it("extends scene when voice is longer (default policy)", () => {
    const fit = applyDialogueDurationPolicy({
      sceneId: "s1",
      visualDurationMs: 5000,
      voiceDurationMs: 7200,
    });
    assert.equal(fit.status, "EXTENDED");
    assert.ok(fit.effectiveDurationMs >= 7200);
    assert.equal(fit.clipped, false);
  });

  it("fits when voice shorter than scene", () => {
    const fit = applyDialogueDurationPolicy({
      sceneId: "s1",
      visualDurationMs: 5000,
      voiceDurationMs: 3800,
    });
    assert.equal(fit.status, "FITS");
  });

  it("detects voice staleness on dialogue change only", () => {
    const h1 = hashDialogueText("Hello Anna");
    const h2 = hashDialogueText("Hello Bob");
    assert.equal(
      isVoiceAssetStale({
        currentTextHash: h1,
        assetTextHash: h1,
        currentVoiceConfigHash: "cfg",
        assetVoiceConfigHash: "cfg",
      }),
      false
    );
    assert.equal(
      isVoiceAssetStale({
        currentTextHash: h2,
        assetTextHash: h1,
        currentVoiceConfigHash: "cfg",
        assetVoiceConfigHash: "cfg",
      }),
      true
    );
  });
});

describe("S2E audio timeline resolve", () => {
  it("red carpet: music + crowd ambience + camera flash cues, 0 providers", () => {
    const timeline = resolveStudioAudioTimeline({
      projectId: "rc",
      scenes: [{ id: "s1", order: 0, durationSeconds: 5 }],
      musicEnabled: true,
      musicAudioUrl: "https://cdn.example/luxury.mp3",
      musicAssetId: "music-1",
      musicMood: "luxury glamorous",
      soundEnabled: true,
      soundAudioUrl: "https://cdn.example/flash.mp3",
      soundAssetId: "sfx-flash",
      sfxSuggestions: ["camera_flash", "crowd_ambience"],
      soundNotes: "camera_flash, crowd_ambience",
    });
    assert.equal(timeline.providerCalls, 0);
    assert.ok(timeline.tracks.music.length >= 1);
    assert.ok(timeline.tracks.ambience.some((a) => a.cueType.includes("crowd")));
    assert.ok(timeline.tracks.sfx.filter((s) => s.cueType.includes("flash")).length >= 2);
    assert.equal(countUniqueSfxAssets(timeline), 1);
    const mix = buildAudioMixExecutionPlan(timeline);
    assert.equal(mix.providerCalls, 0);
    assert.ok(mix.discreteSfx.length >= 2);
    assert.equal(new Set(mix.discreteSfx.map((c) => c.url)).size, 1);
  });

  it("commercial: voice + music + product impact + ducking envelopes", () => {
    const timeline = resolveStudioAudioTimeline({
      projectId: "ad",
      scenes: [
        { id: "s1", order: 0, durationSeconds: 5 },
        { id: "s2", order: 1, durationSeconds: 5 },
        { id: "s3", order: 2, durationSeconds: 5 },
      ],
      voiceEnabled: true,
      voiceAudioUrl: "https://cdn.example/vo.mp3",
      voiceDurationSeconds: 4,
      voiceLines: [
        { sceneId: "s1", text: "Meet our product", speakerId: "narrator", durationMs: 3500 },
      ],
      musicEnabled: true,
      musicAudioUrl: "https://cdn.example/bed.mp3",
      musicAssetId: "m1",
      soundEnabled: true,
      soundAudioUrl: "https://cdn.example/whoosh.mp3",
      soundAssetId: "whoosh",
      sfxSuggestions: ["whoosh", "product_impact"],
      duckingMode: "music_under_voice",
    });
    assert.equal(timeline.totalDurationMs, 15000);
    assert.ok(timeline.tracks.voice.length >= 1);
    assert.ok(timeline.ducking.length >= 1);
    assert.ok(timeline.tracks.sfx.length >= 1);
    const mix = buildAudioMixExecutionPlan(timeline);
    assert.ok(mix.duckingEnvelopes.length >= 1);
    assert.equal(mix.staticDuckingApplied, false);
    // Unducked base — envelopes apply gain in FFmpeg
    assert.ok((timeline.tracks.music[0]?.volume ?? 0) >= 0.3);
  });

  it("multi-speaker produces two voice cues and duck spans both", () => {
    const timeline = resolveStudioAudioTimeline({
      projectId: "pixar",
      scenes: Array.from({ length: 8 }, (_, i) => ({
        id: `s${i}`,
        order: i,
        durationSeconds: 5,
      })),
      voiceEnabled: true,
      voiceAudioUrl: "https://cdn.example/multi.mp3",
      voiceLines: [
        { sceneId: "s4", text: "Hello from Anna", speakerId: "anna", durationMs: 2000 },
        { sceneId: "s4", text: "And Bob replies", speakerId: "bob", durationMs: 2000 },
      ],
      musicEnabled: true,
      musicAudioUrl: "https://cdn.example/m.mp3",
      duckingMode: "full_under_voice",
    });
    assert.equal(timeline.tracks.voice.length, 2);
    assert.equal(timeline.tracks.voice[0]!.speakerId, "anna");
    assert.equal(timeline.tracks.voice[1]!.speakerId, "bob");
    assert.equal(timeline.ducking.length, 2);
    assert.equal(timeline.sceneSpans.length, 8);
  });

  it("dialogue longer than scene extends span under EXTEND_SCENE", () => {
    const timeline = resolveStudioAudioTimeline({
      projectId: "long",
      scenes: [{ id: "s1", order: 0, durationSeconds: 5 }],
      voiceEnabled: true,
      voiceAudioUrl: "https://cdn.example/v.mp3",
      voiceLines: [{ sceneId: "s1", text: "x", durationMs: 6500 }],
      dialoguePolicy: "EXTEND_SCENE",
    });
    assert.ok(timeline.sceneSpans[0]!.visualDurationMs >= 6500);
    assert.ok(timeline.totalDurationMs >= 6500);
  });

  it("visual-only rebuild marks unchanged dialogue not stale when hashes match", () => {
    const text = "Keep this line";
    const textHash = hashDialogueText(text);
    const timeline = resolveStudioAudioTimeline({
      projectId: "vis",
      scenes: [{ id: "s1", order: 0, durationSeconds: 5 }],
      voiceEnabled: true,
      voiceAudioUrl: "https://cdn.example/v.mp3",
      voiceLines: [{ sceneId: "s1", text, durationMs: 3000 }],
      assetTextHash: textHash,
      assetVoiceConfigHash: "warm_narrator|en||",
      voiceProfile: "warm_narrator",
      voiceLanguage: "en",
    });
    assert.equal(timeline.tracks.voice[0]!.stale, false);
    assert.equal(timeline.providerCalls, 0);
  });

  it("changed dialogue marks voice stale without implying generation", () => {
    const timeline = resolveStudioAudioTimeline({
      projectId: "chg",
      scenes: [{ id: "s1", order: 0, durationSeconds: 5 }],
      voiceEnabled: true,
      voiceAudioUrl: "https://cdn.example/v.mp3",
      voiceLines: [{ sceneId: "s1", text: "New line", durationMs: 3000 }],
      assetTextHash: hashDialogueText("Old line"),
      assetVoiceConfigHash: "warm_narrator|en||",
      voiceProfile: "warm_narrator",
      voiceLanguage: "en",
    });
    assert.equal(timeline.tracks.voice[0]!.stale, true);
    assert.ok(timeline.statuses.includes("STALE_ASSET"));
    assert.equal(timeline.providerCalls, 0);
  });

  it("music volume / window change is mix-only (same asset, 0 providers)", () => {
    const base = resolveStudioAudioTimeline({
      projectId: "m",
      scenes: [{ id: "s1", order: 0, durationSeconds: 10 }],
      musicEnabled: true,
      musicAudioUrl: "https://cdn.example/m.mp3",
      musicAssetId: "m1",
      musicVolume: 0.4,
    });
    const moved = resolveStudioAudioTimeline({
      projectId: "m",
      scenes: [{ id: "s1", order: 0, durationSeconds: 10 }],
      musicEnabled: true,
      musicAudioUrl: "https://cdn.example/m.mp3",
      musicAssetId: "m1",
      musicVolume: 0.2,
      musicSourceOffsetMs: 12000,
    });
    assert.equal(base.tracks.music[0]!.assetId, moved.tracks.music[0]!.assetId);
    assert.equal(moved.tracks.music[0]!.sourceOffsetMs, 12000);
    assert.ok(moved.tracks.music[0]!.volume < base.tracks.music[0]!.volume);
    assert.equal(moved.providerCalls, 0);
  });

  it("motion-only with no hints yields EMPTY timeline", () => {
    const timeline = resolveStudioAudioTimeline({
      projectId: "mo",
      scenes: [{ id: "s1", order: 0, durationSeconds: 5 }],
    });
    assert.ok(timeline.statuses.includes("EMPTY"));
  });

  it("cooking semantics: ambience + discrete chop/sizzle", () => {
    const { sfx, ambience } = resolvePresetSfxAndAmbienceCues({
      projectId: "cook",
      sceneSpans: [
        {
          sceneId: "s1",
          order: 0,
          startMs: 0,
          endMs: 8000,
          visualDurationMs: 8000,
          transitionInMs: 0,
          transitionOutMs: 0,
        },
      ],
      sfxSuggestions: ["kitchen_ambience", "sizzle", "chop"],
      soundAssetId: "kit-1",
      soundAssetUrl: "https://cdn.example/kit.mp3",
    });
    assert.ok(ambience.some((a) => a.cueType.includes("kitchen")));
    assert.ok(sfx.some((s) => s.cueType === "sizzle" || s.cueType === "chop"));
    assert.equal(classifyAudioHintToken("camera_flash"), "SFX_DISCRETE");
    assert.equal(classifyAudioHintToken("crowd_ambience"), "AMBIENCE");
    assert.deepEqual(deterministicDiscreteOffsetsMs(5000, "camera_flash").length, 3);
  });

  it("subtitle cues align to provided timing", () => {
    const timeline = resolveStudioAudioTimeline({
      projectId: "sub",
      scenes: [{ id: "s1", order: 0, durationSeconds: 5 }],
      subtitleEntries: [
        { sceneId: "s1", startMs: 200, endMs: 1800, text: "Hello", language: "en" },
      ],
    });
    assert.equal(timeline.subtitleCues.length, 1);
    assert.equal(timeline.subtitleCues[0]!.startMs, 200);
  });

  it("rerender duration shift keeps scene-relative SFX placement", () => {
    const short = resolveStudioAudioTimeline({
      projectId: "r",
      scenes: [
        { id: "s1", order: 0, durationSeconds: 5 },
        { id: "s2", order: 1, durationSeconds: 5 },
      ],
      soundEnabled: true,
      soundAudioUrl: "https://cdn.example/f.mp3",
      sfxSuggestions: ["camera_flash"],
    });
    const long = resolveStudioAudioTimeline({
      projectId: "r",
      scenes: [
        { id: "s1", order: 0, durationSeconds: 7 },
        { id: "s2", order: 1, durationSeconds: 5 },
      ],
      soundEnabled: true,
      soundAudioUrl: "https://cdn.example/f.mp3",
      sfxSuggestions: ["camera_flash"],
    });
    assert.ok(long.sceneSpans[1]!.startMs > short.sceneSpans[1]!.startMs);
    assert.equal(short.providerCalls, 0);
    assert.equal(long.providerCalls, 0);
  });
});

describe("S2E mix filter + coverage", () => {
  it("ffmpeg filter includes adelay for discrete SFX", () => {
    const { filterComplex, discreteInputCount } = buildStudioAudioMixFilterComplex({
      plan: {
        totalDurationSeconds: 5,
        voiceVolume: 1,
        musicVolume: 0.3,
        soundVolume: 0.2,
        musicFadeInSeconds: 0,
        musicFadeOutSeconds: 0,
        discreteSfx: [
          {
            cueId: "sfx_1",
            url: "https://cdn.example/flash.mp3",
            startSeconds: 1.1,
            durationSeconds: 0.35,
            volume: 0.5,
            assetId: "flash",
          },
        ],
      },
      hasVoice: false,
      hasMusic: true,
      hasSound: true,
    });
    assert.equal(discreteInputCount, 1);
    assert.match(filterComplex, /adelay=1100\|1100/);
    assert.match(filterComplex, /amix=inputs=3/);
  });

  it("coverage matrix classifies registry rows", () => {
    const rows = buildPresetAudioCoverageMatrix();
    const summary = summarizePresetAudioCoverage(rows);
    assert.ok(summary.total >= 100);
    assert.ok(rows.some((r) => r.id.includes("red_carpet") || r.id.includes("RED_CARPET")));
  });
});

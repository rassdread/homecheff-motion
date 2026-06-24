import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeAudioBuffer } from "@/lib/studio-audio-analysis";
import { buildStudioAnalysisPlan } from "@/lib/studio-analysis-planner";
import { buildLongFormProductionPlan } from "@/lib/studio-long-form-duration";
import { buildMusicVideoProductionPlan } from "@/lib/studio-music-video-plan";
import { detectStudioVideoIntent, isStudioVideoIntent } from "@/lib/studio-video-intents";
import { defaultOrchestratorState } from "@/lib/studio-orchestrator-phases";

describe("studio-video-intents", () => {
  it("detects music video intent", () => {
    const match = detectStudioVideoIntent("I want a music video for my song");
    assert.ok(match);
    assert.equal(match.intent, "music_video");
  });

  it("detects travel vlog", () => {
    const match = detectStudioVideoIntent("make a travel vlog");
    assert.equal(match?.intent, "travel_vlog");
  });

  it("validates intent ids", () => {
    assert.equal(isStudioVideoIntent("music_video"), true);
    assert.equal(isStudioVideoIntent("invalid"), false);
  });
});

describe("studio-audio-analysis", () => {
  it("builds sections from audio buffer", () => {
    const buffer = Buffer.alloc(256_000);
    const profile = analyzeAudioBuffer({ buffer, extension: "mp3" });
    assert.ok(profile.durationSeconds > 0);
    assert.equal(profile.sections.length, 7);
    assert.ok(profile.chorusMoments.length >= 1);
  });
});

describe("studio-music-video-plan", () => {
  it("calculates scenes and renders for 3:30 track", () => {
    const audio = analyzeAudioBuffer({ buffer: Buffer.alloc(3_500_000), extension: "mp3" });
    const plan = buildMusicVideoProductionPlan({ audioProfile: audio });
    assert.ok(plan.sceneCount >= 4);
    assert.equal(plan.renderCount, plan.sceneCount);
    assert.ok(plan.estimatedCredits > 0);
    assert.equal(plan.mergePlan.ffmpegMergeRequired, plan.renderCount > 1);
  });
});

describe("studio-long-form-duration", () => {
  it("supports 3/5/10 minute targets", () => {
    const three = buildLongFormProductionPlan("3min");
    assert.equal(three.targetSeconds, 180);
    assert.ok(three.sceneCount >= 10);

    const ten = buildLongFormProductionPlan("10min");
    assert.equal(ten.targetSeconds, 600);
    assert.ok(ten.actCount >= 5);
  });
});

describe("studio-analysis-planner", () => {
  it("builds upfront cost plan for music video", () => {
    const audio = analyzeAudioBuffer({ buffer: Buffer.alloc(500_000), extension: "mp3" });
    const plan = buildStudioAnalysisPlan({
      intent: "music_video",
      hasUploadedAudio: true,
      audioProfile: audio,
    });
    assert.ok(plan.totalCredits > 0);
    assert.ok(plan.userCostLines.length >= 1);
    assert.ok(plan.sceneCount > 0);
    assert.ok((plan.pricingEstimate?.grossMarginAtWorstPack ?? 0) >= 0.65);
  });

  it("zeroes cached analysis credits", () => {
    const plan = buildStudioAnalysisPlan({
      intent: "travel_vlog",
      cachedAnalysisSources: ["motion_ready", "character_studio"],
      motionReadyCharacterIds: ["char-1"],
    });
    const cached = plan.cachedAnalyses.filter((a) => a.cached);
    assert.ok(cached.length >= 1);
    assert.equal(cached.every((a) => a.credits === 0), true);
  });
});

describe("studio-orchestrator-phases", () => {
  it("defaults to collect phase", () => {
    const state = defaultOrchestratorState();
    assert.equal(state.userPhase, "collect");
    assert.equal(state.status, "planning");
  });
});

describe("studio-publish-bridge", () => {
  it("maps studio subtitle entries to publish segments", async () => {
    const { mapStudioSubtitleEntriesToPublish } = await import("@/lib/studio-publish-bridge");
    const segments = mapStudioSubtitleEntriesToPublish([
      { start: 0, end: 2.5, text: "Hello world" },
    ]);
    assert.equal(segments.length, 1);
    assert.equal(segments[0]!.text, "Hello world");
    assert.equal(segments[0]!.startTime, 0);
    assert.equal(segments[0]!.endTime, 2.5);
  });
});

describe("studio-orchestrator-brief-builder", () => {
  it("builds brief from orchestrator music video state", async () => {
    const { buildBriefFromOrchestratorState } = await import("@/lib/studio-orchestrator-brief-builder");
    const audio = analyzeAudioBuffer({ buffer: Buffer.alloc(500_000), extension: "mp3" });
    const brief = buildBriefFromOrchestratorState({
      orchestrator: {
        ...defaultOrchestratorState(),
        intent: "music_video",
        idea: "Music video for my single",
        audioAnalysis: audio,
      },
    });
    assert.ok(brief);
    assert.ok(brief!.idea.includes("Music video"));
  });
});

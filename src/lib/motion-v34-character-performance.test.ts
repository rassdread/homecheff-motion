import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachPerformanceToHandoffPayload } from "@/lib/attach-performance-handoff";
import { attachVoiceToHandoffPayload } from "@/lib/attach-voice-handoff";
import {
  advancePerformanceRuntimeFrame,
  pickPerformanceStateForCharacter,
} from "@/lib/motion-character-performance-runtime";
import {
  analyzeVoiceSegmentAmplitude,
  amplitudeToMouthState,
  dominantMouthStateFromSamples,
} from "@/lib/voice-amplitude-analyzer";
import {
  buildCharacterPerformanceAssignments,
  buildCharacterPerformanceState,
  buildPerformanceStatesForHandoff,
  getPerformanceEmotionModifier,
  getPerformanceEnergyModifiers,
  inferCharacterPerformanceStyleLabel,
  normalizeSceneEmotion,
  simulateScenePerformancePreview,
  validateCharacterPerformanceConsistency,
} from "@/lib/studio-character-performance";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

const chef: StudioCharacterListItem = {
  id: "c-chef",
  ownerId: "u1",
  name: "Chef",
  slug: "chef",
  role: "mascot",
  description: "",
  personality: "Friendly warm host",
  referenceImageUrl: "https://cdn.example/chef.jpg",
  isMascot: true,
  appearanceMemory: "",
  personalityMemory: "",
  continuityNotes: "",
  defaultClothing: "",
  defaultAccessories: "",
  visualKeywords: "",
  primaryReferenceImageId: null,
  referenceNotes: "",
  identityStrength: "strong",
  continuityStrength: "strong",
  worldProfileId: null,
  worldProfile: null,
  voiceEnabled: true,
  voiceProvider: "elevenlabs",
  voiceProfile: "warm_narrator",
  voiceLanguage: "en",
  voiceGender: "",
  voiceDescription: "Warm Male",
  voiceNotes: "",
  voiceLock: false,
  voiceProfilesByLanguage: {},
  performanceEnabled: true,
  defaultSmileStrength: 80,
  defaultBlinkRate: "medium",
  defaultHeadMovement: "medium",
  defaultMouthIntensity: "medium",
  idleAnimationStyle: "natural",
  performanceNotes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function minimalStoryboard(): StudioStoryboardDetail {
  return {
    id: "sb-1",
    title: "Promo",
    description: "",
    format: "commercial",
    targetPlatform: "instagram",
    aspectRatio: "9:16",
    sceneCount: 1,
    estimatedDurationSeconds: 8,
    status: "draft",
    voiceEnabled: true,
    voiceLanguage: "en",
    voiceProfile: "warm_narrator",
    voiceStyle: "",
    narrationMode: "narrator",
    voiceNarrationScript: "[Chef]\nWelcome to HomeCheff.",
    scenes: [
      {
        id: "sc-1",
        storyboardId: "sb-1",
        order: 0,
        title: "Intro",
        description: "Welcome",
        action: "",
        emotion: "happy",
        camera: "",
        shotType: "medium",
        cameraMovement: "static",
        sceneEnergy: "dynamic",
        transitionToNext: "cut",
        durationSeconds: 4,
        locationId: null,
        location: null,
        characters: [chef],
        props: [],
        selectedSceneImageId: null,
        sceneImages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as StudioStoryboardDetail;
}

describe("Motion V34 — character performance engine", () => {
  it("handoff version is 14", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 14);
  });

  it("infers identity style from personality (not mascot hardcode)", () => {
    assert.equal(inferCharacterPerformanceStyleLabel(chef), "Friendly");
    const garden = {
      ...chef,
      name: "Garden",
      personality: "Calm welcoming guide",
    };
    assert.equal(inferCharacterPerformanceStyleLabel(garden), "Calm");
  });

  it("emotion modifiers boost happy smile", () => {
    const happy = getPerformanceEmotionModifier("happy");
    const neutral = getPerformanceEmotionModifier("neutral");
    assert.ok(happy.smileMultiplier > neutral.smileMultiplier);
  });

  it("energy modifiers map calm to 0.5x and intense to 2x", () => {
    const mods = getPerformanceEnergyModifiers();
    const calm = mods.find((m) => m.energy === "calm");
    const intense = mods.find((m) => m.energy === "intense");
    assert.equal(calm?.animationMultiplier, 0.5);
    assert.equal(intense?.animationMultiplier, 2);
  });

  it("voice amplitude analyzer returns mouth states", () => {
    const samples = analyzeVoiceSegmentAmplitude({
      text: "Hello I am Chef",
      startSeconds: 0,
      endSeconds: 2,
    });
    assert.ok(samples.length >= 1);
    assert.ok(["closed", "small", "medium", "wide"].includes(samples[0]!.mouthState));
    assert.equal(amplitudeToMouthState(0.1), "closed");
    assert.equal(amplitudeToMouthState(0.8), "wide");
    const dominant = dominantMouthStateFromSamples(samples);
    assert.ok(dominant);
  });

  it("builds performance state with higher smile for happy + dynamic energy", () => {
    const state = buildCharacterPerformanceState({
      character: chef,
      activeSpeaker: true,
      emotion: "happy",
      sceneEnergy: "dynamic",
      voiceSegment: { text: "Welcome", startSeconds: 0, endSeconds: 2 },
    });
    assert.equal(state.activeSpeaker, true);
    assert.equal(normalizeSceneEmotion(state.emotion), "happy");
    assert.ok(state.smileStrength >= 70);
    assert.ok(state.mouthSpeed > 0);
  });

  it("active speaker only on matched character in multi-cast states", () => {
    const garden = { ...chef, id: "c-garden", name: "Garden", performanceEnabled: true };
    const sb = minimalStoryboard();
    sb.scenes[0]!.characters = [chef, garden];
    const states = buildPerformanceStatesForHandoff({
      storyboard: sb,
      voiceSegments: [
        {
          sceneId: "sc-1",
          order: 0,
          startSeconds: 0,
          endSeconds: 3,
          durationSeconds: 3,
          text: "Hello",
          speaker: "Chef",
          characterId: "c-chef",
          voiceProfile: "warm_narrator",
        },
      ],
    });
    const chefState = states.find((s) => s.characterId === "c-chef");
    const gardenState = states.find((s) => s.characterId === "c-garden");
    assert.equal(chefState?.activeSpeaker, true);
    assert.equal(gardenState?.activeSpeaker, false);
    assert.equal(gardenState?.mouthState, "closed");
  });

  it("performance validation warns when disabled", () => {
    const disabled = { ...chef, performanceEnabled: false };
    const sb = minimalStoryboard();
    sb.scenes[0]!.characters = [disabled];
    const warnings = validateCharacterPerformanceConsistency({
      storyboard: sb,
      performanceStates: buildPerformanceStatesForHandoff({
        storyboard: sb,
        voiceSegments: [],
      }),
    });
    assert.ok(warnings.some((w) => w.code === "performance_disabled"));
  });

  it("simulator preview returns numeric mouth speed", () => {
    const preview = simulateScenePerformancePreview({
      character: chef,
      emotion: "excited",
      sceneEnergy: "intense",
    });
    assert.ok(preview.mouthSpeed >= 1);
    assert.equal(preview.energy, "intense");
  });

  it("runtime frame advances without throwing", () => {
    const state = simulateScenePerformancePreview({
      character: chef,
      emotion: "happy",
      sceneEnergy: "neutral",
    });
    const frame = advancePerformanceRuntimeFrame(state, 0.5);
    assert.equal(frame.characterId, chef.id);
    assert.ok(frame.mouthOpenness >= 0);
  });

  it("attachPerformance adds v14 fields to handoff", () => {
    const sb = minimalStoryboard();
    const base = {
      version: MOTION_HANDOFF_PAYLOAD_VERSION,
      storyboardId: sb.id,
      title: sb.title,
      description: "",
      promptStyleProfile: "cinematic",
      directorProfile: "documentary",
      shotDiversityScore: 0,
      characterMemory: [],
      locationMemory: null,
      propMemory: [],
      worldMemory: null,
      continuityStrength: "strong",
      consistencyReport: null,
      overallConsistencyScore: 0,
      driftWarnings: [],
      correctionRecommendations: [],
      consistencyHistory: [],
      latestImprovementScore: null,
      visionReport: null,
      overallVisionScore: 0,
      visionWarnings: [],
      characterConsistencyReport: null,
      overallCharacterConsistencyScore: 0,
      characterDriftWarnings: [],
      perSceneCharacterIdentityScores: [],
      scenes: sb.scenes.map((s) => ({
        sceneId: s.id,
        order: s.order,
        title: s.title,
        description: s.description,
        action: s.action,
        emotion: s.emotion,
        camera: s.camera,
        transitionToNext: s.transitionToNext,
        durationSeconds: s.durationSeconds,
        studioContext: {
          sceneEnergy: s.sceneEnergy,
          shotType: s.shotType,
          cameraMovement: s.cameraMovement,
        },
        generatedPrompt: "",
        stylePrompt: "",
        continuityPrompt: "",
        promptVersion: { major: 1, minor: 0, label: "v1" },
        selectedSceneImageId: null,
        selectedSceneImageUrl: null,
        selectedSceneImagePromptVersion: null,
        selectedSceneImageGenerationVersion: null,
        sceneImageReference: null,
        sceneConsistencyScore: null,
        sceneConsistencyReport: null,
        sceneConsistencyRecommendations: [],
        sceneCorrectionRecommendations: [],
        sceneVisionScore: null,
        sceneVisionReport: null,
        selectedImageScore: null,
        selectedImageVisionScore: null,
        selectedImageConsistencyScore: null,
        selectedImageImprovementScore: null,
        selectedImageRecommended: false,
      })),
    };
    const withVoice = attachVoiceToHandoffPayload(base, {
      storyboard: sb,
      voice: null,
      subtitle: null,
    });
    const withPerf = attachPerformanceToHandoffPayload(withVoice, { storyboard: sb });
    assert.ok(withPerf.characterPerformanceProfiles?.length);
    assert.ok(withPerf.performanceStates?.length);
    assert.ok(withPerf.energyModifiers?.length);
    assert.ok(withPerf.scenes[0]?.speakerPerformance);
    const assignments = buildCharacterPerformanceAssignments(sb);
    assert.equal(assignments[0]?.defaultSmileStrength, 80);
  });

  it("legacy handoff below v14 still parses with fallback version", () => {
    const legacyVersion = 13;
    assert.ok(legacyVersion < MOTION_HANDOFF_PAYLOAD_VERSION);
  });

  it("pickPerformanceStateForCharacter prefers active speaker", () => {
    const states = [
      simulateScenePerformancePreview({ character: chef, emotion: "calm", sceneEnergy: "calm", activeSpeaker: false }),
      simulateScenePerformancePreview({ character: chef, emotion: "happy", sceneEnergy: "dynamic", activeSpeaker: true }),
    ];
    states[0]!.activeSpeaker = false;
    states[1]!.activeSpeaker = true;
    const picked = pickPerformanceStateForCharacter(states, chef.id, true);
    assert.equal(picked?.activeSpeaker, true);
    assert.equal(normalizeSceneEmotion(picked?.emotion ?? ""), "happy");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mouthStateAtSegmentTime, buildMotionPerformanceFramePlan } from "@/lib/build-motion-performance-frame-plan";
import {
  ENERGY_CYCLE_STEP_SECONDS,
  SPEAKING_MOUTH_CYCLES,
  generateSpeakingMouthSamples,
  previewSpeakingMouthCycleFrames,
  resolveSpeakingMouthCycleKey,
  speakingCycleStepSeconds,
  speakingMouthStateAtTime,
} from "@/lib/speaking-mouth-cycle";
import {
  characterHasMouthAssetsForOverlay,
  resolveMouthAssetUrl,
} from "@/lib/studio-character-mouth-assets";
import { buildMouthAssetOverlayWindows } from "@/lib/studio-mouth-asset-overlay";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { CharacterPerformanceProfile } from "@/types/studio-character-performance";

const baseProfile = (overrides?: Partial<CharacterPerformanceProfile>): CharacterPerformanceProfile => ({
  characterId: "chef",
  characterName: "Chef",
  performanceEnabled: true,
  defaultSmileStrength: 80,
  defaultBlinkRate: "medium",
  defaultHeadMovement: "medium",
  defaultMouthIntensity: "medium",
  idleAnimationStyle: "natural",
  performanceNotes: "",
  styleLabel: "Friendly",
  mouthAnimationEnabled: false,
  mouthClosedAssetUrl: "",
  mouthSmallAssetUrl: "",
  mouthMediumAssetUrl: "",
  mouthWideAssetUrl: "",
  ...overrides,
});

describe("Studio V34.6 — speaking mouth cycle", () => {
  it("defines emotion-specific mouth cycles", () => {
    assert.deepEqual(SPEAKING_MOUTH_CYCLES.default, [
      "closed",
      "small",
      "medium",
      "wide",
      "medium",
      "small",
    ]);
    assert.deepEqual(SPEAKING_MOUTH_CYCLES.calm, ["closed", "small", "medium", "small"]);
    assert.deepEqual(SPEAKING_MOUTH_CYCLES.excited, [
      "small",
      "medium",
      "wide",
      "medium",
      "wide",
      "small",
    ]);
    assert.equal(resolveSpeakingMouthCycleKey("angry scene"), "angry");
    assert.equal(resolveSpeakingMouthCycleKey("very calm"), "calm");
  });

  it("selects faster cycle steps for higher scene energy", () => {
    assert.ok(speakingCycleStepSeconds("calm") > speakingCycleStepSeconds("neutral"));
    assert.ok(speakingCycleStepSeconds("neutral") > speakingCycleStepSeconds("dynamic"));
    assert.ok(speakingCycleStepSeconds("dynamic") > speakingCycleStepSeconds("intense"));
    assert.equal(ENERGY_CYCLE_STEP_SECONDS.intense, ENERGY_CYCLE_STEP_SECONDS.neutral * 0.4);
  });

  it("loops mouth cycle only inside active speaker segment window", () => {
    const segment = { text: "Hello chef", startSeconds: 0.5, endSeconds: 4.2 };
    assert.equal(
      speakingMouthStateAtTime({
        ...segment,
        segmentStartSeconds: 0.5,
        segmentEndSeconds: 4.2,
        absoluteTimeSeconds: 0.4,
        emotion: "neutral",
        sceneEnergy: "neutral",
      }),
      "closed"
    );
    assert.equal(
      speakingMouthStateAtTime({
        segmentStartSeconds: 0.5,
        segmentEndSeconds: 4.2,
        absoluteTimeSeconds: 4.2,
        emotion: "neutral",
        sceneEnergy: "neutral",
      }),
      "closed"
    );
    const inside = speakingMouthStateAtTime({
      segmentStartSeconds: 0.5,
      segmentEndSeconds: 4.2,
      absoluteTimeSeconds: 0.5,
      emotion: "excited",
      sceneEnergy: "dynamic",
    });
    assert.equal(inside, "small");
    const later = speakingMouthStateAtTime({
      segmentStartSeconds: 0.5,
      segmentEndSeconds: 4.2,
      absoluteTimeSeconds: 1.2,
      emotion: "excited",
      sceneEnergy: "dynamic",
    });
    assert.notEqual(later, "closed");
  });

  it("generates repeating samples across a voice segment", () => {
    const samples = generateSpeakingMouthSamples({
      text: "Chef welcomes guests",
      startSeconds: 0,
      endSeconds: 2,
      emotion: "happy",
      sceneEnergy: "neutral",
      sampleIntervalSeconds: 0.25,
    });
    assert.ok(samples.length >= 4);
    assert.ok(samples.some((s) => s.mouthState !== "closed"));
    const states = new Set(samples.map((s) => s.mouthState));
    assert.ok(states.size >= 2);
  });

  it("frame plan closes mouth outside speech and cycles during speech", () => {
    const handoff = {
      version: MOTION_HANDOFF_PAYLOAD_VERSION,
      storyboardId: "sb",
      characterPerformanceProfiles: [baseProfile()],
      voiceSegments: [
        {
          sceneId: "s1",
          startSeconds: 0.5,
          endSeconds: 4.2,
          text: "Welcome",
          speaker: "Chef",
        },
      ],
      scenes: [
        {
          sceneId: "s1",
          order: 0,
          title: "Intro",
          emotion: "excited",
          sceneEnergy: "dynamic",
          characters: [{ id: "chef", name: "Chef", role: "mascot", referenceImageUrl: "/chef.png" }],
        },
      ],
      performanceStates: [],
    };

    const plan = buildMotionPerformanceFramePlan({
      handoff,
      videoDurationSeconds: 6,
      sampleIntervalSeconds: 0.25,
    });
    const chefFrames = plan.frames.filter((f) => f.characterId === "chef");
    const before = chefFrames.find((f) => f.time === 0);
    const during = chefFrames.find((f) => f.time === 1);
    const after = chefFrames.find((f) => f.time === 4.5);

    assert.equal(before?.activeSpeaker, false);
    assert.equal(before?.mouthState, "closed");
    assert.equal(during?.activeSpeaker, true);
    assert.notEqual(during?.mouthState, "closed");
    assert.equal(after?.activeSpeaker, false);
    assert.equal(after?.mouthState, "closed");
  });

  it("mouthStateAtSegmentTime uses emotion and energy", () => {
    const segment = { text: "Hi", startSeconds: 0, endSeconds: 3 };
    const angry = mouthStateAtSegmentTime(segment, 0, "angry", "intense");
    const calm = mouthStateAtSegmentTime(segment, 0, "calm", "calm");
    assert.equal(angry, "medium");
    assert.equal(calm, "closed");
  });

  it("falls back when mouth assets are missing", () => {
    const profile = baseProfile({ mouthAnimationEnabled: true });
    assert.equal(characterHasMouthAssetsForOverlay(profile), false);
    assert.equal(resolveMouthAssetUrl(profile, "medium"), null);
  });

  it("builds export overlay plan when mouth assets exist", () => {
    const profile = baseProfile({
      mouthAnimationEnabled: true,
      mouthSmallAssetUrl: "https://cdn.example/mouth-small.png",
      mouthMediumAssetUrl: "https://cdn.example/mouth-medium.png",
      mouthWideAssetUrl: "https://cdn.example/mouth-wide.png",
    });
    assert.equal(characterHasMouthAssetsForOverlay(profile), true);
    const frames = [
      {
        time: 1,
        sceneIndex: 0,
        characterId: "chef",
        characterName: "Chef",
        activeSpeaker: true,
        mouthState: "small" as const,
        mouthOpenAmount: 0.25,
        smileStrength: 80,
        blinkState: "open" as const,
        headOffsetX: 0,
        headOffsetY: 0,
        idleOffsetX: 0,
        idleOffsetY: 0,
        energyMultiplier: 1.5,
        emotionModifier: "excited",
      },
      {
        time: 1.25,
        sceneIndex: 0,
        characterId: "chef",
        characterName: "Chef",
        activeSpeaker: true,
        mouthState: "medium" as const,
        mouthOpenAmount: 0.6,
        smileStrength: 80,
        blinkState: "open" as const,
        headOffsetX: 0,
        headOffsetY: 0,
        idleOffsetX: 0,
        idleOffsetY: 0,
        energyMultiplier: 1.5,
        emotionModifier: "excited",
      },
    ];
    const windows = buildMouthAssetOverlayWindows({
      frames,
      profiles: [profile],
      videoWidth: 1080,
      videoHeight: 1920,
    });
    assert.equal(windows.length, 2);
    assert.match(windows[0]!.assetUrl, /mouth-small/);
    assert.match(windows[1]!.assetUrl, /mouth-medium/);
  });

  it("preview cycle frames match emotion mapping", () => {
    assert.deepEqual(previewSpeakingMouthCycleFrames({ emotion: "sad", sceneEnergy: "neutral" }), [
      ...SPEAKING_MOUTH_CYCLES.sad,
    ]);
  });
});

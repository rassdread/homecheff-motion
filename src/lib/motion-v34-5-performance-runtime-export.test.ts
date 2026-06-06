import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachPerformanceToHandoffPayload } from "@/lib/attach-performance-handoff";
import { attachVoiceToHandoffPayload } from "@/lib/attach-voice-handoff";
import { buildMotionPerformanceFramePlan } from "@/lib/build-motion-performance-frame-plan";
import { mouthOpenAmountFromMouthState } from "@/lib/mouth-open-amount";
import {
  buildPerformanceOverlaySegments,
  formatPerformanceOverlayLine,
} from "@/lib/studio-performance-ffmpeg";
import {
  buildMotionStudioPerformanceExportMetadata,
  shouldApplyStudioPerformanceOverlay,
} from "@/lib/motion-performance-export";
import {
  DEFAULT_MOUTH_ANIMATION_PROFILE_FIELDS,
  getPerformanceEmotionModifier,
  SCENE_ENERGY_MULTIPLIERS,
} from "@/lib/studio-character-performance";
import { buildPerformanceExportRenderSnapshot } from "@/lib/motion-performance-export";
import { buildRenderSettingsSnapshot } from "@/lib/render-version-snapshots";
import { validateMotionPerformanceExport } from "@/lib/studio-performance-export-validation";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { MouthMovementState } from "@/types/studio-character-performance";

function mouthCases(): Array<[MouthMovementState, number]> {
  return [
    ["closed", 0],
    ["small", 0.25],
    ["medium", 0.6],
    ["wide", 1],
  ];
}

describe("Studio V34.5 — performance runtime export", () => {
  it("maps mouth open amounts per spec", () => {
    for (const [state, amount] of mouthCases()) {
      assert.equal(mouthOpenAmountFromMouthState(state), amount);
    }
  });

  it("applies emotion modifiers including angry", () => {
    const angry = getPerformanceEmotionModifier("angry");
    assert.ok(angry.mouthMultiplier > 1);
    assert.ok(angry.smileMultiplier < 1);
    const happy = getPerformanceEmotionModifier("happy");
    assert.ok(happy.smileMultiplier > 1);
  });

  it("applies energy multipliers", () => {
    assert.equal(SCENE_ENERGY_MULTIPLIERS.calm, 0.5);
    assert.equal(SCENE_ENERGY_MULTIPLIERS.neutral, 1);
    assert.equal(SCENE_ENERGY_MULTIPLIERS.dynamic, 1.5);
    assert.equal(SCENE_ENERGY_MULTIPLIERS.intense, 2);
  });

  it("switches active speaker from voice segments", () => {
    const handoff = {
      version: MOTION_HANDOFF_PAYLOAD_VERSION,
      storyboardId: "sb",
      characterPerformanceProfiles: [
        {
          characterId: "c1",
          characterName: "Chef",
          performanceEnabled: true,
          defaultSmileStrength: 80,
          defaultBlinkRate: "medium",
          defaultHeadMovement: "medium",
          defaultMouthIntensity: "medium",
          idleAnimationStyle: "natural",
          performanceNotes: "",
          styleLabel: "Friendly",
          ...DEFAULT_MOUTH_ANIMATION_PROFILE_FIELDS,
        },
        {
          characterId: "c2",
          characterName: "Garden",
          performanceEnabled: true,
          defaultSmileStrength: 70,
          defaultBlinkRate: "medium",
          defaultHeadMovement: "low",
          defaultMouthIntensity: "medium",
          idleAnimationStyle: "subtle",
          performanceNotes: "",
          styleLabel: "Calm",
          ...DEFAULT_MOUTH_ANIMATION_PROFILE_FIELDS,
        },
      ],
      performanceStates: [],
      voiceSegments: [
        {
          sceneId: "sc-1",
          speaker: "Chef",
          text: "Hello there welcome",
          startSeconds: 0,
          endSeconds: 2,
        },
        {
          sceneId: "sc-2",
          speaker: "Garden",
          text: "Plants are great today",
          startSeconds: 2,
          endSeconds: 4,
        },
      ],
      scenes: [
        {
          sceneId: "sc-1",
          order: 0,
          title: "A",
          description: "",
          location: null,
          characters: [
            { id: "c1", name: "Chef", role: "mascot", description: "", personality: "", referenceImageUrl: "https://x/c.jpg" },
            { id: "c2", name: "Garden", role: "mascot", description: "", personality: "", referenceImageUrl: "" },
          ],
          props: [],
          action: "",
          emotion: "happy",
          camera: "",
          sceneEnergy: "dynamic",
          transitionToNext: "cut",
          durationSeconds: 2,
        },
        {
          sceneId: "sc-2",
          order: 1,
          title: "B",
          description: "",
          location: null,
          characters: [
            { id: "c1", name: "Chef", role: "mascot", description: "", personality: "", referenceImageUrl: "" },
            { id: "c2", name: "Garden", role: "mascot", description: "", personality: "", referenceImageUrl: "https://x/g.jpg" },
          ],
          props: [],
          action: "",
          emotion: "calm",
          camera: "",
          sceneEnergy: "neutral",
          transitionToNext: "cut",
          durationSeconds: 2,
        },
      ],
    } as unknown as unknown as MotionHandoffPayload;

    const plan = buildMotionPerformanceFramePlan({ handoff, videoDurationSeconds: 4 });
    const chefActive = plan.frames.filter((f) => f.time >= 0 && f.time < 2 && f.characterId === "c1");
    const gardenActive = plan.frames.filter((f) => f.time >= 2 && f.time < 4 && f.characterId === "c2");
    assert.ok(chefActive.some((f) => f.activeSpeaker));
    assert.ok(gardenActive.some((f) => f.activeSpeaker));
    const chefIdleInChefWindow = plan.frames.filter(
      (f) => f.time >= 0 && f.time < 2 && f.characterId === "c2"
    );
    assert.ok(chefIdleInChefWindow.every((f) => !f.activeSpeaker));
  });

  it("falls back to all idle when no speaker segment", () => {
    const handoff = {
      version: MOTION_HANDOFF_PAYLOAD_VERSION,
      storyboardId: "sb",
      characterPerformanceProfiles: [
        {
          characterId: "c1",
          characterName: "Chef",
          performanceEnabled: true,
          defaultSmileStrength: 80,
          defaultBlinkRate: "medium",
          defaultHeadMovement: "medium",
          defaultMouthIntensity: "medium",
          idleAnimationStyle: "natural",
          performanceNotes: "",
          styleLabel: "Friendly",
          ...DEFAULT_MOUTH_ANIMATION_PROFILE_FIELDS,
        },
      ],
      performanceStates: [],
      voiceSegments: [],
      scenes: [
        {
          sceneId: "sc-1",
          order: 0,
          title: "A",
          description: "",
          location: null,
          characters: [{ id: "c1", name: "Chef", role: "mascot", description: "", personality: "", referenceImageUrl: "" }],
          props: [],
          action: "",
          emotion: "neutral",
          camera: "",
          transitionToNext: "cut",
          durationSeconds: 4,
        },
      ],
    } as unknown as unknown as MotionHandoffPayload;

    const plan = buildMotionPerformanceFramePlan({ handoff, videoDurationSeconds: 4 });
    assert.ok(plan.frames.every((f) => !f.activeSpeaker));
    assert.ok(plan.frames.every((f) => f.mouthState === "closed"));
  });

  it("skips legacy handoff below v14", () => {
    const handoff = {
      version: 13,
      storyboardId: "sb",
      characterPerformanceProfiles: [],
      scenes: [],
    } as unknown as unknown as MotionHandoffPayload;
    const plan = buildMotionPerformanceFramePlan({ handoff, videoDurationSeconds: 8 });
    assert.equal(plan.frames.length, 0);
    assert.equal(
      shouldApplyStudioPerformanceOverlay({ studioHandoffJson: handoff, videoDurationSeconds: 8 }),
      false
    );
  });

  it("respects performance disabled profiles", () => {
    const handoff = {
      version: MOTION_HANDOFF_PAYLOAD_VERSION,
      storyboardId: "sb",
      characterPerformanceProfiles: [
        {
          characterId: "c1",
          characterName: "Chef",
          performanceEnabled: false,
          defaultSmileStrength: 80,
          defaultBlinkRate: "medium",
          defaultHeadMovement: "medium",
          defaultMouthIntensity: "medium",
          idleAnimationStyle: "natural",
          performanceNotes: "",
          styleLabel: "Friendly",
          ...DEFAULT_MOUTH_ANIMATION_PROFILE_FIELDS,
        },
      ],
      scenes: [],
      voiceSegments: [{ sceneId: "sc-1", speaker: "Chef", text: "Hi", startSeconds: 0, endSeconds: 1 }],
    } as unknown as unknown as MotionHandoffPayload;
    const plan = buildMotionPerformanceFramePlan({ handoff, videoDurationSeconds: 2 });
    assert.equal(plan.frames.length, 0);
  });

  it("builds overlay segment text for active speaker", () => {
    const line = formatPerformanceOverlayLine({
      time: 1,
      sceneIndex: 0,
      characterId: "c1",
      characterName: "Chef",
      activeSpeaker: true,
      mouthState: "medium",
      mouthOpenAmount: 0.6,
      smileStrength: 85,
      blinkState: "open",
      headOffsetX: 1,
      headOffsetY: 0,
      idleOffsetX: 0,
      idleOffsetY: 0,
      energyMultiplier: 1.5,
      emotionModifier: "happy",
    });
    assert.match(line, /Chef/);
    assert.match(line, /MEDIUM|medium/i);
    const segments = buildPerformanceOverlaySegments([{
      time: 0,
      sceneIndex: 0,
      characterId: "c1",
      characterName: "Chef",
      activeSpeaker: true,
      mouthState: "wide",
      mouthOpenAmount: 1,
      smileStrength: 90,
      blinkState: "closed",
      headOffsetX: 0,
      headOffsetY: 0,
      idleOffsetX: 0,
      idleOffsetY: 0,
      energyMultiplier: 1,
      emotionModifier: "excited",
    }]);
    assert.ok(segments.length > 0);
    assert.ok(segments[0]!.active);
  });

  it("stores performance metadata snapshot on render version settings", () => {
    const meta = buildMotionStudioPerformanceExportMetadata({
      handoff: {
        version: MOTION_HANDOFF_PAYLOAD_VERSION,
        storyboardId: "sb",
        characterPerformanceProfiles: [
          {
            characterId: "c1",
            characterName: "Chef",
            performanceEnabled: true,
            defaultSmileStrength: 80,
            defaultBlinkRate: "medium",
            defaultHeadMovement: "medium",
            defaultMouthIntensity: "medium",
            idleAnimationStyle: "natural",
            performanceNotes: "",
            styleLabel: "Friendly",
            ...DEFAULT_MOUTH_ANIMATION_PROFILE_FIELDS,
          },
        ],
        scenes: [],
        voiceSegments: [],
      } as unknown as unknown as MotionHandoffPayload,
      videoDurationSeconds: 4,
      performanceApplied: true,
    });
    assert.ok(meta);
    const snap = buildPerformanceExportRenderSnapshot(meta);
    assert.equal(snap?.performanceApplied, true);
    const settings = buildRenderSettingsSnapshot({
      instantMode: "storyboard",
      instantTransitionSeconds: 0.5,
      instantOutputDurationSeconds: 8,
      instantStoryboardDurationSeconds: 8,
      stylePreset: null,
      aspectRatio: "9:16",
      presetId: "default",
      instantLockedTextMode: false,
      instantTextRenderMode: "hybrid",
      instantHybridOverlayStyle: "default",
      languageTextLayersJson: null,
      studioHandoffJson: { motionPerformanceExport: meta },
    });
    assert.ok(settings.studioPerformanceExport);
  });

  it("validates export warnings without blocking", () => {
    const warnings = validateMotionPerformanceExport({
      handoff: {
        version: MOTION_HANDOFF_PAYLOAD_VERSION,
        storyboardId: "sb",
        voiceMetadata: { ready: true },
        voiceSegments: [],
        scenes: [{ sceneId: "s", title: "T", emotion: "mysterious_unknown", sceneEnergy: "wild", characters: [] }],
        characterPerformanceProfiles: [],
      } as unknown as unknown as MotionHandoffPayload,
      profiles: [],
    });
    assert.ok(warnings.some((w) => w.code === "no_voice_segments"));
  });
});

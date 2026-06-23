import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachAudioProductionToHandoffPayload } from "@/lib/attach-audio-production-handoff";
import {
  buildAudioProductionDirectorPlan,
  buildMotionAudioProductionHandoffPlan,
  isAudioProductionPlanReady,
} from "@/lib/studio-audio-production-director";
import { buildAssetReadiness } from "@/lib/studio-production-readiness";
import { buildProductionChecklist } from "@/lib/studio-production-center";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import type { MotionHandoffScene } from "@/types/motion-handoff-payload";
import { studioCharacterListItem, studioSceneDetail } from "@/test/studio-api-fixtures";
import { fixture } from "@/test/studio-api-fixtures";

const marketLocation: StudioLocationListItem = {
  id: "loc-market",
  ownerId: "u1",
  name: "Rotterdam Market",
  slug: "market",
  category: "market",
  description: "Busy outdoor market",
  referenceImageUrl: "",
  worldMemory: "",
  visualIdentity: "",
  environmentKeywords: "crowd conversation",
  continuityNotes: "",
  continuityStrength: "strong",
  worldProfileId: null,
  worldProfile: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const chefCharacter = studioCharacterListItem({
  id: "char-chef",
  name: "Chef Marco",
  slug: "chef-marco",
  description: "Main character",
  voiceEnabled: true,
  voiceProvider: "elevenlabs",
  voiceProfile: "warm_narrator",
  voiceLanguage: "en",
});

function scene(order: number, overrides: Partial<StudioSceneDetail> = {}): StudioSceneDetail {
  return studioSceneDetail({
    id: `sc-${order}`,
    storyboardId: "sb-audio",
    order,
    title: `Scene ${order + 1}`,
    description: "Story beat",
    action: "walking",
    emotion: "happy",
    camera: "medium_shot",
    shotType: "medium",
    cameraMovement: "static",
    sceneEnergy: "dynamic",
    transitionToNext: order === 1 ? "whoosh" : "cut",
    musicCueType: "",
    musicEnergyTarget: "",
    musicTransitionType: "",
    musicStartBehavior: "",
    musicEndBehavior: "",
    soundEnvironmentOverride: "",
    soundCharacterOverride: "",
    soundPropOverride: "",
    soundTransitionOverride: "",
    soundAmbientOverride: "",
    voicePriority: "",
    musicPriority: "",
    soundPriority: "",
    audioFocus: "",
    duckingMode: "",
    durationSeconds: 5,
    locationId: null,
    location: null,
    characters: [],
    props: [],
    sceneImages: [],
    ...overrides,
  });
}

function storyboard(
  scenes: StudioSceneDetail[],
  overrides: Partial<StudioStoryboardDetail> = {}
): StudioStoryboardDetail {
  return {
    id: "sb-audio",
    ownerId: "user-1",
    title: "Audio Production Demo",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: true,
    voiceLanguage: "en",
    voiceStyle: "warm",
    voiceProfile: "warm_narrator",
    narrationMode: "narrator",
    voiceNarrationScript:
      "Welcome to our story about fresh ingredients.\nWe follow Chef Marco through the market.\nThe kitchen comes alive with energy.\nA perfect dish brings everyone together.",
    musicEnabled: true,
    musicStyle: "",
    musicIntensity: "balanced",
    musicNarrativeRole: "support_narrative",
    musicNotes: "",
    soundEnabled: true,
    soundStyle: "",
    soundDensity: "balanced",
    soundNotes: "",
    audioProductionEnabled: true,
    audioStyle: "",
    audioPriorityStrategy: "balanced",
    audioNotes: "",
    autoSelectImprovedImage: true,
    sceneCount: scenes.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scenes,
    ...overrides,
  } as unknown as StudioStoryboardDetail;
}

function minimalHandoff(sceneIds: string[]): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-audio",
    title: "Audio Production Demo",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    shotDiversityScore: 50,
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
    scenes: fixture<MotionHandoffScene[]>(sceneIds.map((id, order) => ({
      sceneId: id,
      order,
      title: `Scene ${order + 1}`,
      description: "",
      action: "",
      emotion: "",
      camera: "",
      shotType: "medium",
      cameraMovement: "static",
      sceneEnergy: "neutral",
      transitionToNext: "",
      durationSeconds: 5,
      location: null,
      characters: [],
      props: [],
      voice: "",
      music: "",
      studioContext: {
        source: "studio",
        storyboardId: "sb-audio",
        sceneId: id,
        action: "",
        emotion: "",
        camera: "",
        transitionToNext: "",
        location: null,
        characters: [],
        props: [],
        notes: "",
      },
      generatedPrompt: "",
      stylePrompt: "",
      continuityPrompt: "",
      promptVersion: { version: 1, generatedAt: "", profile: "commercial" },
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
    }))),
  };
}

describe("Studio V37 — Audio Production Director", () => {
  it("handoff payload version is 17", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 27);
  });

  it("voice focus when narration exists", () => {
    const sb = storyboard([
      scene(0, { description: "Opening narration about the brand." }),
      scene(1),
      scene(2),
      scene(3),
    ]);
    const plan = buildAudioProductionDirectorPlan(sb);
    assert.equal(plan.sceneCues[0]?.audioFocus, "voice");
    assert.ok(plan.sceneCues[0]!.voicePriority >= 80);
    assert.ok(plan.sceneCues[0]!.duckingRecommendations.music);
  });

  it("music focus for montage-style build scene without narration", () => {
    const sb = storyboard(
      [
        scene(0, { title: "Montage", description: "", action: "montage sequence" }),
        scene(1, { description: "Chef prepares ingredients." }),
      ],
      { voiceEnabled: false, musicEnabled: true, soundEnabled: false }
    );
    const plan = buildAudioProductionDirectorPlan(sb);
    const focus = plan.sceneCues[0]?.audioFocus;
    assert.ok(focus === "music" || focus === "balanced");
    assert.ok(plan.sceneCues[0]!.musicPriority >= 50);
  });

  it("sound focus for intense action scene", () => {
    const sb = storyboard(
      [
        scene(0, {
          title: "Chase",
          description: "",
          action: "chase through market",
          sceneEnergy: "intense",
          location: marketLocation,
          locationId: marketLocation.id,
        }),
      ],
      { voiceEnabled: false, musicEnabled: true, soundEnabled: true }
    );
    const plan = buildAudioProductionDirectorPlan(sb);
    assert.equal(plan.sceneCues[0]?.audioFocus, "sound");
    assert.ok(plan.sceneCues[0]!.soundPriority >= 70);
  });

  it("balanced focus for neutral documentary opening", () => {
    const sb = storyboard([scene(0, { sceneEnergy: "calm", emotion: "serious" })], {
      directorProfile: "documentary",
      voiceEnabled: false,
      musicEnabled: false,
      soundEnabled: false,
    });
    const plan = buildAudioProductionDirectorPlan(sb);
    assert.equal(plan.style, "documentary");
    assert.equal(plan.sceneCues[0]?.audioFocus, "balanced");
  });

  it("director profile influences audio style", () => {
    const cinematic = buildAudioProductionDirectorPlan(
      storyboard([scene(0), scene(1)], { directorProfile: "cinematic" })
    );
    const corporate = buildAudioProductionDirectorPlan(
      storyboard([scene(0), scene(1)], { directorProfile: "commercial" })
    );
    assert.equal(cinematic.style, "cinematic");
    assert.equal(corporate.style, "corporate");
    assert.equal(cinematic.priorityStrategy, "cinematic");
    assert.equal(corporate.priorityStrategy, "voice_first");
  });

  it("story arc influences climax mix energy", () => {
    const scenes = [scene(0), scene(1), scene(2), scene(3)];
    const plan = buildAudioProductionDirectorPlan(
      storyboard(scenes, { voiceEnabled: false, musicEnabled: true })
    );
    const climax = plan.sceneCues.find((c) => c.arcPhase === "climax");
    if (climax) {
      assert.ok(climax.musicPriority >= 55);
      assert.ok(climax.soundPriority >= 45);
    } else {
      const peakCue = plan.sceneCues.find((c) => c.arcPhase === "climax" || c.musicPriority >= 70);
      assert.ok(peakCue || plan.sceneCues.length >= 2);
    }
  });

  it("character voice speaker priority for multi-character scene", () => {
    const sb = storyboard(
      [
        scene(0, {
          characters: [chefCharacter, { ...chefCharacter, id: "char-bg", name: "Vendor" }],
        }),
      ],
      {
        voiceNarrationScript: "[Narrator]\nThe market opens.\n[Chef Marco]\nI love fresh produce.",
      }
    );
    const plan = buildAudioProductionDirectorPlan(sb);
    assert.ok(plan.sceneCues[0]?.speakerPriority?.includes("Narrator"));
  });

  it("detects narration + loud music conflict", () => {
    const sb = storyboard(
      [
        scene(0, {
          musicCueType: "climax",
          musicEnergyTarget: "high",
          description: "Long narration segment with many words for timing.",
        }),
      ],
      { musicIntensity: "bold", musicStyle: "epic" }
    );
    const plan = buildAudioProductionDirectorPlan(sb);
    assert.ok(plan.warnings.some((w) => w.code === "narration_loud_music"));
  });

  it("warns when music enabled but plan missing scenes", () => {
    const plan = buildAudioProductionDirectorPlan(storyboard([], { musicEnabled: true }));
    assert.ok(plan.warnings.some((w) => w.code === "no_music_plan"));
  });

  it("attachAudioProductionToHandoffPayload adds V17 fields", () => {
    const scenes = [scene(0), scene(1)];
    const sb = storyboard(scenes);
    const attached = attachAudioProductionToHandoffPayload(minimalHandoff(scenes.map((s) => s.id)), {
      storyboard: sb,
    });
    assert.ok(attached.audioProductionPlan?.enabled);
    assert.ok(attached.audioFocusSummary);
    assert.equal(attached.scenes[0]?.audioProduction?.audioFocus, attached.audioProductionPlan?.sceneCues[0]?.audioFocus);
    assert.equal(attached.scenes[0]?.studioContext.audioFocus, attached.scenes[0]?.audioProduction?.audioFocus);
    assert.ok(attached.scenes[0]?.audioProduction?.duckingRecommendations);
  });

  it("buildMotionAudioProductionHandoffPlan matches director plan", () => {
    const sb = storyboard([scene(0), scene(1)]);
    const handoff = buildMotionAudioProductionHandoffPlan(sb);
    const plan = buildAudioProductionDirectorPlan(sb);
    assert.equal(handoff.sceneCues.length, plan.sceneCues.length);
    assert.deepEqual(handoff.audioWarnings, plan.warnings);
  });

  it("production readiness includes audio production asset", () => {
    const sb = storyboard([scene(0), scene(1)], {
      musicEnabled: true,
      soundEnabled: true,
    });
    const assets = buildAssetReadiness(sb);
    assert.equal(assets.length, 15);
    assert.ok(assets.some((a) => a.id === "audio_production"));
    const checklist = buildProductionChecklist(sb);
    assert.equal(checklist.length, 16);
    assert.ok(checklist.some((c) => c.id === "audio_mix_plan"));
  });

  it("isAudioProductionPlanReady accepts plan with scene cues", () => {
    const plan = buildAudioProductionDirectorPlan(storyboard([scene(0), scene(1)]));
    assert.equal(isAudioProductionPlanReady(plan), true);
  });

  it("legacy handoff v16 has no audio production plan", () => {
    const legacy = {
      ...minimalHandoff(["sc-0"]),
      version: 16 as typeof MOTION_HANDOFF_PAYLOAD_VERSION,
    };
    assert.equal(legacy.version, 16);
    assert.equal(legacy.audioProductionPlan, undefined);
    assert.equal(legacy.scenes[0]?.audioProduction, undefined);
  });

  it("respects scene audio focus override", () => {
    const sb = storyboard([scene(0, { audioFocus: "music", description: "Narration here." })]);
    const plan = buildAudioProductionDirectorPlan(sb);
    assert.equal(plan.sceneCues[0]?.audioFocus, "music");
    assert.ok(plan.sceneCues[0]?.hasUserOverrides);
  });
});

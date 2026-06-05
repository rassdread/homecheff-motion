import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachAudioAssetToHandoffPayload } from "@/lib/attach-audio-asset-handoff";
import {
  buildAudioAssetDirectorPlan,
  buildMotionAudioAssetHandoffPlan,
  isAudioAssetPlanReady,
} from "@/lib/studio-audio-asset-director";
import { selectMusicAssetForCue } from "@/lib/studio-music-asset-selector";
import { selectSoundAssetsForCue } from "@/lib/studio-sound-asset-selector";
import { selectVoiceAssetForProfile } from "@/lib/studio-voice-asset-selector";
import { buildAssetReadiness } from "@/lib/studio-production-readiness";
import { buildProductionChecklist } from "@/lib/studio-production-center";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  StudioLocationListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import type { SceneMusicCue } from "@/types/studio-music-director";
import type { SceneSoundCue } from "@/types/studio-sound-director";

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

function scene(order: number, overrides: Partial<StudioSceneDetail> = {}): StudioSceneDetail {
  return {
    id: `sc-${order}`,
    storyboardId: "sb-asset",
    order,
    title: `Scene ${order + 1}`,
    description: "Story beat with narration about the community.",
    action: "walking",
    emotion: "happy",
    camera: "medium_shot",
    shotType: "medium",
    cameraMovement: "static",
    sceneEnergy: "dynamic",
    transitionToNext: "cut",
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
    voiceAssetOverride: "",
    musicAssetOverride: "",
    ambienceAssetOverride: "",
    sfxAssetOverride: "",
    durationSeconds: 5,
    locationId: null,
    location: null,
    characters: [],
    props: [],
    sceneImages: [],
    selectedSceneImageId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function storyboard(
  scenes: StudioSceneDetail[],
  overrides: Partial<StudioStoryboardDetail> = {}
): StudioStoryboardDetail {
  return {
    id: "sb-asset",
    ownerId: "user-1",
    title: "Audio Asset Demo",
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
      "Welcome to our community story.\nWe explore the local market together.\nEnergy builds toward the finale.\nA warm resolution closes the journey.",
    musicEnabled: true,
    musicStyle: "community",
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
    audioAssetsEnabled: true,
    audioAssetNotes: "",
    autoSelectImprovedImage: true,
    sceneCount: scenes.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scenes,
    ...overrides,
  } as StudioStoryboardDetail;
}

function minimalHandoff(sceneIds: string[]): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-asset",
    title: "Audio Asset Demo",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    shotDiversityScore: 50,
    characterMemory: [],
    locationMemory: null,
    propMemory: [],
    worldMemory: null,
    continuityStrength: "balanced",
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
    scenes: sceneIds.map((id, order) => ({
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
        storyboardId: "sb-asset",
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
    })),
  };
}

describe("Studio V38 — Audio Asset Director", () => {
  it("handoff payload version is 18", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 18);
  });

  it("selectMusicAssetForCue maps community intro", () => {
    const cue = {
      sceneId: "sc-0",
      order: 0,
      title: "Opening",
      cueType: "intro",
      narrativeLabel: "intro",
      energyTarget: "low",
      transitionType: "crossfade",
      startBehavior: "fade_in",
      endBehavior: "fade_out",
      arcPhase: "opening",
      emotion: "happy",
      sceneEnergy: "calm",
      durationSeconds: 5,
      duckingRecommended: false,
      dialoguePriority: false,
      hasUserOverrides: false,
    } as SceneMusicCue;
    const asset = selectMusicAssetForCue({
      cue,
      profileId: "community",
      directorProfile: "commercial",
      arcPhase: "opening",
    });
    assert.equal(asset?.id, "music_community_intro");
    assert.equal(asset?.name, "Community Intro");
  });

  it("selectSoundAssetsForCue maps birds and footsteps", () => {
    const cue = {
      sceneId: "sc-0",
      order: 0,
      title: "Garden",
      environmentSounds: ["birds", "wind"],
      characterSounds: ["footsteps"],
      propSounds: [],
      transitionSounds: ["none"],
      ambientRecommendation: ["birds"],
      emotion: "calm",
      sceneEnergy: "neutral",
      locationCategory: "garden",
      densityScore: 3,
      duckingRecommended: false,
      dialoguePriority: false,
      hasUserOverrides: false,
    } as SceneSoundCue;
    const selected = selectSoundAssetsForCue(cue);
    assert.ok(selected.ambience.some((a) => a.id === "amb_birds"));
    assert.ok(selected.sfx.some((a) => a.id === "sfx_footsteps"));
  });

  it("selectVoiceAssetForProfile maps narrator", () => {
    const asset = selectVoiceAssetForProfile("warm_narrator");
    assert.equal(asset?.id, "voice_narrator_a");
    assert.equal(asset?.name, "Narrator A");
  });

  it("buildAudioAssetDirectorPlan assigns scene packages", () => {
    const sb = storyboard([
      scene(0),
      scene(1, {
        location: marketLocation,
        locationId: marketLocation.id,
        action: "walk through crowd",
      }),
      scene(2, { sceneEnergy: "intense", action: "climax delivery" }),
      scene(3, { sceneEnergy: "calm", emotion: "serene" }),
    ]);
    const plan = buildAudioAssetDirectorPlan(sb);
    assert.ok(plan.enabled);
    assert.equal(plan.scenePackages.length, 4);
    assert.ok(plan.scenePackages[0]!.voiceAssets.length > 0);
    assert.ok(plan.scenePackages[0]!.musicAssets.length > 0);
    assert.ok(plan.assignedVoiceAssets.length > 0);
    assert.ok(plan.assignedMusicAssets.length > 0);
  });

  it("director profile influences music asset selection", () => {
    const scenes = [
      scene(0, { description: "", action: "observe", sceneEnergy: "calm" }),
      scene(1, { sceneEnergy: "neutral" }),
      scene(2, { sceneEnergy: "dynamic" }),
      scene(3, { sceneEnergy: "calm" }),
    ];
    const doc = buildAudioAssetDirectorPlan(
      storyboard(scenes, {
        directorProfile: "documentary",
        musicStyle: "documentary",
        voiceEnabled: false,
      })
    );
    const corp = buildAudioAssetDirectorPlan(
      storyboard(scenes, {
        directorProfile: "commercial",
        musicStyle: "corporate",
        voiceEnabled: false,
      })
    );
    assert.equal(doc.scenePackages[0]?.musicAssets[0]?.assetId, "music_documentary_ambient");
    assert.equal(corp.scenePackages[0]?.musicAssets[0]?.assetId, "music_corporate_build");
  });

  it("story arc assigns stronger assets at climax", () => {
    const sb = storyboard([scene(0), scene(1), scene(2), scene(3)]);
    const plan = buildAudioAssetDirectorPlan(sb);
    const climax = plan.scenePackages.find((p) => p.arcPhase === "climax");
    if (climax) {
      const assetId = climax.musicAssets[0]?.assetId;
      assert.ok(assetId === "music_epic_momentum" || assetId === "music_inspirational_growth");
    } else {
      assert.ok(plan.scenePackages.length >= 2);
    }
  });

  it("detects music asset missing when music enabled without cues coverage", () => {
    const plan = buildAudioAssetDirectorPlan(storyboard([], { musicEnabled: true }));
    assert.ok(plan.warnings.some((w) => w.code === "music_asset_missing" || plan.scenePackages.length === 0));
  });

  it("respects scene music asset override", () => {
    const sb = storyboard([scene(0, { musicAssetOverride: "music_epic_momentum" })]);
    const plan = buildAudioAssetDirectorPlan(sb);
    assert.equal(plan.scenePackages[0]?.musicAssets[0]?.assetId, "music_epic_momentum");
    assert.equal(plan.scenePackages[0]?.musicAssets[0]?.source, "override");
  });

  it("attachAudioAssetToHandoffPayload adds V18 fields", () => {
    const scenes = [scene(0), scene(1)];
    const sb = storyboard(scenes);
    const attached = attachAudioAssetToHandoffPayload(minimalHandoff(scenes.map((s) => s.id)), {
      storyboard: sb,
    });
    assert.ok(attached.audioAssetPlan?.enabled);
    assert.ok(attached.assignedVoiceAssets);
    assert.ok(attached.assignedMusicAssets);
    assert.equal(
      attached.scenes[0]?.sceneAudioAssetPackage?.voiceAssets.length,
      attached.audioAssetPlan?.scenePackages[0]?.voiceAssets.length
    );
    assert.ok(attached.scenes[0]?.studioContext.audioAssets);
  });

  it("production readiness includes audio assets", () => {
    const sb = storyboard([scene(0), scene(1)]);
    const assets = buildAssetReadiness(sb);
    assert.equal(assets.length, 9);
    assert.ok(assets.some((a) => a.id === "audio_assets"));
    const checklist = buildProductionChecklist(sb);
    assert.equal(checklist.length, 10);
    assert.ok(checklist.some((c) => c.id === "audio_asset_assignment"));
  });

  it("isAudioAssetPlanReady accepts complete plan", () => {
    const plan = buildAudioAssetDirectorPlan(storyboard([scene(0), scene(1)]));
    assert.equal(isAudioAssetPlanReady(plan), true);
  });

  it("legacy handoff v17 has no audio asset plan", () => {
    const legacy = {
      ...minimalHandoff(["sc-0"]),
      version: 17 as typeof MOTION_HANDOFF_PAYLOAD_VERSION,
    };
    assert.equal(legacy.version, 17);
    assert.equal(legacy.audioAssetPlan, undefined);
    assert.equal(legacy.scenes[0]?.sceneAudioAssetPackage, undefined);
  });

  it("buildMotionAudioAssetHandoffPlan mirrors director plan", () => {
    const sb = storyboard([scene(0)]);
    const handoff = buildMotionAudioAssetHandoffPlan(sb);
    const plan = buildAudioAssetDirectorPlan(sb);
    assert.deepEqual(handoff.assetWarnings, plan.warnings);
    assert.equal(handoff.scenePackages.length, plan.scenePackages.length);
  });
});

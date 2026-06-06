import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachSoundToHandoffPayload } from "@/lib/attach-sound-handoff";
import {
  buildSoundDirectorPlan,
  buildMotionSoundHandoffPlan,
  isSoundPlanReady,
} from "@/lib/studio-sound-director";
import { resolveSoundProfileForDirector } from "@/lib/studio-sound-profiles";
import { buildAssetReadiness } from "@/lib/studio-production-readiness";
import { buildProductionChecklist } from "@/lib/studio-production-center";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import { studioPropListItem, studioSceneDetail } from "@/test/studio-api-fixtures";

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

const restaurantLocation: StudioLocationListItem = {
  ...marketLocation,
  id: "loc-restaurant",
  name: "Chef Kitchen",
  slug: "kitchen",
  category: "restaurant",
  environmentKeywords: "kitchen dining plates",
};

const phoneProp = studioPropListItem({
  id: "prop-phone",
  name: "Smartphone",
  slug: "phone",
  category: "phone",
  description: "Brand phone with notifications",
});

function scene(order: number, overrides: Partial<StudioSceneDetail> = {}): StudioSceneDetail {
  return studioSceneDetail({
    id: `sc-${order}`,
    storyboardId: "sb-sound",
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
    durationSeconds: 5,
    locationId: null,
    location: null,
    characters: [],
    props: [],
    sceneImages: [],
    selectedSceneImageId: null,
    ...overrides,
  });
}

function storyboard(
  scenes: StudioSceneDetail[],
  overrides: Partial<StudioStoryboardDetail> = {}
): StudioStoryboardDetail {
  return {
    id: "sb-sound",
    ownerId: "user-1",
    title: "Sound Director Demo",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: false,
    voiceLanguage: "en",
    voiceStyle: "",
    voiceProfile: "",
    narrationMode: "narrator",
    voiceNarrationScript: "",
    musicEnabled: false,
    musicStyle: "",
    musicIntensity: "balanced",
    musicNarrativeRole: "",
    musicNotes: "",
    soundEnabled: true,
    soundStyle: "",
    soundDensity: "balanced",
    soundNotes: "",
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
    storyboardId: "sb-sound",
    title: "Sound Director Demo",
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
    scenes: sceneIds.map((sceneId, order) => ({
      sceneId,
      order,
      title: `Scene ${order + 1}`,
      description: "",
      action: "",
      emotion: "neutral",
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
        storyboardId: "sb-sound",
        sceneId,
        action: "",
        emotion: "neutral",
        camera: "",
        shotType: "medium",
        cameraMovement: "static",
        sceneEnergy: "neutral",
        directorProfile: "commercial",
        transitionToNext: "",
        location: null,
        characters: [],
        props: [],
        notes: "",
        voice: "",
        music: "",
        generatedPrompt: "",
        stylePrompt: "",
        continuityPrompt: "",
        promptVersion: {
          version: 1,
          generatedAt: new Date().toISOString(),
          generatedPrompt: "",
        },
        selectedSceneImageId: null,
        preferredSceneImageUrl: null,
        sceneImageReference: null,
      },
      generatedPrompt: "",
      stylePrompt: "",
      continuityPrompt: "",
      promptVersion: {
        version: 1,
        generatedAt: new Date().toISOString(),
        generatedPrompt: "",
      },
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
  } as unknown as MotionHandoffPayload;
}

describe("Studio V36 — Sound Effects Director", () => {
  it("handoff payload version is 16 with sound plan fields", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 25);
  });

  it("detects market location environment sounds", () => {
    const plan = buildSoundDirectorPlan(
      storyboard([
        scene(0, {
          locationId: marketLocation.id,
          location: marketLocation,
          action: "shopping",
        }),
      ])
    );
    const cue = plan.sceneCues[0]!;
    assert.ok(cue.environmentSounds.includes("market"));
    assert.ok(cue.environmentSounds.includes("crowd"));
    assert.ok(cue.characterSounds.includes("footsteps"));
  });

  it("detects restaurant kitchen ambience", () => {
    const plan = buildSoundDirectorPlan(
      storyboard([
        scene(0, {
          locationId: restaurantLocation.id,
          location: restaurantLocation,
          action: "cooking",
        }),
      ])
    );
    const cue = plan.sceneCues[0]!;
    assert.ok(cue.environmentSounds.includes("restaurant"));
    assert.ok(cue.propSounds.includes("sizzling") || cue.propSounds.includes("cooking"));
  });

  it("detects prop phone notification sounds", () => {
    const plan = buildSoundDirectorPlan(
      storyboard([
        scene(0, {
          props: [phoneProp],
          action: "typing",
        }),
      ])
    );
    const cue = plan.sceneCues[0]!;
    assert.ok(cue.propSounds.includes("phone") || cue.propSounds.includes("notification"));
    assert.ok(cue.propSounds.includes("typing"));
  });

  it("calm emotion reduces ambient density vs excited", () => {
    const calm = buildSoundDirectorPlan(
      storyboard([scene(0, { emotion: "calm", location: marketLocation, locationId: marketLocation.id })])
    );
    const excited = buildSoundDirectorPlan(
      storyboard([scene(0, { emotion: "excited", location: marketLocation, locationId: marketLocation.id })])
    );
    assert.ok(calm.sceneCues[0]!.densityScore <= excited.sceneCues[0]!.densityScore);
  });

  it("coordinates with music and voice recommendations", () => {
    const plan = buildSoundDirectorPlan(
      storyboard(
        [
          scene(0, {
            location: restaurantLocation,
            locationId: restaurantLocation.id,
            sceneEnergy: "intense",
          }),
        ],
        {
          voiceEnabled: true,
          voiceProfile: "warm_narrator",
          voiceNarrationScript: "Welcome to HomeCheff. Our chef guides you through every recipe step.",
          musicEnabled: true,
          musicIntensity: "bold",
          soundDensity: "rich",
        }
      )
    );
    assert.ok(plan.voiceAware);
    assert.ok(plan.musicAware);
    assert.ok(plan.recommendations.includes("studio.sound.recommendation.balanceWithMusic"));
    assert.ok(plan.warnings.some((w) => w.code === "music_conflict"));
    assert.ok(plan.sceneCues[0]!.duckingRecommended);
  });

  it("plans whoosh transition from scene hint", () => {
    const plan = buildSoundDirectorPlan(
      storyboard([
        scene(0, { transitionToNext: "whoosh to next scene" }),
        scene(1),
      ])
    );
    assert.ok(plan.sceneCues[0]!.transitionSounds.includes("whoosh"));
  });

  it("corporate director resolves clean corporate sound profile", () => {
    const profile = resolveSoundProfileForDirector("commercial");
    assert.equal(profile.id, "corporate");
    const plan = buildSoundDirectorPlan(
      storyboard([scene(0, { location: marketLocation, locationId: marketLocation.id })], {
        directorProfile: "commercial",
      })
    );
    assert.equal(plan.profileId, "corporate");
  });

  it("attachSoundToHandoffPayload adds v16 sound fields per scene", () => {
    const sb = storyboard([
      scene(0, { location: marketLocation, locationId: marketLocation.id }),
      scene(1, { transitionToNext: "whoosh" }),
    ]);
    const attached = attachSoundToHandoffPayload(minimalHandoff(sb.scenes.map((s) => s.id)), {
      storyboard: sb,
    });
    assert.ok(attached.soundPlan?.enabled);
    assert.equal(attached.soundProfile, attached.soundPlan?.profileId);
    assert.equal(attached.sceneSoundCues?.length, 2);
    assert.ok(attached.scenes[0]!.soundCue?.environmentSounds.length);
    assert.ok(attached.scenes[0]!.studioContext.sfx);
  });

  it("production readiness includes sound asset and checklist", () => {
    const sb = storyboard([
      scene(0, { location: marketLocation, locationId: marketLocation.id }),
      scene(1, { location: restaurantLocation, locationId: restaurantLocation.id }),
    ]);
    const assets = buildAssetReadiness(sb);
    const sound = assets.find((a) => a.id === "sound");
    assert.ok(sound);
    assert.equal(sound!.labelKey, "studio.production.asset.sound");

    const checklist = buildProductionChecklist(sb);
    assert.ok(checklist.some((c) => c.id === "sound_plan"));
  });

  it("isSoundPlanReady is false when sound disabled", () => {
    const plan = buildSoundDirectorPlan(
      storyboard([scene(0)], { soundEnabled: false })
    );
    assert.equal(isSoundPlanReady(plan), false);
  });

  it("legacy v15 handoff without sound fields still accepts sound attach", () => {
    const sb = storyboard([scene(0, { location: marketLocation, locationId: marketLocation.id })]);
    const legacy = {
      ...minimalHandoff(sb.scenes.map((s) => s.id)),
      version: 15 as typeof MOTION_HANDOFF_PAYLOAD_VERSION,
      soundPlan: undefined,
      soundProfile: undefined,
      sceneSoundCues: undefined,
    };
    const attached = attachSoundToHandoffPayload(legacy, { storyboard: sb });
    assert.equal(attached.version, 15);
    assert.ok(attached.soundPlan);
    assert.ok(attached.scenes[0]!.soundCue);
  });

  it("buildMotionSoundHandoffPlan mirrors director plan", () => {
    const handoff = buildMotionSoundHandoffPlan(
      storyboard([scene(0, { location: marketLocation, locationId: marketLocation.id })])
    );
    assert.equal(handoff.profileLabelKey, "studio.sound.profile.corporate");
    assert.equal(handoff.sceneSoundCues.length, 1);
  });
});

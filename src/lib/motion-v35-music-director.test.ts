import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachMusicToHandoffPayload } from "@/lib/attach-music-handoff";
import {
  buildMusicDirectorPlan,
  buildMotionMusicHandoffPlan,
  isMusicPlanReady,
} from "@/lib/studio-music-director";
import {
  normalizeStudioMusicProfileId,
  resolveMusicProfileForDirector,
} from "@/lib/studio-music-profiles";
import {
  buildAssetReadiness,
} from "@/lib/studio-production-readiness";
import { buildProductionChecklist } from "@/lib/studio-production-center";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

function scene(order: number, overrides: Partial<StudioSceneDetail> = {}): StudioSceneDetail {
  return {
    id: `sc-${order}`,
    storyboardId: "sb-music",
    order,
    title: `Scene ${order + 1}`,
    description: "Brand story beat.",
    action: "Presenter explains value.",
    emotion: order === 0 ? "calm" : order === 4 ? "hopeful" : "excited",
    camera: "medium_shot",
    shotType: "medium",
    cameraMovement: "static",
    sceneEnergy: order === 0 ? "calm" : order === 3 ? "intense" : "dynamic",
    transitionToNext: order === 2 ? "fade" : "cut",
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
  sceneCount: number,
  overrides: Partial<StudioStoryboardDetail> = {}
): StudioStoryboardDetail {
  const scenes = Array.from({ length: sceneCount }, (_, i) => scene(i));
  return {
    id: "sb-music",
    ownerId: "user-1",
    title: "Music Director Demo",
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
    musicEnabled: true,
    musicStyle: "",
    musicIntensity: "balanced",
    musicNarrativeRole: "support_narrative",
    musicNotes: "",
    autoSelectImprovedImage: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scenes,
    ...overrides,
  } as StudioStoryboardDetail;
}

function minimalHandoff(sceneIds: string[]): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-music",
    title: "Music Director Demo",
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
        storyboardId: "sb-music",
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
  } as MotionHandoffPayload;
}

describe("Studio V35 — Music Director", () => {
  it("handoff payload version is 15 with music plan fields", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 15);
  });

  it("resolves music profile from director profile", () => {
    const corporate = resolveMusicProfileForDirector("commercial");
    assert.equal(corporate.id, "corporate");
    const documentary = resolveMusicProfileForDirector("documentary");
    assert.equal(documentary.id, "documentary");
    assert.equal(normalizeStudioMusicProfileId("epic", "cinematic"), "epic");
  });

  it("maps five-scene story arc to narrative labels", () => {
    const plan = buildMusicDirectorPlan(storyboard(5));
    assert.equal(plan.narrativePlan.length, 5);
    assert.deepEqual(
      plan.narrativePlan.map((e) => e.narrativeLabel),
      ["intro", "build", "momentum", "peak", "resolution"]
    );
    assert.deepEqual(
      plan.narrativePlan.map((e) => e.cueType),
      ["intro", "build", "build", "climax", "resolution"]
    );
  });

  it("maps scene energy to music energy targets via energy curve", () => {
    const plan = buildMusicDirectorPlan(storyboard(5));
    const calmCue = plan.sceneCues.find((c) => c.sceneId === "sc-0");
    const climaxCue = plan.sceneCues.find((c) => c.sceneId === "sc-3");
    assert.equal(calmCue?.energyTarget, "low");
    assert.equal(climaxCue?.energyTarget, "high");
  });

  it("corporate director yields clean modern instrument style", () => {
    const plan = buildMusicDirectorPlan(storyboard(3, { directorProfile: "commercial" }));
    assert.equal(plan.profileId, "corporate");
    assert.equal(plan.style, "clean_modern");
  });

  it("voice-aware plan recommends ducking and caps energy during speech", () => {
    const sb = storyboard(3, {
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
      voiceNarrationScript:
        "Welcome to HomeCheff. Our chef mascot guides you through every recipe step with confidence.",
      musicIntensity: "bold",
      scenes: [
        scene(0, { sceneEnergy: "intense" }),
        scene(1, { sceneEnergy: "intense" }),
        scene(2, { sceneEnergy: "dynamic" }),
      ],
    });
    const plan = buildMusicDirectorPlan(sb);
    assert.ok(plan.voiceAware);
    assert.ok(plan.recommendations.includes("studio.music.recommendation.ducking"));
    assert.ok(plan.recommendations.includes("studio.music.recommendation.dialoguePriority"));
    assert.ok(plan.sceneCues.every((c) => c.duckingRecommended));
    assert.ok(
      plan.warnings.some((w) => w.code === "narration_high_intensity"),
      "bold intensity with narration should warn"
    );
    assert.ok(
      plan.sceneCues.every((c) => c.energyTarget !== "high"),
      "high energy should be reduced under narration"
    );
  });

  it("respects per-scene music cue overrides", () => {
    const sb = storyboard(2, {
      scenes: [scene(0, { musicCueType: "climax" }), scene(1)],
    });
    const plan = buildMusicDirectorPlan(sb);
    assert.equal(plan.sceneCues[0]!.cueType, "climax");
    assert.ok(plan.sceneCues[0]!.hasUserOverrides);
  });

  it("attachMusicToHandoffPayload adds v15 music fields per scene", () => {
    const sb = storyboard(3);
    const sceneIds = sb.scenes.map((s) => s.id);
    const attached = attachMusicToHandoffPayload(minimalHandoff(sceneIds), { storyboard: sb });
    assert.ok(attached.musicPlan?.enabled);
    assert.equal(attached.musicProfile, attached.musicPlan?.profileId);
    assert.equal(attached.sceneMusicCues?.length, 3);
    assert.ok(attached.musicNarrativeSummary?.includes("Scene"));
    assert.ok(attached.scenes[0]!.musicCue?.cueType);
    assert.match(attached.scenes[0]!.studioContext.music, /intro|build|momentum|peak|resolution/);
  });

  it("buildMotionMusicHandoffPlan mirrors director plan for import summary", () => {
    const handoffPlan = buildMotionMusicHandoffPlan(storyboard(5));
    assert.equal(handoffPlan.sceneMusicCues.length, 5);
    assert.equal(handoffPlan.profileLabelKey, "studio.music.profile.corporate");
    assert.ok(handoffPlan.musicNarrativeSummary.length > 0);
  });

  it("production readiness includes music asset and checklist item", () => {
    const sb = storyboard(5);
    const assets = buildAssetReadiness(sb);
    const music = assets.find((a) => a.id === "music");
    assert.ok(music);
    assert.equal(music!.labelKey, "studio.production.asset.music");
    assert.equal(music!.level, "ready");

    const checklist = buildProductionChecklist(sb);
    const musicItem = checklist.find((c) => c.id === "music_plan");
    assert.ok(musicItem);
    assert.equal(musicItem!.labelKey, "studio.production.checklist.musicPlan");
    assert.equal(musicItem!.passed, true);
  });

  it("isMusicPlanReady is false when music disabled", () => {
    const plan = buildMusicDirectorPlan(storyboard(3, { musicEnabled: false }));
    assert.equal(isMusicPlanReady(plan), false);
  });

  it("legacy v14 handoff without music fields still accepts music attach", () => {
    const sb = storyboard(2);
    const legacy = {
      ...minimalHandoff(sb.scenes.map((s) => s.id)),
      version: 14 as typeof MOTION_HANDOFF_PAYLOAD_VERSION,
      musicPlan: undefined,
      musicProfile: undefined,
      sceneMusicCues: undefined,
    };
    const attached = attachMusicToHandoffPayload(legacy, { storyboard: sb });
    assert.equal(attached.version, 14);
    assert.ok(attached.musicPlan);
    assert.equal(attached.sceneMusicCues?.length, 2);
    assert.ok(attached.scenes[0]!.musicCue);
  });
});

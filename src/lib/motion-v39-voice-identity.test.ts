import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachVoiceIdentityToHandoffPayload } from "@/lib/attach-voice-identity-handoff";
import { buildCharacterVoiceAssignment } from "@/lib/studio-character-voice";
import {
  buildVoiceIdentityPlan,
  isVoiceIdentityPlanReady,
} from "@/lib/studio-voice-identity-director";
import {
  normalizeVoiceIdentityLanguage,
  resolveCharacterVoiceIdentity,
} from "@/lib/studio-voice-identity-resolver";
import { selectVoiceAssetsForScene } from "@/lib/studio-voice-asset-selector";
import { buildAssetReadiness } from "@/lib/studio-production-readiness";
import { buildProductionChecklist } from "@/lib/studio-production-center";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioCharacterListItem, StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import { VOICE_IDENTITY_LANGUAGES } from "@/types/studio-voice-identity";

function chefCharacter(overrides: Partial<StudioCharacterListItem> = {}): StudioCharacterListItem {
  return {
    id: "char-chef",
    ownerId: "u1",
    name: "Chef",
    slug: "chef",
    role: "lead",
    description: "",
    personality: "",
    referenceImageUrl: "",
    isMascot: false,
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
    voiceLanguage: "nl",
    voiceGender: "Warm Male",
    voiceDescription: "Warm Male",
    voiceNotes: "",
    voiceLock: true,
    voiceProfilesByLanguage: {
      en: {
        voiceProfile: "commercial",
        voiceGender: "Friendly Male",
        voiceDescription: "Friendly Male",
      },
      es: {
        voiceProfile: "documentary",
        voiceGender: "Warm Latino",
        voiceDescription: "Warm Latino",
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function scene(order: number, characters: StudioCharacterListItem[] = []): StudioSceneDetail {
  return {
    id: `sc-${order}`,
    storyboardId: "sb-v39",
    order,
    title: `Scene ${order + 1}`,
    description: "Community story beat.",
    action: "speaking",
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
    characters,
    props: [],
    sceneImages: [],
    selectedSceneImageId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function storyboard(
  scenes: StudioSceneDetail[],
  overrides: Partial<StudioStoryboardDetail> = {}
): StudioStoryboardDetail {
  return {
    id: "sb-v39",
    ownerId: "user-1",
    title: "Voice Identity Demo",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: true,
    voiceLanguage: "nl",
    voiceStyle: "warm",
    voiceProfile: "documentary",
    narrationMode: "narrator",
    voiceNarrationScript: "Chef welcomes guests.\nGarden shares calm tips.",
    musicEnabled: false,
    musicStyle: "",
    musicIntensity: "",
    musicNarrativeRole: "",
    musicNotes: "",
    soundEnabled: false,
    soundStyle: "",
    soundDensity: "",
    soundNotes: "",
    audioProductionEnabled: false,
    audioStyle: "",
    audioPriorityStrategy: "",
    audioNotes: "",
    audioAssetsEnabled: false,
    audioAssetNotes: "",
    autoSelectImprovedImage: true,
    sceneCount: scenes.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scenes,
    ...overrides,
  } as StudioStoryboardDetail;
}

function minimalHandoff(): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-v39",
    title: "Voice Identity Demo",
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
    scenes: [
      {
        sceneId: "sc-0",
        order: 0,
        title: "Scene 1",
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
          storyboardId: "sb-v39",
          sceneId: "sc-0",
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
      },
    ],
  };
}

describe("Studio V39 — Voice Identity", () => {
  it("handoff payload version is 19", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 19);
  });

  it("supports six voice identity languages including de and pt", () => {
    assert.deepEqual([...VOICE_IDENTITY_LANGUAGES], ["nl", "en", "es", "fr", "de", "pt"]);
    assert.equal(normalizeVoiceIdentityLanguage("de"), "de");
    assert.equal(normalizeVoiceIdentityLanguage("pt"), "pt");
  });

  it("resolveCharacterVoiceIdentity keeps locked base profile against storyboard override", () => {
    const chef = chefCharacter();
    const identity = resolveCharacterVoiceIdentity({
      character: chef,
      language: "nl",
      attemptedOverrideProfile: "documentary",
    });
    assert.equal(identity.voiceProfile, "warm_narrator");
    assert.equal(identity.voiceLock, true);
    assert.equal(identity.source, "locked_base");
  });

  it("resolveCharacterVoiceIdentity applies language override when locked", () => {
    const chef = chefCharacter();
    const en = resolveCharacterVoiceIdentity({ character: chef, language: "en" });
    assert.equal(en.voiceProfile, "commercial");
    assert.equal(en.languageOverrideApplied, true);
    assert.equal(en.displayLabel, "Friendly Male");
  });

  it("buildCharacterVoiceAssignment uses resolver for assignments", () => {
    const chef = chefCharacter({ voiceLock: false });
    const assignment = buildCharacterVoiceAssignment(chef, "nl");
    assert.equal(assignment.voiceProfile, "warm_narrator");
    assert.equal(assignment.presetLabelKey, "studio.voice.preset.warmNarrator");
  });

  it("voice lock enforcement in asset selector prefers locked character profile", () => {
    const chef = chefCharacter();
    const assignment = buildCharacterVoiceAssignment(chef, "nl", {
      attemptedOverrideProfile: "documentary",
    });
    const assets = selectVoiceAssetsForScene({
      scene: scene(0, [chef]),
      storyboardVoiceProfile: "documentary",
      storyboardLanguage: "nl",
      characterAssignments: [assignment],
      isNarrationScene: true,
    });
    assert.equal(assets.primary?.id, "voice_narrator_a");
  });

  it("buildVoiceIdentityPlan maps character to per-language voices", () => {
    const sb = storyboard([scene(0, [chefCharacter()])]);
    const plan = buildVoiceIdentityPlan(sb);
    const chefRows = plan.languageRows.filter((r) => r.characterName === "Chef");
    assert.equal(chefRows.length, 6);
    const nl = chefRows.find((r) => r.language === "nl");
    const en = chefRows.find((r) => r.language === "en");
    assert.equal(nl?.displayLabel, "Warm Male");
    assert.equal(en?.displayLabel, "Friendly Male");
    assert.ok(plan.warnings.some((w) => w.code === "locked_voice_overridden"));
  });

  it("attachVoiceIdentityToHandoffPayload adds V19 fields", () => {
    const sb = storyboard([scene(0, [chefCharacter()])]);
    const payload = attachVoiceIdentityToHandoffPayload(minimalHandoff(), { storyboard: sb });
    assert.ok(payload.voiceIdentityPlan);
    assert.ok(payload.lockedVoiceAssignments?.length);
    assert.ok(payload.resolvedVoiceProfiles?.length);
    assert.ok(payload.characterResolvedVoices?.length);
    assert.equal(payload.scenes[0]?.resolvedVoiceProfile, "warm_narrator");
    assert.equal(payload.scenes[0]?.studioContext.voiceIdentity, "Warm Male");
  });

  it("legacy V18 handoff has no voice identity plan until refresh", () => {
    const legacy = {
      ...minimalHandoff(),
      version: 18 as typeof MOTION_HANDOFF_PAYLOAD_VERSION,
      voiceIdentityPlan: undefined,
    };
    assert.ok(legacy.version < MOTION_HANDOFF_PAYLOAD_VERSION);
    assert.equal(legacy.voiceIdentityPlan, undefined);
  });

  it("production readiness includes voice identity asset", () => {
    const sb = storyboard([scene(0, [chefCharacter()])]);
    const assets = buildAssetReadiness(sb);
    assert.ok(assets.some((a) => a.id === "voice_identity"));
    assert.equal(assets.length, 10);
  });

  it("production checklist includes voice identity validation", () => {
    const sb = storyboard([scene(0, [chefCharacter()])]);
    const checklist = buildProductionChecklist(sb);
    assert.ok(checklist.some((c) => c.id === "voice_identity_validation"));
    assert.equal(checklist.length, 11);
    const ready = isVoiceIdentityPlanReady(buildVoiceIdentityPlan(sb));
    assert.equal(ready, true);
  });
});

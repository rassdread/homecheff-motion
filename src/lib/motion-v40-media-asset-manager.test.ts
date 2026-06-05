import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachMediaAssetToHandoffPayload } from "@/lib/attach-media-asset-handoff";
import {
  buildMediaAssetDirectorPlan,
  isMediaAssetPlanReady,
} from "@/lib/studio-media-asset-director";
import { resolveCharacterLinkedAssets } from "@/lib/studio-media-asset-linking";
import { STUDIO_ASSET_COLLECTIONS } from "@/lib/studio-media-asset-collections";
import {
  buildStudioAssetRegistry,
  studioAssetId,
} from "@/lib/studio-media-asset-registry";
import { buildAssetUsageReport } from "@/lib/studio-media-asset-usage";
import { buildAssetReadiness } from "@/lib/studio-production-readiness";
import { buildProductionChecklist } from "@/lib/studio-production-center";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioCharacterListItem, StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

function chef(): StudioCharacterListItem {
  return {
    id: "char-chef",
    ownerId: "u1",
    name: "Chef",
    slug: "chef",
    role: "lead",
    description: "Community chef",
    personality: "warm",
    referenceImageUrl: "https://example.com/chef.jpg",
    isMascot: true,
    appearanceMemory: "",
    personalityMemory: "",
    continuityNotes: "",
    defaultClothing: "",
    defaultAccessories: "",
    visualKeywords: "chef kitchen",
    primaryReferenceImageId: "char-chef",
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
    voiceProfilesByLanguage: {},
    performanceEnabled: true,
    defaultSmileStrength: 0.5,
    defaultBlinkRate: "normal",
    defaultHeadMovement: "subtle",
    defaultMouthIntensity: "medium",
    idleAnimationStyle: "calm",
    performanceNotes: "",
    mouthAnimationEnabled: true,
    mouthClosedAssetUrl: "https://example.com/mouth-closed.png",
    mouthSmallAssetUrl: "https://example.com/mouth-small.png",
    mouthMediumAssetUrl: "",
    mouthWideAssetUrl: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function scene(characters: StudioCharacterListItem[] = []): StudioSceneDetail {
  return {
    id: "sc-0",
    storyboardId: "sb-v40",
    order: 0,
    title: "Opening",
    description: "Chef welcomes guests.",
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

function storyboard(scenes: StudioSceneDetail[]): StudioStoryboardDetail {
  return {
    id: "sb-v40",
    ownerId: "user-1",
    title: "Asset Registry Demo",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: true,
    voiceLanguage: "nl",
    voiceStyle: "warm",
    voiceProfile: "warm_narrator",
    narrationMode: "narrator",
    voiceNarrationScript: "Chef welcomes everyone.",
    musicEnabled: true,
    musicStyle: "community",
    musicIntensity: "balanced",
    musicNarrativeRole: "support_narrative",
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
  } as StudioStoryboardDetail;
}

function minimalHandoff(): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-v40",
    title: "Asset Registry Demo",
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
    scenes: [],
  };
}

describe("Studio V40 — Media Asset Manager", () => {
  it("handoff payload version is 21", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 23);
  });

  it("buildStudioAssetRegistry indexes system and user assets", () => {
    const registry = buildStudioAssetRegistry({
      characters: [chef()],
      includeSystemCatalog: true,
    });
    assert.ok(registry.some((a) => a.id === studioAssetId("character", "char-chef")));
    assert.ok(registry.some((a) => a.id === studioAssetId("reference_image", "char_char-chef")));
    assert.ok(registry.some((a) => a.category === "mouth_asset"));
    assert.ok(registry.some((a) => a.category === "brand_asset"));
    assert.ok(registry.length > 30);
  });

  it("STUDIO_ASSET_COLLECTIONS includes HomeCheff and HomeGarden packs", () => {
    assert.ok(STUDIO_ASSET_COLLECTIONS.some((c) => c.id === "homecheff_mascots"));
    assert.ok(STUDIO_ASSET_COLLECTIONS.some((c) => c.id === "homegarden_pack"));
  });

  it("resolveCharacterLinkedAssets links reference, mouth, and voice", () => {
    const bundle = resolveCharacterLinkedAssets(chef(), "nl");
    assert.equal(bundle.characterName, "Chef");
    assert.ok(bundle.referenceImages.length >= 1);
    assert.ok(bundle.mouthAssets.length >= 1);
    assert.ok(bundle.voiceAssets.length >= 1);
  });

  it("buildAssetUsageReport tracks storyboard and scene usage", () => {
    const sb = storyboard([scene([chef()])]);
    const registry = buildStudioAssetRegistry({ storyboard: sb, includeSystemCatalog: false });
    const usage = buildAssetUsageReport(sb, registry);
    const chefUsage = usage.find((u) => u.assetId === studioAssetId("character", "char-chef"));
    assert.ok(chefUsage);
    assert.ok(chefUsage.usedBy.some((r) => r.entityType === "storyboard"));
    assert.ok(chefUsage.usedBy.some((r) => r.entityType === "scene"));
  });

  it("buildMediaAssetDirectorPlan validates character bundles", () => {
    const plan = buildMediaAssetDirectorPlan(storyboard([scene([chef()])]));
    assert.equal(plan.enabled, true);
    assert.equal(plan.characterBundles.length, 1);
    assert.ok(plan.registrySummary.length > 0);
    assert.ok(plan.validationScore > 0);
  });

  it("attachMediaAssetToHandoffPayload adds V20 fields", () => {
    const sb = storyboard([scene([chef()])]);
    const payload = attachMediaAssetToHandoffPayload(minimalHandoff(), { storyboard: sb });
    assert.ok(payload.mediaAssetPlan);
    assert.ok(payload.assetReferences?.length);
    assert.ok(payload.assetCollections);
    assert.ok(payload.assetUsageSummary);
  });

  it("legacy V19 handoff has no media asset plan", () => {
    const legacy = {
      ...minimalHandoff(),
      version: 19 as typeof MOTION_HANDOFF_PAYLOAD_VERSION,
      mediaAssetPlan: undefined,
    };
    assert.ok(legacy.version < MOTION_HANDOFF_PAYLOAD_VERSION);
    assert.equal(legacy.mediaAssetPlan, undefined);
  });

  it("production readiness includes asset library", () => {
    const assets = buildAssetReadiness(storyboard([scene([chef()])]));
    assert.ok(assets.some((a) => a.id === "asset_library"));
    assert.equal(assets.length, 14);
  });

  it("production checklist includes asset validation", () => {
    const checklist = buildProductionChecklist(storyboard([scene([chef()])]));
    assert.ok(checklist.some((c) => c.id === "asset_validation"));
    assert.equal(checklist.length, 15);
    assert.equal(isMediaAssetPlanReady(buildMediaAssetDirectorPlan(storyboard([scene([chef()])]))), true);
  });
});

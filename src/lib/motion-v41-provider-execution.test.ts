import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachProviderExecutionToHandoffPayload } from "@/lib/attach-provider-execution-handoff";
import { attachMediaAssetToHandoffPayload } from "@/lib/attach-media-asset-handoff";
import { buildAssetReadiness } from "@/lib/studio-production-readiness";
import { buildProductionChecklist } from "@/lib/studio-production-center";
import { resolveProviderAssignment } from "@/lib/studio-provider-assignment";
import { buildProviderCapabilityMatrix } from "@/lib/studio-provider-capabilities";
import { estimateProviderCost, sumProviderCostEstimates } from "@/lib/studio-provider-cost-estimate";
import {
  buildProviderExecutionPlan,
  isProviderExecutionPlanReady,
} from "@/lib/studio-provider-execution-director";
import { buildProviderFallbackPlan, resolveFallbackProviderId } from "@/lib/studio-provider-fallback";
import {
  getStudioProvider,
  listStudioProviders,
  STUDIO_PROVIDER_REGISTRY,
} from "@/lib/studio-provider-registry";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

function scene(order = 0): StudioSceneDetail {
  return {
    id: `sc-${order}`,
    storyboardId: "sb-v41",
    order,
    title: "Opening",
    description: "Welcome.",
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
    characters: [],
    props: [],
    sceneImages: [],
    selectedSceneImageId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function storyboard(): StudioStoryboardDetail {
  const scenes = [scene(0), scene(1)];
  return {
    id: "sb-v41",
    ownerId: "u1",
    title: "Provider Demo",
    description: "V41 test",
    status: "draft",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: true,
    voiceLanguage: "nl",
    voiceProfile: "warm_narrator",
    voiceStyle: "warm",
    narrationMode: "narrator",
    voiceNarrationScript: "Welcome to the provider demo.",
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
    scenes,
    characters: [],
    locations: [],
    props: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as StudioStoryboardDetail;
}

function minimalHandoff(): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-v41",
    title: "Provider Demo",
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

describe("Studio V41 — Provider Execution Framework", () => {
  it("handoff payload version is 21", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 21);
  });

  it("provider registry lists voice, music, sound, image, and video providers", () => {
    assert.ok(STUDIO_PROVIDER_REGISTRY.length >= 10);
    assert.ok(listStudioProviders({ providerType: "voice" }).some((p) => p.id === "elevenlabs"));
    assert.ok(listStudioProviders({ providerType: "music" }).some((p) => p.id === "suno"));
    assert.ok(listStudioProviders({ providerType: "video" }).some((p) => p.id === "vidu"));
    assert.equal(getStudioProvider("elevenlabs")?.providerType, "voice");
  });

  it("resolveProviderAssignment selects defaults by asset type", () => {
    assert.equal(resolveProviderAssignment({ assetType: "voice" }).selectedProviderId, "elevenlabs");
    assert.equal(resolveProviderAssignment({ assetType: "music" }).selectedProviderId, "suno");
    assert.equal(resolveProviderAssignment({ assetType: "sound" }).selectedProviderId, "freesound");
    assert.equal(
      resolveProviderAssignment({ assetType: "image" }).selectedProviderId,
      "openai_images"
    );
    assert.equal(resolveProviderAssignment({ assetType: "video" }).selectedProviderId, "vidu");
  });

  it("fallback planning maps ElevenLabs to OpenAI Voice and Suno to Udio", () => {
    assert.equal(resolveFallbackProviderId("elevenlabs", "voice"), "openai_voice");
    assert.equal(resolveFallbackProviderId("suno", "music"), "udio");
    assert.equal(resolveFallbackProviderId("vidu", "video"), "kling");
    const plan = buildProviderFallbackPlan();
    assert.ok(plan.enabled);
    assert.ok(plan.steps.every((s) => s.automatic === false));
  });

  it("cost estimates aggregate per provider type", () => {
    const voice = estimateProviderCost({
      providerId: "elevenlabs",
      providerType: "voice",
      sceneCount: 2,
    });
    const video = estimateProviderCost({
      providerId: "vidu",
      providerType: "video",
      sceneCount: 2,
    });
    const sum = sumProviderCostEstimates([voice, video]);
    assert.ok(voice.estimatedCredits > 0);
    assert.ok(video.estimatedCredits > voice.estimatedCredits);
    assert.ok(sum.totalCredits > 0);
    assert.ok(sum.totalCostEur > 0);
  });

  it("capability matrix tracks language and modality support", () => {
    const matrix = buildProviderCapabilityMatrix();
    const eleven = matrix.find((c) => c.providerId === "elevenlabs");
    const vidu = matrix.find((c) => c.providerId === "vidu");
    assert.ok(eleven?.voiceSupport);
    assert.ok(!eleven?.videoSupport);
    assert.ok(vidu?.videoSupport);
    assert.ok(eleven?.languages.includes("nl"));
  });

  it("buildProviderExecutionPlan assigns all five provider slots", () => {
    const plan = buildProviderExecutionPlan(storyboard());
    assert.equal(plan.version, 41);
    assert.equal(plan.voiceProvider, "elevenlabs");
    assert.equal(plan.musicProvider, "suno");
    assert.equal(plan.soundProvider, "freesound");
    assert.equal(plan.imageProvider, "openai_images");
    assert.equal(plan.videoProvider, "vidu");
    assert.equal(plan.assignments.length, 5);
    assert.ok(isProviderExecutionPlanReady(plan));
    assert.ok(plan.estimatedTotalCredits > 0);
    assert.ok(plan.executionWarnings.some((w) => w.code === "planning_only"));
  });

  it("attachProviderExecutionToHandoffPayload adds V21 provider fields", () => {
    const payload = attachProviderExecutionToHandoffPayload(minimalHandoff(), {
      storyboard: storyboard(),
    });
    assert.ok(payload.providerExecutionPlan);
    assert.equal(payload.providerAssignments?.length, 5);
    assert.ok(payload.providerFallbackPlan?.steps.length);
    assert.ok(payload.providerCapabilities?.length);
    assert.ok(payload.providerCostEstimate?.length);
    assert.ok(payload.providerWarnings?.length);
  });

  it("legacy V20 handoff without provider layer remains valid", () => {
    const sb = storyboard();
    const v20 = attachMediaAssetToHandoffPayload(
      { ...minimalHandoff(), version: 20 as typeof MOTION_HANDOFF_PAYLOAD_VERSION },
      { storyboard: sb }
    );
    assert.equal(v20.version, 20);
    assert.ok(v20.mediaAssetPlan);
    assert.equal(v20.providerExecutionPlan, undefined);
    assert.ok(v20.version < MOTION_HANDOFF_PAYLOAD_VERSION);
  });

  it("production readiness includes provider layer", () => {
    const assets = buildAssetReadiness(storyboard());
    assert.ok(assets.some((a) => a.id === "providers"));
    assert.equal(assets.length, 12);
  });

  it("production checklist includes provider execution plan", () => {
    const checklist = buildProductionChecklist(storyboard());
    assert.ok(checklist.some((c) => c.id === "provider_execution"));
    assert.equal(checklist.length, 13);
    assert.equal(isProviderExecutionPlanReady(buildProviderExecutionPlan(storyboard())), true);
  });
});

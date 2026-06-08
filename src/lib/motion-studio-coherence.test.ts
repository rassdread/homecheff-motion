import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapHandoffToPersistedWizardState } from "@/lib/studio-motion-handoff-map";
import {
  mapStudioContinuityToWizardStrength,
  mapStudioStyleProfileToWizardPreset,
} from "@/lib/studio-motion-handoff-style-map";
import { sanitizeMotionHandoffForStorage } from "@/lib/studio-motion-handoff-storage";
import { normalizeAssetCreateEntryPath } from "@/lib/studio-asset-create-entry-path";
import {
  mergeStudioWorkspaceState,
  parseStudioWorkspaceState,
} from "@/types/studio-workspace-state";
import {
  buildProfitabilityFromEvents,
  resolveCostEventProjectId,
} from "@/server/admin/studio-profitability";
import { COST_ACTION } from "@/server/provider-cost/cost-event-types";
import { INSTRUMENTATION_ONLY_ACTIONS } from "@/server/provider-cost/cost-event-types";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import { mergeUserAccountProfile, emptyUserAccountProfile } from "@/types/user-account-profile";

function baseHandoff(): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-coherence",
    title: "Garden Mascotte",
    description: "Promo",
    promptStyleProfile: "social_media",
    directorProfile: "commercial",
    shotDiversityScore: 0.8,
    characterMemory: [],
    locationMemory: null,
    propMemory: [],
    worldMemory: null,
    continuityStrength: "strict",
    consistencyReport: null,
    overallConsistencyScore: null,
    overallVisionScore: null,
    overallCharacterConsistencyScore: null,
    driftWarnings: [],
    characterDriftWarnings: [],
    visionWarnings: [],
    consistencyHistory: [],
    latestImprovementScore: null,
    perSceneCharacterIdentityScores: [],
    characterConsistencyReport: null,
    visionReport: null,
    correctionRecommendations: [],
    executionPackage: null,
    executionReadiness: null,
    executionWarnings: [],
    voiceMetadata: null,
    voiceDuration: null,
    subtitleTrack: null,
    subtitleAvailability: null,
    characterVoiceProfiles: [],
    characterVoiceAssignments: [],
    voiceSegments: [],
    characterPerformanceProfiles: [],
    performanceStates: [],
    activeSpeakerData: [],
    emotionModifiers: [],
    energyModifiers: [],
    renderStrategyPlan: {
      recommendedStrategy: "story_video",
      confidence: "high",
      confidenceScore: 0.9,
      actionComplexity: "moderate",
      estimatedProviderDurationSeconds: 15,
      estimatedFinalDurationSeconds: 15,
      suggestedSpeedAdjustment: null,
      speedAdviceOnly: true,
      requiredImageCount: 3,
      presentImageCount: 3,
      missingImageCount: 0,
      internalInstantMode: "story",
      strategyLabelKey: "x",
      strategyExplanationKey: "y",
      reasons: [],
      warnings: [],
    },
    animationPlan: {
      totalTargetDuration: 15,
      providerDurationEstimate: 15,
      finalDurationEstimate: 15,
      suggestedSpeedAdjustment: null,
      speedAdviceOnly: true,
      totalShotCount: 3,
      missingImageCount: 0,
      recommendedStrategy: "story_video",
      readiness: {
        planPresent: true,
        timingLogical: true,
        imagesComplete: true,
        actionStructureComplete: true,
      },
      scenes: [],
    },
    viduExecutionPlan: {
      executionMode: "story_video",
      executionModeLabelKey: "x",
      usesMultipleSteps: false,
      totalJobCount: 1,
      estimatedDurationSeconds: 15,
      readyToRender: true,
      fallbackActive: false,
      fallbackMode: null,
      fallbackReasonKey: "",
      audioMixIncluded: false,
      audioMixReady: false,
      readiness: {
        planPresent: true,
        readyToRender: true,
        missingStartEndImages: false,
        unsupportedHybridPieces: false,
        fallbackActive: false,
      },
      jobs: [],
      missingRequirementCount: 0,
      warningCount: 0,
    },
    sceneGenerationPlan: {
      readyToRender: true,
      readinessLevel: "ready",
      readinessScore: 1,
      requiredMissing: 0,
      recommendedMissing: 0,
      blockedCount: 0,
      totalRequired: 0,
      totalPresent: 3,
      totalMissing: 0,
      generationStepCount: 0,
      missingAssetCount: 0,
      orderedSteps: [],
      nextImages: [],
    },
    scenes: [
      {
        sceneId: "sc-1",
        order: 0,
        title: "Opening",
        description: "",
        location: null,
        characters: [],
        props: [],
        action: "",
        emotion: "happy",
        camera: "wide_shot",
        transitionToNext: "",
        durationSeconds: 5,
        studioContext: { source: "studio", storyboardId: "sb-coherence", sceneId: "sc-1" },
        generatedPrompt: "",
        stylePrompt: "",
        continuityPrompt: "",
        promptVersion: {
          promptVersion: 1,
          generatedAt: "2026-06-08T12:00:00.000Z",
          sceneId: "sc-1",
          generatedPrompt: "",
          styleProfile: "social_media",
          qualityScore: 60,
          qualityTier: "good",
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
      },
    ],
  } as MotionHandoffPayload;
}

describe("motion-studio-coherence", () => {
  it("maps studio style profile and continuity to wizard presets", () => {
    assert.equal(mapStudioStyleProfileToWizardPreset("social_media"), "social_boost");
    assert.equal(mapStudioStyleProfileToWizardPreset("corporate"), "clean_business");
    assert.equal(mapStudioContinuityToWizardStrength("strict"), "strict");
    assert.equal(mapStudioContinuityToWizardStrength("loose"), "balanced");
  });

  it("imports handoff with style profile instead of hardcoded food_promo", () => {
    const state = mapHandoffToPersistedWizardState(baseHandoff());
    assert.equal(state.stylePreset, "social_boost");
    assert.equal(state.continuityStrength, "strict");
  });

  it("preserves planner metadata in sanitized handoff storage", () => {
    const stored = sanitizeMotionHandoffForStorage(baseHandoff()) as Record<string, unknown>;
    assert.ok(stored.renderStrategyPlan);
    assert.ok(stored.animationPlan);
    assert.ok(stored.viduExecutionPlan);
    assert.ok(stored.sceneGenerationPlan);
  });

  it("treats OCR, storage upload and internal merge as instrumentation-only", () => {
    assert.ok(INSTRUMENTATION_ONLY_ACTIONS.has(COST_ACTION.OPENAI_OCR));
    assert.ok(INSTRUMENTATION_ONLY_ACTIONS.has(COST_ACTION.STORAGE_UPLOAD));
    assert.ok(INSTRUMENTATION_ONLY_ACTIONS.has(COST_ACTION.INTERNAL_MERGE));
  });

  it("redirects legacy existing_asset entry to derive flow", () => {
    assert.equal(normalizeAssetCreateEntryPath("existing_asset"), "derive_from_reference");
    assert.equal(normalizeAssetCreateEntryPath("design"), "design");
  });

  it("merges workspace state patches", () => {
    const base = parseStudioWorkspaceState({
      version: 1,
      storyboardId: "sb-1",
      ownerId: "user-1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    assert.ok(base);
    const merged = mergeStudioWorkspaceState(base!, {
      assetDecisionRegistry: {
        version: 1,
        storyboardId: "sb-1",
        updatedAt: "2026-06-01T00:00:00.000Z",
        decisions: [],
      },
    });
    assert.equal(merged.assetDecisionRegistry?.storyboardId, "sb-1");
  });

  it("rolls studio COGS to linked motion project via storyboardId metadata", () => {
    const storyboardToProject = new Map([["sb-linked", "proj-linked"]]);
    const projectId = resolveCostEventProjectId(
      {
        projectId: null,
        metadataJson: { storyboardId: "sb-linked", feature: "scene_image_generate" },
      },
      storyboardToProject
    );
    assert.equal(projectId, "proj-linked");

    const report = buildProfitabilityFromEvents({
      costEvents: [
        {
          id: "c-studio",
          createdAt: new Date("2026-06-01T12:00:00Z"),
          userId: "user-1",
          projectId: null,
          provider: "openai",
          actionType: COST_ACTION.OPENAI_SCENE_IMAGE,
          internalCostUsd: 0.08,
          totalCostUsd: null,
          metadataJson: { storyboardId: "sb-linked", feature: "scene_image_generate" },
        },
      ],
      billingEvents: [
        {
          id: "b1",
          createdAt: new Date("2026-06-01T13:00:00Z"),
          userId: "user-1",
          projectId: "proj-linked",
          actionType: "vidu_render",
          renderType: "story_mode",
          netPriceEur: 4.99,
          grossPriceEur: 4.99,
        },
      ],
      projectTitles: new Map([["proj-linked", "Garden Promo"]]),
      userEmails: new Map([["user-1", "chef@example.com"]]),
      storyboardToProject,
      now: new Date("2026-06-06T12:00:00Z"),
    });

    const project = report.projectProfitability.find((row) => row.projectId === "proj-linked");
    assert.ok(project);
    assert.ok(project!.totalCostUsd >= 0.08);
    assert.equal(project!.revenueEur, 4.99);
  });

  it("merges user account profile patches", () => {
    const base = emptyUserAccountProfile("user-1", "chef@example.com");
    const merged = mergeUserAccountProfile(base, {
      displayName: "Chef Studio",
      locale: "en",
      emailNotifications: false,
    });
    assert.equal(merged.displayName, "Chef Studio");
    assert.equal(merged.locale, "en");
    assert.equal(merged.emailNotifications, false);
  });
});

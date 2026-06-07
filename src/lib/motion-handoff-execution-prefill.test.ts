import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapHandoffToPersistedWizardState } from "@/lib/studio-motion-handoff-map";
import { resolveMotionHandoffExecutionPrefill } from "@/lib/motion-handoff-execution-prefill";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

function basePayload(overrides: Partial<MotionHandoffPayload> = {}): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-1",
    title: "Promo",
    description: "Test",
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
    scenes: [
      {
        sceneId: "scene-1",
        order: 0,
        title: "Chef",
        description: "Kitchen",
        location: null,
        characters: [],
        props: [],
        action: "cooking",
        emotion: "proud",
        camera: "wide_shot",
        transitionToNext: "",
        durationSeconds: 8,
        selectedSceneImageId: "img-1",
        selectedSceneImageUrl: "https://example.com/scene.jpg",
        selectedSceneImagePromptVersion: 1,
        selectedSceneImageGenerationVersion: 3,
        sceneImageReference: null,
        studioContext: {
          source: "studio",
          storyboardId: "sb-1",
          sceneId: "scene-1",
          action: "cooking",
          emotion: "proud",
          camera: "wide_shot",
          transitionToNext: "",
          location: null,
          characters: [],
          props: [],
          notes: "Kitchen",
        },
        generatedPrompt: "prompt",
        stylePrompt: "style",
        continuityPrompt: "cont",
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
        promptVersion: {
          promptVersion: 1,
          generatedAt: "2026-01-01T00:00:00.000Z",
          sceneId: "scene-1",
          generatedPrompt: "prompt",
          styleProfile: "commercial",
          qualityScore: 80,
          qualityTier: "strong",
        },
      },
    ],
    ...overrides,
  };
}

describe("motion-handoff-execution-prefill", () => {
  it("old handoff without execution plan still defaults to story mode", () => {
    const payload = basePayload();
    const prefill = resolveMotionHandoffExecutionPrefill(payload);
    assert.equal(prefill.instantMode, "story");
    assert.equal(prefill.instantModeSource, "default");
    assert.equal(prefill.metadataAvailable, false);

    const state = mapHandoffToPersistedWizardState(payload);
    assert.equal(state.instantMode, "story");
    assert.ok(state.studioHandoff?.executionPrefill);
  });

  it("story_video preselects story mode", () => {
    const prefill = resolveMotionHandoffExecutionPrefill(
      basePayload({
        viduExecutionPlan: {
          executionMode: "story_video",
          executionModeLabelKey: "studio.executionPlan.mode.storyVideo",
          usesMultipleSteps: false,
          totalJobCount: 1,
          estimatedDurationSeconds: 8,
          readyToRender: true,
          fallbackActive: false,
          fallbackMode: null,
          fallbackReasonKey: "studio.executionPlan.fallback.none",
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
      })
    );
    assert.equal(prefill.instantMode, "story");
    assert.equal(prefill.executionMode, "story_video");

    const state = mapHandoffToPersistedWizardState(basePayload(), { executionPrefill: prefill });
    assert.equal(state.instantMode, "story");
  });

  it("action_chain preselects transition mode", () => {
    const prefill = resolveMotionHandoffExecutionPrefill(
      basePayload({
        viduExecutionPlan: {
          executionMode: "action_chain",
          executionModeLabelKey: "studio.executionPlan.mode.actionChain",
          usesMultipleSteps: true,
          totalJobCount: 3,
          estimatedDurationSeconds: 15,
          readyToRender: false,
          fallbackActive: true,
          fallbackMode: "generate_images_first",
          fallbackReasonKey: "studio.executionPlan.fallback.generateImagesFirst",
          audioMixIncluded: false,
          audioMixReady: false,
          readiness: {
            planPresent: true,
            readyToRender: false,
            missingStartEndImages: true,
            unsupportedHybridPieces: false,
            fallbackActive: true,
          },
          jobs: [{ id: "j1", jobKind: "action_start_end", sceneIds: ["scene-1"], durationSeconds: 5, outputRole: "transition", missingImageCount: 1, beatLabels: [] }],
          missingRequirementCount: 1,
          warningCount: 1,
        },
      })
    );
    assert.equal(prefill.instantMode, "transition");
    assert.equal(prefill.fallbackActive, true);
    assert.ok(prefill.warnings.length > 0);
  });

  it("hybrid shows fallback warning and uses story mode", () => {
    const prefill = resolveMotionHandoffExecutionPrefill(
      basePayload({
        viduExecutionPlan: {
          executionMode: "hybrid",
          executionModeLabelKey: "studio.executionPlan.mode.hybrid",
          usesMultipleSteps: true,
          totalJobCount: 2,
          estimatedDurationSeconds: 12,
          readyToRender: false,
          fallbackActive: true,
          fallbackMode: "preview_only",
          fallbackReasonKey: "studio.executionPlan.fallback.previewOnly",
          audioMixIncluded: false,
          audioMixReady: false,
          readiness: {
            planPresent: true,
            readyToRender: false,
            missingStartEndImages: true,
            unsupportedHybridPieces: false,
            fallbackActive: true,
          },
          jobs: [],
          missingRequirementCount: 1,
          warningCount: 2,
        },
      })
    );
    assert.equal(prefill.instantMode, "story");
    assert.equal(prefill.executionMode, "hybrid");
    assert.ok(prefill.warnings.some((w) => w.id === "hybrid-approach"));
    assert.equal(prefill.fallbackActive, true);
  });

  it("prefills scene durations from animation plan", () => {
    const prefill = resolveMotionHandoffExecutionPrefill(
      basePayload({
        animationPlan: {
          totalTargetDuration: 7,
          providerDurationEstimate: 7,
          finalDurationEstimate: 7,
          suggestedSpeedAdjustment: null,
          speedAdviceOnly: true,
          totalShotCount: 1,
          missingImageCount: 0,
          recommendedStrategy: "story",
          readiness: {
            planPresent: true,
            timingLogical: true,
            imagesComplete: true,
            actionStructureComplete: true,
          },
          scenes: [
            {
              sceneId: "scene-1",
              sceneOrder: 0,
              targetDuration: 7,
              startTime: 0,
              endTime: 7,
              shots: [],
            },
          ],
        },
      })
    );
    assert.equal(prefill.sceneDurations[0]!.durationSeconds, 7);
    assert.equal(prefill.totalDurationSeconds, 7);

    const state = mapHandoffToPersistedWizardState(basePayload(), { executionPrefill: prefill });
    assert.equal(state.durationSec, 7);
    assert.equal(state.sceneSlots?.[0]?.text.durationSeconds, 7);
  });

  it("lists missing scene images", () => {
    const prefill = resolveMotionHandoffExecutionPrefill(
      basePayload({
        scenes: [
          {
            ...basePayload().scenes[0]!,
            selectedSceneImageId: null,
            selectedSceneImageUrl: null,
          },
        ],
      })
    );
    assert.ok(prefill.missingImages.length >= 1);
    assert.equal(prefill.sceneImageMissingCount, 1);
    assert.equal(prefill.readyToRender, false);
  });
});

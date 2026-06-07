import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeExecutionRefreshDiff,
  resolveMotionHandoffExecutionConsumption,
  toMotionExecutionConsumptionSummary,
} from "@/lib/motion-handoff-execution-consumption";
import { mapHandoffToPersistedWizardState } from "@/lib/studio-motion-handoff-map";
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
        promptVersion: { version: 1, generatedAt: "2024-01-01T00:00:00.000Z" },
        notes: "",
        sceneExecutionPackage: null,
        executionPrompt: null,
        studioTextBeats: null,
      },
    ],
    ...overrides,
  } as MotionHandoffPayload;
}

function actionChainScenes() {
  return ["Ball control", "Juggling", "Shooting", "Celebrating"].map((title, order) => ({
    sceneId: `scene-${order + 1}`,
    order,
    title,
    description: title,
    location: null,
    characters: [],
    props: [],
    action: title.toLowerCase(),
    emotion: "excited",
    camera: "medium_shot",
    transitionToNext: "",
    durationSeconds: 5,
    selectedSceneImageId: `img-${order + 1}`,
    selectedSceneImageUrl: `https://example.com/scene-${order + 1}.jpg`,
    selectedSceneImagePromptVersion: 1,
    selectedSceneImageGenerationVersion: 1,
    sceneImageReference: null,
    studioContext: {
      source: "studio" as const,
      storyboardId: "sb-1",
      sceneId: `scene-${order + 1}`,
      action: title.toLowerCase(),
      emotion: "excited",
      camera: "medium_shot",
      transitionToNext: "",
      location: null,
      characters: [],
      props: [],
      notes: title,
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
    promptVersion: { version: 1, generatedAt: "2024-01-01T00:00:00.000Z" },
    notes: "",
    sceneExecutionPackage: null,
    executionPrompt: null,
    studioTextBeats: null,
  }));
}

describe("motion-handoff-execution-consumption", () => {
  it("story mode consumption maps scene image slots", () => {
    const consumption = resolveMotionHandoffExecutionConsumption(
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
          jobs: [
            {
              id: "story-0",
              jobKind: "story_multiframe",
              sceneIds: ["scene-1"],
              durationSeconds: 8,
              outputRole: "full_story",
              missingImageCount: 0,
              beatLabels: ["Chef"],
            },
          ],
          missingRequirementCount: 0,
          warningCount: 0,
        },
      })
    );

    assert.equal(consumption.instantMode, "story");
    assert.equal(consumption.imageSlots.length, 1);
    assert.equal(consumption.imageSlots[0]!.missing, false);
    assert.equal(consumption.expectedTransitionRowCount, 0);
    assert.equal(consumption.plannedJobCount, 1);
    assert.equal(consumption.jobCountMismatch, false);
  });

  it("action chain consumption maps one slot per scene and transition units from jobs", () => {
    const scenes = actionChainScenes();
    const consumption = resolveMotionHandoffExecutionConsumption(
      basePayload({
        scenes,
        animationPlan: {
          totalTargetDuration: 20,
          providerDurationEstimate: 20,
          finalDurationEstimate: 20,
          suggestedSpeedAdjustment: null,
          speedAdviceOnly: true,
          totalShotCount: 4,
          missingImageCount: 0,
          recommendedStrategy: "action_chain",
          readiness: {
            planPresent: true,
            timingLogical: true,
            imagesComplete: true,
            actionStructureComplete: true,
          },
          scenes: scenes.map((s) => ({
            sceneId: s.sceneId,
            sceneOrder: s.order,
            targetDuration: 5,
            startTime: s.order * 5,
            endTime: (s.order + 1) * 5,
            shots: [
              {
                shotRole: "action",
                actionBeat: s.title,
                startTime: 0,
                endTime: 5,
                durationSeconds: 5,
                motionIntent: "action_follow",
                motionIntentKey: "motion",
                cameraIntent: "medium",
                requiredImageRole: "scene_still",
                missingImage: false,
                renderModeHint: "action_chain",
              },
            ],
          })),
        },
        viduExecutionPlan: {
          executionMode: "action_chain",
          executionModeLabelKey: "studio.executionPlan.mode.actionChain",
          usesMultipleSteps: true,
          totalJobCount: 4,
          estimatedDurationSeconds: 20,
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
          jobs: scenes.map((s, i) => ({
            id: `action-${s.sceneId}`,
            jobKind: "action_start_end",
            sceneIds: [s.sceneId],
            durationSeconds: 5,
            outputRole: "action_beat",
            missingImageCount: 0,
            beatLabels: [s.title],
          })),
          missingRequirementCount: 0,
          warningCount: 0,
        },
      })
    );

    assert.equal(consumption.instantMode, "transition");
    assert.equal(consumption.imageSlots.length, 4);
    assert.equal(consumption.transitionUnits.length, 4);
    assert.equal(consumption.actionSegmentCount, 4);
    assert.equal(consumption.expectedTransitionRowCount, 3);
    assert.equal(consumption.jobCountMismatch, true);
  });

  it("hybrid consumption tracks story and action segments", () => {
    const consumption = resolveMotionHandoffExecutionConsumption(
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
          jobs: [
            {
              id: "hybrid-story",
              jobKind: "hybrid_story_segment",
              sceneIds: ["scene-1"],
              durationSeconds: 8,
              outputRole: "segment",
              missingImageCount: 0,
              beatLabels: ["Chef"],
            },
            {
              id: "hybrid-action",
              jobKind: "hybrid_action_segment",
              sceneIds: ["scene-1"],
              durationSeconds: 4,
              outputRole: "action_beat",
              missingImageCount: 1,
              beatLabels: ["action"],
            },
          ],
          missingRequirementCount: 1,
          warningCount: 1,
        },
      })
    );

    assert.equal(consumption.instantMode, "story");
    assert.equal(consumption.storySegmentCount, 1);
    assert.equal(consumption.actionSegmentCount, 1);
    assert.equal(consumption.fallbackActive, true);
  });

  it("persists execution consumption on wizard import", () => {
    const state = mapHandoffToPersistedWizardState(
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
      })
    );

    assert.ok(state.studioHandoff?.executionConsumption);
    assert.equal(state.studioHandoff?.executionConsumption?.instantMode, "story");
  });

  it("refresh diff detects duration and job count changes", () => {
    const previous = toMotionExecutionConsumptionSummary(
      resolveMotionHandoffExecutionConsumption(basePayload())
    );
    const next = toMotionExecutionConsumptionSummary(
      resolveMotionHandoffExecutionConsumption(
        basePayload({
          viduExecutionPlan: {
            executionMode: "action_chain",
            executionModeLabelKey: "studio.executionPlan.mode.actionChain",
            usesMultipleSteps: true,
            totalJobCount: 2,
            estimatedDurationSeconds: 15,
            readyToRender: false,
            fallbackActive: false,
            fallbackMode: null,
            fallbackReasonKey: "",
            audioMixIncluded: false,
            audioMixReady: false,
            readiness: {
              planPresent: true,
              readyToRender: false,
              missingStartEndImages: false,
              unsupportedHybridPieces: false,
              fallbackActive: false,
            },
            jobs: [
              {
                id: "a1",
                jobKind: "action_start_end",
                sceneIds: ["scene-1"],
                durationSeconds: 7,
                outputRole: "action_beat",
                missingImageCount: 0,
                beatLabels: ["a"],
              },
              {
                id: "a2",
                jobKind: "action_start_end",
                sceneIds: ["scene-1"],
                durationSeconds: 8,
                outputRole: "action_beat",
                missingImageCount: 0,
                beatLabels: ["b"],
              },
            ],
            missingRequirementCount: 0,
            warningCount: 0,
          },
        })
      )
    );

    const diff = computeExecutionRefreshDiff(previous, next);
    assert.equal(diff.hasChanges, true);
    assert.ok(diff.items.some((i) => i.kind === "duration"));
    assert.ok(diff.items.some((i) => i.kind === "job_count"));
  });

  it("legacy handoff without planner metadata still works", () => {
    const consumption = resolveMotionHandoffExecutionConsumption(basePayload());
    assert.equal(consumption.metadataAvailable, false);
    assert.equal(consumption.instantMode, "story");
    assert.equal(consumption.imageSlots.length, 1);
    assert.equal(consumption.jobCountMismatch, false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachExecutionToHandoffPayload,
  buildFinalExecutionPrompt,
  buildSceneExecutionPackage,
  computeExecutionReadiness,
  resolveExecutionPromptsBySceneIndex,
  validateStudioExecutionContinuity,
} from "@/lib/studio-scene-execution";
import {
  buildCameraMovementPrompt,
  buildSceneEnergyPrompt,
  buildShotTypePrompt,
} from "@/lib/studio-scene-director";
import { STUDIO_MOTION_HANDOFF_FIELD_AUDIT } from "@/lib/studio-motion-execution-field-audit";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";

function baseScene(overrides: Partial<MotionHandoffScene> = {}): MotionHandoffScene {
  return {
    sceneId: "scene-1",
    order: 0,
    title: "Chef intro",
    description: "Kitchen",
    location: null,
    characters: [
      {
        id: "ch-chef",
        name: "Chef",
        role: "mascot",
        description: "white face, chef hat, spoon, HomeCheff apron",
        personality: "friendly",
        referenceImageUrl: "",
      },
    ],
    props: [],
    action: "stirring",
    emotion: "proud",
    camera: "close_up",
    shotType: "close_up",
    cameraMovement: "push_in",
    sceneEnergy: "dynamic",
    transitionToNext: "",
    durationSeconds: 8,
    selectedSceneImageId: null,
    selectedSceneImageUrl: null,
    selectedSceneImagePromptVersion: null,
    selectedSceneImageGenerationVersion: null,
    sceneImageReference: null,
    studioContext: {
      source: "studio",
      storyboardId: "sb-1",
      sceneId: "scene-1",
      action: "stirring",
      emotion: "proud",
      camera: "close_up",
      shotType: "close_up",
      cameraMovement: "push_in",
      sceneEnergy: "dynamic",
      transitionToNext: "",
      location: null,
      characters: [],
      props: [],
      notes: "Kitchen",
    },
    generatedPrompt: "Chef mascot cooks in a bright HomeCheff kitchen.",
    stylePrompt: "commercial polish",
    continuityPrompt: "Maintain Chef mascot identity and apron branding.",
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
      promptVersion: 3,
      generatedAt: "2026-01-01T00:00:00.000Z",
      sceneId: "scene-1",
      generatedPrompt: "Chef mascot cooks in a bright HomeCheff kitchen.",
      styleProfile: "commercial",
      qualityScore: 80,
      qualityTier: "strong",
    },
    ...overrides,
  };
}

function basePayload(scenes: MotionHandoffScene[]): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-1",
    title: "HomeCheff Promo",
    description: "Brand story",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    shotDiversityScore: 70,
    characterMemory: [
      {
        id: "ch-chef",
        name: "Chef",
        role: "mascot",
        appearanceMemory: "white face, chef hat, spoon, HomeCheff apron",
        personalityMemory: "friendly guide",
        continuityNotes: "keep hat and apron",
        defaultClothing: "HomeCheff apron",
        defaultAccessories: "chef hat, wooden spoon",
        visualKeywords: "mascot, kitchen",
        referenceImageUrl: "",
        primaryReferenceImageId: null,
        referenceNotes: "",
        identityStrength: "strong",
        continuityStrength: "strong",
        worldProfileId: "world-1",
        worldProfileName: "HomeCheff Universe",
      },
    ],
    locationMemory: null,
    propMemory: [],
    worldMemory: {
      id: "world-1",
      name: "HomeCheff Universe",
      description: "Community food brand world",
      visualStyle: "warm, appetizing, clean commercial lighting",
      tone: "welcoming and energetic",
      continuityRules: "consistent HomeCheff logo and mascot styling",
      continuityStrength: "strong",
    },
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
    scenes,
  };
}

describe("studio-scene-execution V30", () => {
  it("documents handoff field audit (phase 1)", () => {
    const used = STUDIO_MOTION_HANDOFF_FIELD_AUDIT.filter((r) => r.status === "used");
    assert.ok(used.some((r) => r.field === "shotType"));
    assert.ok(used.some((r) => r.field === "worldMemory"));
  });

  it("injects director shot, movement, and energy language", () => {
    assert.match(buildShotTypePrompt("close_up"), /close-up/i);
    assert.match(buildCameraMovementPrompt("push_in"), /push-in/i);
    assert.match(buildSceneEnergyPrompt("dynamic"), /dynamic/i);
  });

  it("builds execution package with character and world rules", () => {
    const payload = basePayload([baseScene()]);
    const pkg = buildSceneExecutionPackage(payload.scenes[0]!, {
      directorProfile: payload.directorProfile,
      storyMemory: {
        characters: payload.characterMemory,
        location: payload.locationMemory,
        props: payload.propMemory,
        world: payload.worldMemory,
        continuityStrength: payload.continuityStrength,
      },
      aiDirectorNotes: "Premium commercial pacing",
    });
    assert.equal(pkg.sceneId, "scene-1");
    assert.match(pkg.characterRules, /Chef/i);
    assert.match(pkg.worldRules, /HomeCheff Universe/i);
    assert.match(pkg.continuityRules, /mascot/i);
  });

  it("buildFinalExecutionPrompt combines generated prompt with director constraints", () => {
    const payload = attachExecutionToHandoffPayload(basePayload([baseScene()]), {
      aiDirectorNotes: "Hero product moment",
    });
    const scene = payload.scenes[0]!;
    assert.ok(scene.executionPrompt?.includes("Chef mascot"));
    assert.match(scene.executionPrompt ?? "", /Director execution|close-up|push-in/i);
    const final = buildFinalExecutionPrompt(scene.sceneExecutionPackage!);
    assert.match(final, /Chef mascot/);
  });

  it("attachExecutionToHandoffPayload sets v11 fields and readiness", () => {
    const payload = attachExecutionToHandoffPayload(basePayload([baseScene()]));
    assert.equal(payload.version, MOTION_HANDOFF_PAYLOAD_VERSION);
    assert.ok(payload.executionPackage);
    assert.ok(payload.executionReadiness);
    assert.ok(payload.executionReadiness!.score >= 0);
    assert.ok(["poor", "needs_review", "good", "strong"].includes(payload.executionReadiness!.tier));
    assert.ok(payload.scenes[0]!.sceneExecutionPackage);
  });

  it("validateStudioExecutionContinuity returns warnings only", () => {
    const warnings = validateStudioExecutionContinuity(
      basePayload([
        baseScene({
          characters: [
            {
              id: "ch-chef",
              name: "Chef",
              role: "mascot",
              description: "",
              personality: "",
              referenceImageUrl: "",
            },
          ],
        }),
      ])
    );
    assert.ok(warnings.some((w) => w.code === "mascot_description_missing"));
  });

  it("resolveExecutionPromptsBySceneIndex falls back for legacy v10", () => {
    const legacy = { ...basePayload([baseScene()]), version: 10 as typeof MOTION_HANDOFF_PAYLOAD_VERSION };
    const prompts = resolveExecutionPromptsBySceneIndex(legacy, 1);
    assert.equal(prompts[0], null);
  });

  it("resolveExecutionPromptsBySceneIndex returns prompts for v11", () => {
    const payload = attachExecutionToHandoffPayload(basePayload([baseScene()]));
    const prompts = resolveExecutionPromptsBySceneIndex(payload, 1);
    assert.ok(prompts[0]?.includes("Chef"));
  });

  it("computeExecutionReadiness penalizes missing prompts", () => {
    const weak = computeExecutionReadiness({
      scenes: [baseScene({ generatedPrompt: "", executionPrompt: "" })],
      characterMemory: [],
      worldMemory: null,
      executionWarnings: [{ code: "x", message: "y", severity: "high" }],
    });
    assert.ok(weak.score < 60);
    assert.equal(weak.tier, "poor");
  });
});

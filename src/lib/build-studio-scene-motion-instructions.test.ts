import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudioSceneMotionInstructions,
  resolveStudioMotionInstructionTextsBySceneIndex,
  STUDIO_MOTION_INSTRUCTION_MAX_CHARS,
} from "@/lib/build-studio-scene-motion-instructions";
import { buildInstantStoryModePromptDetailed } from "@/lib/instant-premium-prompt";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";

function baseScene(overrides: Partial<MotionHandoffScene> = {}): MotionHandoffScene {
  return {
    sceneId: "sc-1",
    order: 0,
    title: "Chef moment",
    description: "Community kitchen",
    location: null,
    characters: [],
    props: [],
    action: "",
    emotion: "",
    camera: "",
    transitionToNext: "",
    durationSeconds: 5,
    studioContext: {
      source: "studio",
      storyboardId: "sb-1",
      sceneId: "sc-1",
      action: "",
      emotion: "",
      camera: "",
      transitionToNext: "",
      location: null,
      characters: [],
      props: [],
      notes: "",
    },
    generatedPrompt: "Chef in kitchen.",
    stylePrompt: "",
    continuityPrompt: "",
    promptVersion: { version: 1, generatedPrompt: "Chef in kitchen.", styleProfile: "commercial" },
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
    ...overrides,
  };
}

function minimalPayload(scenes: MotionHandoffScene[]): MotionHandoffPayload {
  return {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: "sb-1",
    title: "Test",
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
    executionPackage: { aiDirectorNotes: "Warm community story with proud chef hero." },
    scenes,
  } as MotionHandoffPayload;
}

describe("buildStudioSceneMotionInstructions", () => {
  it("includes character blocking and safety for blocked scene", () => {
    const scene = baseScene({
      characters: [{ id: "c1", name: "Chef", role: "mascot", description: "", personality: "", referenceImageUrl: "" }],
      characterBlocking: {
        sceneId: "sc-1",
        order: 0,
        sceneGoal: "Present dish",
        activeSpeakerId: "c1",
        activeSpeakerName: "Chef",
        isNarratorScene: false,
        blockingSummary: "Keep mascot on the left, product on the right.",
        characterActions: [
          {
            sceneId: "sc-1",
            characterId: "c1",
            characterName: "Chef",
            action: "PRESENTING",
            engagementLevel: "high",
            isActiveSpeaker: true,
            summaryKey: "studio.blocking.action.summary",
          },
        ],
        characterPoses: [],
        interaction: {
          sceneId: "sc-1",
          interactionType: "DEMONSTRATION",
          participantIds: ["c1"],
          participantNames: ["Chef"],
          descriptionKey: "studio.blocking.interaction.demo",
        },
        attentionTargets: [],
        blockingWarnings: [],
      },
    });
    const result = buildStudioSceneMotionInstructions({
      scene,
      sceneIndex: 0,
      sceneCount: 3,
      aiDirectorNotes: "Warm community story.",
    });
    assert.match(result.text, /Character action: Chef presents proudly/i);
    assert.match(result.text, /Blocking:/i);
    assert.match(result.text, /left/i);
    assert.match(result.text, /Safety:/i);
    assert.ok(result.usedFields.includes("characterBlocking"));
  });

  it("includes props and asset placement layout", () => {
    const scene = baseScene({
      props: [{ id: "p1", name: "Food container", description: "", category: "packaging", referenceImageUrl: "" }],
      assetPlacement: {
        sceneId: "sc-1",
        order: 0,
        compositionType: "product_focus",
        primarySubject: "Food container",
        placementSummary: "Product right, chef left.",
        characterPlacements: [
          {
            sceneId: "sc-1",
            characterId: "c1",
            characterName: "Chef",
            zone: "CENTER_LEFT",
            depth: "FOREGROUND",
            scale: "LARGE",
            orientation: "FORWARD",
            grouping: "SOLO",
            hierarchyScore: 90,
            placementPriority: 1,
            summaryKey: "studio.placement.character",
          },
        ],
        propPlacements: [
          {
            sceneId: "sc-1",
            propId: "p1",
            propName: "Food container",
            zone: "CENTER_RIGHT",
            depth: "FOREGROUND",
            scale: "HERO",
            orientation: "FORWARD",
            linkedCharacterId: "c1",
            linkedCharacterName: "Chef",
            summaryKey: "studio.placement.prop",
          },
        ],
        brandPlacements: [],
        locationPlacement: null,
        placementWarnings: [],
      },
    });
    const result = buildStudioSceneMotionInstructions({
      scene,
      sceneIndex: 1,
      sceneCount: 3,
    });
    assert.match(result.text, /Props: Keep Food container visible/i);
    assert.match(result.text, /Blocking:/i);
    assert.ok(result.usedFields.includes("assetPlacement"));
  });

  it("includes emotion, energy, and camera metadata", () => {
    const scene = baseScene({
      emotion: "warm",
      sceneEnergy: "dynamic",
      shotType: "close_up",
      cameraMovement: "push_in",
      studioContext: {
        ...baseScene().studioContext,
        emotion: "warm",
        sceneEnergy: "dynamic",
        shotType: "close_up",
        cameraMovement: "push_in",
      },
      speakerPerformance: {
        characterId: "c1",
        characterName: "Chef",
        activeSpeaker: true,
        emotion: "proud",
        energy: "dynamic",
        mouthSpeed: 1,
        smileStrength: 70,
        blinkRate: "medium",
        headMovement: "medium",
        idleMovement: "subtle",
        mouthState: "medium",
      },
    });
    const result = buildStudioSceneMotionInstructions({
      scene,
      sceneIndex: 0,
      sceneCount: 2,
    });
    assert.match(result.text, /Emotion:/i);
    assert.match(result.text, /Camera:/i);
    assert.match(result.text, /push-in/i);
    assert.ok(result.usedFields.some((f) => f.includes("emotion")));
  });

  it("returns minimal safety-only output when intelligence data is sparse", () => {
    const result = buildStudioSceneMotionInstructions({
      scene: baseScene(),
      sceneIndex: 0,
      sceneCount: 1,
    });
    assert.match(result.text, /Safety:/i);
    assert.ok(result.text.length < 200);
    assert.deepEqual(result.usedFields, ["safety"]);
  });

  it("keeps output under max char budget", () => {
    const scene = baseScene({
      action: "The chef leans forward and proudly presents the dish to the community with a wide smile.",
      emotion: "proud",
      sceneEnergy: "intense",
      shotType: "close_up",
      cameraMovement: "push_in",
      transitionToNext: "dissolve",
      characters: [{ id: "c1", name: "Chef", role: "mascot", description: "", personality: "", referenceImageUrl: "" }],
      props: [
        { id: "p1", name: "Dish", description: "", category: "food", referenceImageUrl: "" },
        { id: "p2", name: "Logo mug", description: "", category: "packaging", referenceImageUrl: "" },
      ],
      location: {
        id: "loc-1",
        name: "Rotterdam Kitchen",
        description: "Bright modern community kitchen with warm lighting",
        category: "restaurant",
        referenceImageUrl: "",
      },
      characterBlocking: {
        sceneId: "sc-1",
        order: 0,
        sceneGoal: "Hero",
        activeSpeakerId: "c1",
        activeSpeakerName: "Chef",
        isNarratorScene: false,
        blockingSummary: "Chef left third, dish center-right, logo visible on apron.",
        characterActions: [
          {
            sceneId: "sc-1",
            characterId: "c1",
            characterName: "Chef",
            action: "PRESENTING",
            engagementLevel: "high",
            isActiveSpeaker: true,
            summaryKey: "studio.blocking.action.summary",
          },
        ],
        characterPoses: [],
        interaction: {
          sceneId: "sc-1",
          interactionType: "DEMONSTRATION",
          participantIds: ["c1"],
          participantNames: ["Chef"],
          descriptionKey: "studio.blocking.interaction.demo",
        },
        attentionTargets: [],
        blockingWarnings: [],
      },
      sceneComposition: {
        sceneId: "sc-1",
        order: 0,
        compositionType: "hero_shot",
        visualFocus: {
          kind: "character",
          entityId: "c1",
          entityName: "Chef",
          labelKey: "studio.composition.focus.character",
        },
        secondaryVisualFocus: null,
        foregroundEntities: ["Chef"],
        midgroundEntities: [],
        backgroundEntities: ["Kitchen"],
        compositionWarnings: [],
      },
    });
    const result = buildStudioSceneMotionInstructions({
      scene,
      sceneIndex: 0,
      sceneCount: 5,
      aiDirectorNotes: "Cinematic community food story with proud local chef hero moments.",
    });
    assert.ok(result.text.length <= STUDIO_MOTION_INSTRUCTION_MAX_CHARS);
    assert.ok(result.lines.length >= 3);
  });

  it("resolveStudioMotionInstructionTextsBySceneIndex aligns with scene order", () => {
    const payload = minimalPayload([
      baseScene({ sceneId: "a", order: 0, emotion: "happy" }),
      baseScene({ sceneId: "b", order: 1, emotion: "proud", shotType: "wide" }),
    ]);
    const texts = resolveStudioMotionInstructionTextsBySceneIndex(payload, 2);
    assert.equal(texts.length, 2);
    assert.ok(texts[0]?.includes("Safety:"));
    assert.ok(texts[1]?.includes("Camera:"));
  });

  it("injects motion instructions into story mode prompt without replacing execution block", () => {
    const motionLine = "Character action: Chef presents proudly.\nSafety: Do not cover faces.";
    const detailed = buildInstantStoryModePromptDetailed({
      userIntent: "Promo",
      imageCount: 1,
      transitionSeconds: 5,
      sceneTexts: [{ template: "scene", title: "CHEF", subtitle: "local hero" }],
      studioExecutionPrompts: ["Close-up framing. Maintain Chef mascot identity."],
      studioMotionInstructions: [motionLine],
    });
    assert.match(detailed.prompt, /Studio execution \(director, world, characters\)/i);
    assert.match(detailed.prompt, /Studio motion direction:/i);
    assert.match(detailed.prompt, /Chef presents proudly/i);
    assert.match(detailed.prompt, /Close-up framing/i);
  });
});

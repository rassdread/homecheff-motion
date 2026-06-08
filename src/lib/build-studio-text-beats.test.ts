import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachTextBeatsToHandoffPayload,
} from "@/lib/attach-text-beats-handoff";
import {
  buildStudioTextBeats,
  buildStudioTextBeatsForHandoffScene,
  hasStudioTextBeatsContent,
  motionHandoffSceneToBeatSource,
  studioSceneDetailToBeatSource,
} from "@/lib/build-studio-text-beats";
import {
  mapHandoffSceneToPersistedText,
} from "@/lib/studio-motion-handoff-map";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type { StudioSceneDetail } from "@/types/studio-api";

function baseScene(overrides: Partial<MotionHandoffScene> = {}): MotionHandoffScene {
  return {
    sceneId: "scene-1",
    order: 0,
    title: "Fresh Pasta",
    description: "Golden strands twirl in sunlight.",
    location: null,
    characters: [],
    props: [],
    action: "Chef tosses pasta with confidence.",
    emotion: "proud",
    camera: "close_up",
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
      action: "Chef tosses pasta with confidence.",
      emotion: "proud",
      camera: "close_up",
      transitionToNext: "",
      location: null,
      characters: [],
      props: [],
      notes: "",
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
      promptVersion: 3,
      generatedAt: "2026-01-01T00:00:00.000Z",
      sceneId: "scene-1",
      generatedPrompt: "prompt",
      styleProfile: "commercial",
      qualityScore: 80,
      qualityTier: "strong",
    },
    ...overrides,
  };
}

function studioDetail(overrides: Partial<StudioSceneDetail> = {}): StudioSceneDetail {
  return {
    id: "scene-1",
    order: 0,
    title: "Fresh Pasta",
    description: "Golden strands twirl in sunlight.",
    action: "Chef tosses pasta with confidence.",
    emotion: "proud",
    camera: "close_up",
    shotType: "close_up",
    cameraMovement: "static",
    sceneEnergy: "medium",
    transitionToNext: "",
    durationSeconds: 8,
    location: null,
    characters: [],
    props: [],
    sceneImages: [],
    selectedSceneImageId: null,
    ...overrides,
  } as StudioSceneDetail;
}

describe("buildStudioTextBeats", () => {
  it("maps scene title to headline on opening scene", () => {
    const result = buildStudioTextBeats({
      scene: studioSceneDetailToBeatSource(studioDetail({ title: "Fresh Pasta" })),
      sceneIndex: 0,
      sceneCount: 3,
      storyboardTitle: "Kitchen Story",
    });
    assert.equal(result.headlineBeats[0], "FRESH PASTA");
    assert.equal(result.titleBeats[0], "Fresh Pasta");
  });

  it("maps description to subheadline", () => {
    const result = buildStudioTextBeats({
      scene: studioSceneDetailToBeatSource(
        studioDetail({ description: "Steam rises from the pan." })
      ),
      sceneIndex: 1,
      sceneCount: 3,
    });
    assert.match(result.subtitleBeats[0]!, /Steam rises from the pan/);
  });

  it("emotion influences subtitle wording", () => {
    const proud = buildStudioTextBeats({
      scene: studioSceneDetailToBeatSource(
        studioDetail({ description: "The dish is ready.", emotion: "proud" })
      ),
      sceneIndex: 1,
      sceneCount: 3,
    });
    const neutral = buildStudioTextBeats({
      scene: studioSceneDetailToBeatSource(
        studioDetail({ description: "The dish is ready.", emotion: "" })
      ),
      sceneIndex: 1,
      sceneCount: 3,
    });
    assert.match(proud.subtitleBeats[0]!, /proud/i);
    assert.equal(neutral.subtitleBeats[0], "The dish is ready.");
  });

  it("derives hero text from action", () => {
    const result = buildStudioTextBeats({
      scene: studioSceneDetailToBeatSource(
        studioDetail({ action: "Plates the signature dish." })
      ),
      sceneIndex: 1,
      sceneCount: 3,
    });
    assert.equal(result.heroText, "Plates the signature dish.");
    assert.deepEqual(result.heroTextBeats, ["Plates the signature dish."]);
  });

  it("generates finale text on last scene", () => {
    const result = buildStudioTextBeats({
      scene: studioSceneDetailToBeatSource(
        studioDetail({
          order: 2,
          description: "Guests smile as service begins.",
          action: "",
        })
      ),
      sceneIndex: 2,
      sceneCount: 3,
      storyboardTitle: "Kitchen Story",
      storyboardDescription: "A day in our restaurant.",
      aiDirectorNotes: "Keep it warm and inviting.",
    });
    assert.ok(result.heroFinaleText.length > 0);
    assert.ok(hasStudioTextBeatsContent(result));
  });

  it("attachTextBeatsToHandoffPayload adds studioTextBeats per scene", () => {
    const payload: MotionHandoffPayload = {
      version: MOTION_HANDOFF_PAYLOAD_VERSION,
      storyboardId: "sb-1",
      title: "Kitchen Story",
      description: "Promo",
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
      executionPackage: {
        worldName: null,
        directorProfile: "commercial",
        promptStyleProfile: "commercial",
        characterCount: 0,
        locationName: null,
        propCount: 0,
        sceneCount: 2,
        aiDirectorNotes: "Warm promo tone.",
      },
      scenes: [
        baseScene(),
        baseScene({
          sceneId: "scene-2",
          order: 1,
          title: "Finale",
          description: "Service opens to applause.",
          action: "Team takes a bow.",
        }),
      ],
    };

    const enriched = attachTextBeatsToHandoffPayload(payload);
    assert.ok(enriched.scenes[0]?.studioTextBeats);
    assert.equal(enriched.scenes[0]?.studioTextBeats?.source, "studio_auto");
    assert.ok(enriched.scenes[1]?.studioTextBeats?.heroFinaleText);
  });

  it("buildStudioTextBeatsForHandoffScene uses voice segment text when present", () => {
    const scene = baseScene({
      voiceSegment: {
        sceneId: "scene-1",
        order: 0,
        startSeconds: 0,
        endSeconds: 4,
        durationSeconds: 4,
        text: "Welcome to our kitchen.",
        speaker: "narrator",
      },
    });
    const built = buildStudioTextBeatsForHandoffScene(scene, {
      sceneIndex: 0,
      sceneCount: 1,
      storyboardTitle: "Kitchen",
      storyboardDescription: "Promo",
      aiDirectorNotes: "",
    });
    assert.ok(built.usedFields.includes("voiceSegment"));
    assert.ok(
      built.beatLines.some((line) => line.includes("Welcome to our kitchen")) ||
        built.subtitleBeats.some((line) => line.includes("Welcome"))
    );
  });

  it("mapHandoffSceneToPersistedText uses studioTextBeats when present", () => {
    const scene = baseScene({
      studioTextBeats: {
        headlineBeats: ["OPENING"],
        titleBeats: ["Opening"],
        subtitleBeats: ["Warm intro"],
        heroTextBeats: ["Hero line"],
        finaleTextBeats: [],
        beatLines: ["Beat one"],
        heroText: "Hero line",
        heroFinaleText: "",
        template: "hero",
        source: "studio_auto",
        usedFields: ["title"],
        ignoredFields: [],
      },
    });
    const mapped = mapHandoffSceneToPersistedText(scene, 5);
    assert.deepEqual(mapped.headlineBeats, ["OPENING"]);
    assert.equal(mapped.heroText, "Hero line");
    assert.equal(mapped.template, "hero");
  });

  it("mapHandoffSceneToPersistedText falls back to legacy mapping without studioTextBeats", () => {
    const scene = baseScene();
    const mapped = mapHandoffSceneToPersistedText(scene, 5);
    assert.equal(mapped.heroText, "Action: Chef tosses pasta with confidence.");
    assert.equal(mapped.subtitle, "Golden strands twirl in sunlight.");
    assert.equal(mapped.headlineBeats?.length ?? 0, 0);
  });

  it("motionHandoffSceneToBeatSource preserves voice segment text", () => {
    const scene = baseScene({
      voiceSegment: {
        sceneId: "scene-1",
        order: 0,
        startSeconds: 0,
        endSeconds: 3,
        durationSeconds: 3,
        text: "Taste the difference.",
        speaker: "narrator",
      },
    });
    const source = motionHandoffSceneToBeatSource(scene);
    assert.equal(source.voiceSegmentText, "Taste the difference.");
  });
});

describe("handoff payload version", () => {
  it("MOTION_HANDOFF_PAYLOAD_VERSION is 25 for text beats bridge", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 26);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapHandoffSceneToPersistedImage,
  mapHandoffToPersistedWizardState,
} from "@/lib/studio-motion-handoff-map";
import { mergeHandoffIntoWizardSlots } from "@/lib/refresh-motion-handoff-in-wizard";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import { restoreSceneTextDraft } from "@/lib/instant-wizard-scene-slots";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import { INSTANT_WIZARD_DEFAULT_BAKED_TEXT } from "@/lib/reset-instant-premium-wizard";
import { EMPTY_WIZARD_IMAGE_BLOB } from "@/lib/instant-wizard-image-model";

const payload: MotionHandoffPayload = {
  version: MOTION_HANDOFF_PAYLOAD_VERSION,
  storyboardId: "sb-1",
  title: "Promo",
  description: "Test",
  promptStyleProfile: "commercial",
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
      sceneImageReference: {
        sceneImageId: "img-1",
        sceneId: "scene-1",
        storyboardId: "sb-1",
        promptVersion: 1,
        generationVersion: 3,
        imageUrl: "https://example.com/scene.jpg",
        thumbnailUrl: "https://example.com/scene-thumb.jpg",
      },
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
      sceneConsistencyScore: 88,
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
};

describe("studio motion handoff import", () => {
  it("maps scene image to persisted wizard image with studio source", () => {
    const img = mapHandoffSceneToPersistedImage(payload.scenes[0]!);
    assert.ok(img);
    assert.equal(img.imageSource, "studio");
    assert.equal(img.studioSceneImageId, "img-1");
    assert.equal(img.remoteWorkingUrl, "https://example.com/scene.jpg");
  });

  it("builds wizard state with images on slots", () => {
    const state = mapHandoffToPersistedWizardState(payload);
    assert.equal(state.version, 1);
    assert.equal(state.studioHandoff?.handoffVersion, MOTION_HANDOFF_PAYLOAD_VERSION);
    assert.equal(state.sceneSlots?.[0]?.image?.imageSource, "studio");
    assert.equal(state.images.length, 1);
    assert.ok(state.studioHandoff?.intelligence);
    assert.equal(state.sceneSlots?.[0]?.studioContext?.studioQa?.consistencyScore, 88);
  });

  it("mergeHandoffIntoWizardSlots preserves manual replacements", () => {
    const manualImage = {
      id: "manual-1",
      originalFileName: "upload.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 100,
      optimizedBlob: EMPTY_WIZARD_IMAGE_BLOB,
      thumbnailBlob: EMPTY_WIZARD_IMAGE_BLOB,
      bakedText: { ...INSTANT_WIZARD_DEFAULT_BAKED_TEXT },
      imageSource: "manual" as const,
    };
    const slots = [
      {
        sceneId: "scene-1",
        text: restoreSceneTextDraft(emptySceneTextDraft(5), 5),
        image: manualImage,
        studioContext: payload.scenes[0]!.studioContext,
      },
    ];
    const merged = mergeHandoffIntoWizardSlots(slots, payload, 5);
    assert.equal(merged[0]?.image?.imageSource, "manual");
    assert.equal(merged[0]?.image?.id, "manual-1");
  });

  it("leaves slot without studio image empty", () => {
    const noImagePayload: MotionHandoffPayload = {
      ...payload,
      scenes: [
        {
          ...payload.scenes[0]!,
          selectedSceneImageId: null,
          selectedSceneImageUrl: null,
          sceneImageReference: null,
        },
      ],
    };
    const img = mapHandoffSceneToPersistedImage(noImagePayload.scenes[0]!);
    assert.equal(img, null);
  });
});

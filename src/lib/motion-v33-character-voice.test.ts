import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachVoiceToHandoffPayload } from "@/lib/attach-voice-handoff";
import {
  buildCharacterVoiceAssignment,
  buildCharacterVoiceAssignments,
  characterVoiceSnapshotFromRow,
  matchCharacterBySpeakerName,
  parseSpeakerTaggedScript,
  resolveCharacterVoiceForLanguage,
  scriptUsesSpeakerTags,
  validateCharacterVoiceConsistency,
} from "@/lib/studio-character-voice";
import { buildTimedSegmentsFromSpeakerLines } from "@/lib/build-speaker-voice-segments";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { StudioCharacterListItem } from "@/types/studio-api";
import type { StudioStoryboardDetail } from "@/types/studio-api";

const chef: StudioCharacterListItem = {
  id: "c-chef",
  ownerId: "u1",
  name: "Chef",
  slug: "chef",
  role: "mascot",
  description: "",
  personality: "",
  referenceImageUrl: "https://cdn.example/chef.jpg",
  isMascot: true,
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
  voiceLanguage: "en",
  voiceGender: "male",
  voiceDescription: "Warm Male",
  voiceNotes: "",
  voiceLock: true,
  voiceProfilesByLanguage: { nl: { voiceProfile: "documentary", voiceEnabled: true } },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function minimalStoryboard(): StudioStoryboardDetail {
  return {
    id: "sb-1",
    title: "Promo",
    description: "",
    format: "commercial",
    targetPlatform: "instagram",
    aspectRatio: "9:16",
    sceneCount: 1,
    estimatedDurationSeconds: 8,
    status: "draft",
    voiceEnabled: true,
    voiceLanguage: "en",
    voiceProfile: "warm_narrator",
    voiceStyle: "",
    narrationMode: "narrator",
    voiceNarrationScript: "[Chef]\nWelcome to HomeCheff.",
    scenes: [
      {
        id: "sc-1",
        storyboardId: "sb-1",
        order: 0,
        title: "Intro",
        description: "Welcome",
        action: "",
        emotion: "",
        camera: "",
        shotType: "medium",
        cameraMovement: "static",
        sceneEnergy: "medium",
        transitionToNext: "cut",
        durationSeconds: 4,
        locationId: null,
        location: null,
        characters: [chef],
        props: [],
        selectedSceneImageId: null,
        sceneImages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as StudioStoryboardDetail;
}

describe("Motion V33 — character voice profiles", () => {
  it("handoff version is 13", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 13);
  });

  it("character voice snapshot resolves per-language override", () => {
    const snap = characterVoiceSnapshotFromRow({
      voiceEnabled: true,
      voiceProvider: "elevenlabs",
      voiceProfile: "warm_narrator",
      voiceLanguage: "en",
      voiceGender: "",
      voiceDescription: "",
      voiceNotes: "",
      voiceLock: false,
      voiceProfilesJson: { nl: { voiceProfile: "documentary" } },
    });
    const nl = resolveCharacterVoiceForLanguage(snap, "nl");
    assert.equal(nl.voiceProfile, "documentary");
  });

  it("builds character voice assignments from storyboard", () => {
    const assignments = buildCharacterVoiceAssignments(minimalStoryboard(), "en");
    assert.equal(assignments.length, 1);
    assert.equal(assignments[0]!.characterName, "Chef");
    assert.equal(assignments[0]!.voiceProfile, "warm_narrator");
  });

  it("parses speaker-tagged script", () => {
    const script = "[Chef]\nHello.\n[Garden]\nHi there.";
    assert.equal(scriptUsesSpeakerTags(script), true);
    const segments = parseSpeakerTaggedScript(script);
    assert.equal(segments.length, 2);
    assert.equal(segments[0]!.speaker, "Chef");
  });

  it("matches character by speaker name", () => {
    assert.equal(matchCharacterBySpeakerName("Chef", [chef])?.id, chef.id);
  });

  it("attachVoiceToHandoffPayload includes v13 character voice fields", () => {
    const sb = minimalStoryboard();
    const payload = attachVoiceToHandoffPayload(
      {
        version: MOTION_HANDOFF_PAYLOAD_VERSION,
        storyboardId: sb.id,
        title: sb.title,
        description: "",
        promptStyleProfile: "cinematic",
        directorProfile: { id: "default", label: "Default" },
        shotDiversityScore: 80,
        characterMemory: [],
        locationMemory: null,
        propMemory: [],
        worldMemory: null,
        continuityStrength: "strong",
        consistencyReport: null,
        overallConsistencyScore: 80,
        driftWarnings: [],
        correctionRecommendations: [],
        consistencyHistory: [],
        latestImprovementScore: null,
        visionReport: null,
        overallVisionScore: 80,
        visionWarnings: [],
        characterConsistencyReport: null,
        overallCharacterConsistencyScore: 80,
        characterDriftWarnings: [],
        perSceneCharacterIdentityScores: [],
        scenes: sb.scenes.map((scene) => ({
          sceneId: scene.id,
          order: scene.order,
          title: scene.title,
          description: scene.description,
          action: scene.action,
          emotion: scene.emotion,
          camera: scene.camera,
          shotType: scene.shotType,
          cameraMovement: scene.cameraMovement,
          sceneEnergy: scene.sceneEnergy,
          durationSeconds: scene.durationSeconds,
          studioContext: { sceneId: scene.id, order: scene.order },
          generatedPrompt: "",
          stylePrompt: "",
          continuityPrompt: "",
          promptVersion: { version: 1 },
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
        })),
      },
      {
        storyboard: sb,
        voice: {
          language: "en",
          provider: "mock",
          voiceProfile: "warm_narrator",
          voiceStyle: "",
          audioUrl: "https://cdn.example/v.mp3",
          durationSeconds: 4,
          status: "completed",
        },
        subtitle: null,
      }
    );
    assert.ok(payload.characterVoiceAssignments?.length);
    assert.equal(payload.scenes[0]!.activeSpeaker, "Chef");
  });

  it("voice consistency warns when character has no voice", () => {
    const sb = minimalStoryboard();
    sb.scenes[0]!.characters = [{ ...chef, voiceEnabled: false, voiceProfile: "" }];
    const warnings = validateCharacterVoiceConsistency({ storyboard: sb, language: "en" });
    assert.ok(warnings.some((w) => w.code === "character_voice_missing"));
  });

  it("buildTimedSegmentsFromSpeakerLines accumulates timeline", () => {
    const rows = buildTimedSegmentsFromSpeakerLines(
      [
        {
          speaker: "Chef",
          characterId: "c1",
          text: "Hi",
          voiceProfile: "warm_narrator",
          voiceProvider: "mock",
          voiceLanguage: "en",
          order: 0,
        },
      ],
      [2]
    );
    assert.equal(rows[0]!.endSeconds, 2);
  });

  it("legacy single-narrator storyboard still builds assignment via chef only", () => {
    const assignment = buildCharacterVoiceAssignment(chef, "en");
    assert.equal(assignment.presetLabelKey, "studio.voice.preset.warmNarrator");
  });
});

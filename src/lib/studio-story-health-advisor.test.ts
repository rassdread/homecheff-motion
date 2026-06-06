import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStoryHealthAdvisorReport } from "@/lib/studio-story-health-advisor";
import type { StudioStoryboardDetail } from "@/types/studio-api";

function minimalStoryboard(scenes: StudioStoryboardDetail["scenes"]): StudioStoryboardDetail {
  return {
    id: "sb-1",
    ownerId: "u1",
    title: "Test",
    description: "",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: false,
    voiceLanguage: "nl",
    voiceStyle: "",
    voiceProfile: "",
    narrationMode: "",
    voiceNarrationScript: "",
    musicEnabled: false,
    musicStyle: "",
    musicIntensity: "",
    musicNarrativeRole: "",
    musicNotes: "",
    soundEnabled: false,
    soundStyle: "",
    soundIntensity: "",
    soundNotes: "",
    audioAssetsEnabled: true,
    audioAssetNotes: "",
    scenes,
    characters: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as StudioStoryboardDetail;
}

describe("buildStoryHealthAdvisorReport", () => {
  it("flags story too short", () => {
    const report = buildStoryHealthAdvisorReport(
      minimalStoryboard([
        {
          id: "s1",
          storyboardId: "sb-1",
          order: 0,
          title: "One",
          description: "",
          action: "",
          emotion: "happy",
          camera: "",
          shotType: "wide",
          cameraMovement: "static",
          sceneEnergy: "neutral",
          transitionToNext: "",
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
          selectedSceneImageId: null,
          sceneImages: [],
          createdAt: "",
          updatedAt: "",
        },
      ])
    );
    assert.ok(report.advisories.some((a) => a.code === "story_too_short"));
    assert.ok(report.score >= 0 && report.score <= 100);
  });
});

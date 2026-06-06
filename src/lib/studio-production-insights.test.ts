import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStudioProductionInsights } from "@/lib/studio-production-insights";
import type { StudioStoryboardDetail } from "@/types/studio-api";

function minimalStoryboard(): StudioStoryboardDetail {
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
    scenes: [
      {
        id: "sc-1",
        storyboardId: "sb-1",
        order: 0,
        title: "Opening",
        description: "A calm start",
        action: "",
        shotType: "wide",
        cameraMovement: "static",
        emotion: "hope",
        characters: [],
        locationId: null,
        sceneImages: [{ id: "img-1", status: "completed", previewUrl: "https://example.com/a.jpg" }],
      },
    ],
    characters: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as StudioStoryboardDetail;
}

describe("buildStudioProductionInsights", () => {
  it("returns unified insight sections in one pass", () => {
    const insights = buildStudioProductionInsights(minimalStoryboard(), []);
    assert.equal(typeof insights.storyHealth.score, "number");
    assert.ok(insights.readiness.checks.length > 0);
    assert.equal(typeof insights.quality.score, "number");
    assert.ok(Array.isArray(insights.consistency.characters));
  });
});

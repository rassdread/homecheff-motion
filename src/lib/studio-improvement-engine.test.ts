import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSceneConsistencyReport } from "@/lib/build-scene-consistency-report";
import { buildRegenerationRecommendation } from "@/lib/build-regeneration-recommendation";
import { buildStoryboardImprovementSummary } from "@/lib/build-storyboard-improvement-summary";
import {
  computeCombinedImageScore,
  isRecommendedSceneImage,
  pickRecommendedSceneImage,
} from "@/lib/studio-combined-image-score";
import { computeCombinedImprovementScore } from "@/lib/studio-improvement-score";
import {
  buildSceneImageHistoryEntries,
  rankSceneImagesByCombinedScore,
} from "@/lib/studio-scene-image-history";
import { validateSceneImageRegeneration } from "@/lib/studio-regeneration-guard";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { CorrectionRecommendation } from "@/types/studio-correction";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

function imageStub(
  overrides: Partial<StudioSceneImageListItem> = {}
): StudioSceneImageListItem {
  return {
    id: "img-1",
    sceneId: "scene-1",
    status: "completed",
    provider: "mock",
    imageUrl: "https://example.com/a.png",
    storageKey: "mock/key",
    thumbnailUrl: "",
    generatedPrompt: "Chef in kitchen with logo.",
    correctedPrompt: "",
    promptVersion: 3,
    generationVersion: 1,
    regeneratedFromImageId: null,
    promptPatches: [],
    seed: null,
    generationSettings: null,
    consistencyScore: 76,
    consistencyStatus: "good",
    consistencyReport: null,
    consistencyRecommendations: [],
    consistencyAnalyzedAt: null,
    correctionRecommendations: [],
    visionScore: 68,
    visionStatus: "needs_review",
    visionReport: null,
    visionAnalyzedAt: null,
    improvementScore: null,
    previousConsistencyScore: null,
    previousVisionScore: null,
    visionImprovementScore: null,
    overallImprovementScore: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const rec = (partial: Partial<CorrectionRecommendation>): CorrectionRecommendation => ({
  id: "r1",
  type: "MissingPropBranding",
  severity: "high",
  message: "Logo not visible",
  promptPatch: "Include HomeCheff logo clearly.",
  source: "test",
  ...partial,
});

describe("studio improvement engine V14", () => {
  it("buildRegenerationRecommendation flags poor vision for regeneration", () => {
    const result = buildRegenerationRecommendation({
      image: imageStub({ visionStatus: "poor" }),
      consistencyReport: null,
      visionReport: {
        analyzedAt: new Date().toISOString(),
        visionStatus: "poor",
        overallVisionScore: 42,
        characterVisionScore: 40,
        locationVisionScore: 40,
        propVisionScore: 40,
        brandingVisionScore: 40,
        worldVisionScore: 40,
        visionWarnings: ["Low quality"],
        visionRecommendations: ["Improve lighting"],
        detectedElements: [],
        characterResults: [],
        locationResult: null,
        propResults: [],
        brandingResult: {
          score: 40,
          warnings: ["logo missing"],
          recommendations: ["Show logo"],
          detectedElements: [],
        },
        worldResult: null,
        providerId: "mock",
        analysisMethod: "mock_vision_heuristic",
        referenceComparisonUsed: false,
      },
      recommendations: [rec({})],
    });
    assert.equal(result.shouldRegenerate, true);
    assert.equal(result.action, "regenerate");
    assert.ok(result.reason.toLowerCase().includes("vision"));
  });

  it("buildRegenerationRecommendation returns ok without recommendations", () => {
    const result = buildRegenerationRecommendation({
      image: imageStub(),
      consistencyReport: null,
      visionReport: null,
      recommendations: [],
    });
    assert.equal(result.action, "ok");
    assert.equal(result.shouldRegenerate, false);
  });

  it("computeCombinedImprovementScore averages vision and consistency deltas", () => {
    const score = computeCombinedImprovementScore({
      previousConsistencyScore: 76,
      newConsistencyScore: 88,
      previousVisionScore: 68,
      newVisionScore: 91,
    });
    assert.equal(score.consistency.delta, 12);
    assert.equal(score.vision.delta, 23);
    assert.equal(score.overallDelta, Math.round((12 + 23) / 2));
    assert.equal(score.improved, true);
  });

  it("computeCombinedImageScore uses 60/40 vision and consistency weights", () => {
    const combined = computeCombinedImageScore({ visionScore: 90, consistencyScore: 80 });
    assert.equal(combined, Math.round(90 * 0.6 + 80 * 0.4));
  });

  it("pickRecommendedSceneImage selects highest combined score", () => {
    const a = imageStub({ id: "a", visionScore: 60, consistencyScore: 90, generationVersion: 1 });
    const b = imageStub({ id: "b", visionScore: 95, consistencyScore: 70, generationVersion: 2 });
    const best = pickRecommendedSceneImage([a, b]);
    assert.equal(best?.id, "b");
    assert.equal(isRecommendedSceneImage(b, [a, b]), true);
  });

  it("buildSceneImageHistoryEntries ranks generations and marks recommended", () => {
    const gen1 = imageStub({
      id: "g1",
      generationVersion: 1,
      visionScore: 50,
      consistencyScore: 50,
    });
    const gen2 = imageStub({
      id: "g2",
      generationVersion: 2,
      visionScore: 95,
      consistencyScore: 90,
      overallImprovementScore: 17,
    });
    const history = buildSceneImageHistoryEntries({
      images: [gen2, gen1],
      selectedImageId: "g1",
    });
    assert.equal(history.length, 2);
    const recommended = history.find((h) => h.imageId === "g2");
    assert.equal(recommended?.isRecommended, true);
    assert.equal(recommended?.overallImprovementScore, 17);
    const ranked = rankSceneImagesByCombinedScore([gen1, gen2]);
    assert.equal(ranked[0]?.id, "g2");
  });

  it("buildStoryboardImprovementSummary counts weak scenes", () => {
    const consistencyReport = buildSceneConsistencyReport({
      sceneImage: {
        generatedPrompt: "A generic kitchen scene without mascot or branding.",
        sceneTitle: "Kitchen",
        sceneDescription: "",
        sceneAction: "cooking",
      },
      memory: {
        characters: [
          {
            id: "chef",
            name: "Chef",
            role: "mascot",
            appearanceMemory: "White chef hat. Green apron.",
            personalityMemory: "",
            continuityNotes: "",
            defaultClothing: "Green apron",
            defaultAccessories: "",
            visualKeywords: "clean",
            referenceImageUrl: "",
            primaryReferenceImageId: null,
            referenceNotes: "",
            identityStrength: "strong",
            continuityStrength: "strong",
            worldProfileId: null,
            worldProfileName: null,
          },
        ],
        location: null,
        props: [],
        world: null,
        continuityStrength: "strong",
      },
    });
    const summary = buildStoryboardImprovementSummary({
      storyboardId: "sb-1",
      scenes: [
        {
          sceneId: "s1",
          sceneTitle: "Kitchen",
          order: 0,
          selectedSceneImageId: "g1",
          image: imageStub({
            id: "g1",
            visionStatus: "poor",
            consistencyStatus: consistencyReport.consistencyStatus,
          }),
          consistencyReport,
          visionReport: null,
        },
      ],
    });
    assert.ok(summary.scenesNeedingImprovement >= 1);
    assert.notEqual(summary.scenes[0]?.regeneration.action, "ok");
  });

  it("validateSceneImageRegeneration blocks missing recommendations", () => {
    const guard = validateSceneImageRegeneration({
      source: imageStub(),
      recommendations: [],
    });
    assert.equal(guard.ok, false);
    if (!guard.ok) {
      assert.equal(guard.code, "NO_RECOMMENDATIONS");
    }
  });

  it("motion handoff payload version includes V16 sound director plan", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 25);
  });
});

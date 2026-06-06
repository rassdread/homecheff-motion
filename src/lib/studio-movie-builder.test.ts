import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMoviePrepareChecklist } from "@/lib/studio-movie-prepare-checklist";
import {
  computeMovieReadinessScore,
  isMotionHandoffReady,
} from "@/lib/studio-movie-readiness-score";
import {
  getMovieBuilderStepCompletion,
  isAnalyzeStepComplete,
  isGenerateStepComplete,
  isPrepareStepComplete,
  isSelectStepComplete,
  resolveCurrentMovieBuilderStep,
} from "@/lib/studio-movie-builder-steps";
import {
  sceneHasCompletedImage,
  scenesWithoutCompletedImages,
} from "@/lib/studio-movie-scene-image";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import { studioSceneDetail, studioStoryboardDetail } from "@/test/studio-api-fixtures";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

function completedImage(id: string): StudioSceneImageListItem {
  return {
    id,
    sceneId: "scene-1",
    status: "completed",
    promptVersion: 3,
    generationVersion: 1,
    generatedPrompt: "Chef cooks with logo.",
    imageUrl: "https://example.com/a.png",
    storageKey: "k",
    thumbnailUrl: "",
    provider: "mock",
    seed: null,
    generationSettings: null,
    consistencyScore: 82,
    consistencyStatus: "good",
    consistencyReport: null,
    consistencyRecommendations: [],
    consistencyAnalyzedAt: null,
    correctionRecommendations: [],
    promptPatches: [],
    correctedPrompt: "",
    regeneratedFromImageId: null,
    previousConsistencyScore: null,
    improvementScore: null,
    previousVisionScore: null,
    visionImprovementScore: null,
    overallImprovementScore: null,
    visionScore: 78,
    visionStatus: "good",
    visionReport: null,
    visionAnalyzedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function baseStoryboard(overrides?: Partial<StudioStoryboardDetail>): StudioStoryboardDetail {
  const img = completedImage("img-1");
  return studioStoryboardDetail({
    title: "Kitchen Story",
    sceneCount: 2,
    scenes: [
      studioSceneDetail({
        id: "scene-1",
        order: 0,
        title: "Opening",
        action: "Chef waves",
        emotion: "happy",
        camera: "wide",
        locationId: "loc-1",
        characters: [{ id: "c1", name: "Chef" } as unknown as StudioStoryboardDetail["scenes"][number]["characters"][number]],
        selectedSceneImageId: "img-1",
        sceneImages: [img],
      }),
      studioSceneDetail({
        id: "scene-2",
        order: 1,
        title: "Cooking",
        action: "Stir pot",
        emotion: "focused",
        camera: "close",
        locationId: "loc-1",
        characters: [{ id: "c1", name: "Chef" } as unknown as StudioStoryboardDetail["scenes"][number]["characters"][number]],
        selectedSceneImageId: "img-2",
        sceneImages: [completedImage("img-2")],
      }),
    ],
    ...overrides,
  });
}

describe("studio movie builder V16", () => {
  it("buildMoviePrepareChecklist fails without title or min scenes", () => {
    const checklist = buildMoviePrepareChecklist(
      baseStoryboard({ title: "", scenes: [] })
    );
    assert.equal(checklist.ready, false);
    assert.ok(checklist.items.some((i) => i.id === "min_scenes" && !i.passed));
  });

  it("isPrepareStepComplete when checklist ready", () => {
    assert.equal(isPrepareStepComplete(baseStoryboard()), true);
  });

  it("sceneHasCompletedImage and scenesWithoutCompletedImages", () => {
    const sb = baseStoryboard();
    assert.equal(sceneHasCompletedImage(sb.scenes[0]!), true);
    const missing = baseStoryboard({
      scenes: [
        {
          ...baseStoryboard().scenes[0]!,
          sceneImages: [],
        },
      ],
    });
    assert.equal(scenesWithoutCompletedImages(missing.scenes).length, 1);
  });

  it("isGenerateStepComplete requires all scenes have images", () => {
    assert.equal(isGenerateStepComplete(baseStoryboard()), true);
    const partial = baseStoryboard({
      scenes: [baseStoryboard().scenes[0]!, { ...baseStoryboard().scenes[1]!, sceneImages: [] }],
    });
    assert.equal(isGenerateStepComplete(partial), false);
  });

  it("isAnalyzeStepComplete requires vision and consistency scores", () => {
    assert.equal(isAnalyzeStepComplete(baseStoryboard()), true);
    const noVision = baseStoryboard({
      scenes: [
        {
          ...baseStoryboard().scenes[0]!,
          sceneImages: [{ ...completedImage("img-1"), visionScore: null }],
        },
      ],
    });
    assert.equal(isAnalyzeStepComplete(noVision), false);
  });

  it("isSelectStepComplete requires selected completed images", () => {
    assert.equal(isSelectStepComplete(baseStoryboard()), true);
    const noSelect = baseStoryboard({
      scenes: [{ ...baseStoryboard().scenes[0]!, selectedSceneImageId: null }],
    });
    assert.equal(isSelectStepComplete(noSelect), false);
  });

  it("computeMovieReadinessScore returns tier for healthy storyboard", () => {
    const score = computeMovieReadinessScore(baseStoryboard());
    assert.ok(["ready", "strong", "needs_review"].includes(score.tier));
    assert.equal(score.totalScenes, 2);
    assert.equal(score.averageVisionScore, 78);
    assert.equal(score.averageConsistencyScore, 82);
  });

  it("resolveCurrentMovieBuilderStep picks first incomplete step", () => {
    const sb = baseStoryboard({
      scenes: [{ ...baseStoryboard().scenes[0]!, sceneImages: [] }, baseStoryboard().scenes[1]!],
    });
    assert.equal(resolveCurrentMovieBuilderStep(sb), "generate");
  });

  it("isMotionHandoffReady when every scene has selected completed image", () => {
    assert.equal(isMotionHandoffReady(baseStoryboard()), true);
    const completion = getMovieBuilderStepCompletion(baseStoryboard());
    assert.equal(completion.prepare, true);
    assert.equal(completion.generate, true);
  });
});

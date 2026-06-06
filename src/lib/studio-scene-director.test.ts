import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STUDIO_DIRECTOR_PROFILES,
  normalizeStudioDirectorProfile,
} from "@/lib/studio-director-profiles";
import {
  buildDirectorCameraPrompt,
  legacyCameraFromShotType,
  normalizeSceneDirectorFields,
  resolveSceneShotType,
} from "@/lib/studio-scene-director";
import { buildDirectorScenePreviewText } from "@/lib/studio-scene-director-preview";
import {
  analyzeStoryFlow,
  buildCameraTimeline,
  computeShotDiversityScore,
} from "@/lib/studio-story-flow-analyzer";
import { buildDirectorQualityReport } from "@/lib/studio-movie-director-quality";
import type { StudioStoryboardDetail } from "@/types/studio-api";

describe("studio scene director V23", () => {
  it("normalizes director presets", () => {
    assert.equal(STUDIO_DIRECTOR_PROFILES.length, 6);
    assert.equal(normalizeStudioDirectorProfile("cinematic"), "cinematic");
    assert.equal(normalizeStudioDirectorProfile("invalid"), "commercial");
  });

  it("maps legacy camera to shot type", () => {
    assert.equal(resolveSceneShotType("", "close_up"), "close_up");
    assert.equal(legacyCameraFromShotType("wide"), "wide_shot");
  });

  it("builds director preview with shot and movement", () => {
    const text = buildDirectorScenePreviewText(
      {
        action: "Chef delivers food while smiling",
        shotType: "medium_close_up",
        cameraMovement: "push_in",
      },
      "commercial"
    );
    assert.match(text, /Medium Close/i);
    assert.match(text, /Push In/i);
    assert.match(text, /Chef delivers food/i);
  });

  it("computes shot diversity and warns on repeated shots", () => {
    const scenes = [
      { sceneId: "a", order: 0, title: "A", shotType: "wide" },
      { sceneId: "b", order: 1, title: "B", shotType: "wide" },
      { sceneId: "c", order: 2, title: "C", shotType: "wide" },
    ];
    const analysis = analyzeStoryFlow(scenes);
    assert.equal(analysis.warnings.some((w) => w.code === "repeated_shot_streak"), true);
    assert.ok(analysis.shotDiversityScore < 80);
    assert.equal(buildCameraTimeline(scenes).length, 3);
  });

  it("director prompt includes framing movement and energy", () => {
    const line = buildDirectorCameraPrompt({
      shotType: "close_up",
      cameraMovement: "push_in",
      sceneEnergy: "dynamic",
    });
    assert.match(line, /Close-up/i);
    assert.match(line, /push-in/i);
    assert.match(line, /Dynamic/i);
  });

  it("movie builder director quality reflects low variety", () => {
    const storyboard = {
      scenes: [
        {
          id: "1",
          order: 0,
          title: "S1",
          shotType: "wide",
          cameraMovement: "",
          sceneEnergy: "neutral",
          camera: "",
        },
        {
          id: "2",
          order: 1,
          title: "S2",
          shotType: "wide",
          cameraMovement: "",
          sceneEnergy: "neutral",
          camera: "",
        },
        {
          id: "3",
          order: 2,
          title: "S3",
          shotType: "wide",
          cameraMovement: "",
          sceneEnergy: "neutral",
          camera: "",
        },
      ],
    } as unknown as unknown as StudioStoryboardDetail;
    const report = buildDirectorQualityReport(storyboard);
    assert.ok(report.shotDiversityScore < 70);
    assert.ok(report.recommendationKeys.length > 0);
  });

  it("normalizeSceneDirectorFields syncs legacy camera", () => {
    const out = normalizeSceneDirectorFields({ shotType: "medium_close_up" });
    assert.equal(out.shotType, "medium_close_up");
    assert.equal(out.camera, "close_up");
  });

  it("higher diversity when shots vary", () => {
    const varied = computeShotDiversityScore([
      { sceneId: "a", order: 0, title: "A", shotType: "wide" },
      { sceneId: "b", order: 1, title: "B", shotType: "medium" },
      { sceneId: "c", order: 2, title: "C", shotType: "close_up" },
    ]);
    const flat = computeShotDiversityScore([
      { sceneId: "a", order: 0, title: "A", shotType: "wide" },
      { sceneId: "b", order: 1, title: "B", shotType: "wide" },
      { sceneId: "c", order: 2, title: "C", shotType: "wide" },
    ]);
    assert.ok(varied > flat);
  });

  it("movie quality includes V25 story health score", () => {
    const storyboard = {
      directorProfile: "commercial",
      scenes: [
        { id: "1", order: 0, title: "S1", shotType: "wide", cameraMovement: "push_in", sceneEnergy: "calm", camera: "" },
        { id: "2", order: 1, title: "S2", shotType: "medium", cameraMovement: "tracking", sceneEnergy: "neutral", camera: "" },
        { id: "3", order: 2, title: "S3", shotType: "close_up", cameraMovement: "crane", sceneEnergy: "intense", camera: "" },
      ],
    } as unknown as unknown as StudioStoryboardDetail;
    const report = buildDirectorQualityReport(storyboard);
    assert.ok(typeof report.storyHealthScore === "number");
    assert.ok(report.storyHealthScore >= 0);
    assert.ok(typeof report.directorQualityScore === "number");
    assert.ok(typeof report.styleConsistencyScore === "number");
  });
});

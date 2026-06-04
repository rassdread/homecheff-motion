import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  interpretAiDirectorPrompt,
  normalizeAiDirectorStyleStrength,
} from "@/lib/studio-ai-director-interpreter";
import {
  buildAiDirectorDirection,
  buildSceneReasoning,
  computeDirectorQualityScore,
  computeStyleConsistencyScore,
  planFromCurrentScenes,
} from "@/lib/studio-ai-director-direction";
import { buildAutoShotPlan } from "@/lib/studio-auto-shot-planner";
import { buildDirectorQualityReport } from "@/lib/studio-movie-director-quality";
import type { StudioStoryboardDetail } from "@/types/studio-api";

const sixScenes = () =>
  [0, 1, 2, 3, 4, 5].map((order) => ({
    sceneId: `s${order}`,
    order,
    title: `Scene ${order + 1}`,
    shotType: "",
    cameraMovement: "",
    sceneEnergy: "",
  }));

describe("studio AI director V26", () => {
  it("interprets Netflix documentary preset", () => {
    const style = interpretAiDirectorPrompt("Like a Netflix documentary");
    assert.equal(style.directorProfile, "documentary");
    assert.equal(style.matchedPresetKey, "studio.aiDirector.preset.netflix_documentary");
    assert.ok(style.moodKeywords.includes("cinematic"));
  });

  it("interprets Apple commercial with premium mood", () => {
    const style = interpretAiDirectorPrompt("Like an Apple commercial");
    assert.equal(style.directorProfile, "commercial");
    assert.ok(style.moodKeywords.includes("premium"));
  });

  it("interprets Nike as cinematic energetic", () => {
    const style = interpretAiDirectorPrompt("Like a Nike campaign");
    assert.equal(style.directorProfile, "cinematic");
    assert.ok(style.moodKeywords.includes("energetic"));
  });

  it("interprets TikTok as social_media", () => {
    const style = interpretAiDirectorPrompt("Viral TikTok ad");
    assert.equal(style.directorProfile, "social_media");
  });

  it("interprets founder story as storytelling", () => {
    const style = interpretAiDirectorPrompt("Emotional founder story");
    assert.equal(style.directorProfile, "storytelling");
    assert.ok(style.moodKeywords.includes("emotional"));
  });

  it("normalizes style strength", () => {
    assert.equal(normalizeAiDirectorStyleStrength("strong"), "strong");
    assert.equal(normalizeAiDirectorStyleStrength("invalid"), "balanced");
  });

  it("builds full direction with plan and reasoning", () => {
    const direction = buildAiDirectorDirection({
      scenes: sixScenes(),
      prompt: "Luxury brand launch",
      styleStrength: "balanced",
    });
    assert.equal(direction.plan.length, 6);
    assert.equal(direction.reasoning.length, 6);
    assert.ok(direction.directorQualityScore >= 0);
    assert.ok(direction.storyHealthScore >= 0);
    const reasoning = buildSceneReasoning(direction.plan, direction.interpretation);
    assert.equal(reasoning.length, 6);
  });

  it("strong strength increases energy vs subtle", () => {
    const scenes = sixScenes();
    const subtle = buildAiDirectorDirection({
      scenes,
      prompt: "Nike",
      styleStrength: "subtle",
    });
    const strong = buildAiDirectorDirection({
      scenes,
      prompt: "Nike",
      styleStrength: "strong",
    });
    const subtleIntense = subtle.plan.filter((r) => r.sceneEnergy === "intense").length;
    const strongIntense = strong.plan.filter((r) => r.sceneEnergy === "intense").length;
    assert.ok(strongIntense >= subtleIntense);
  });

  it("plan generation uses story intelligence arc", () => {
    const plan = buildAutoShotPlan(sixScenes(), "cinematic");
    const climax = plan.find((r) => r.arcPhase === "climax");
    assert.ok(climax);
    assert.equal(climax?.shotType, "close_up");
  });

  it("comparison mode current vs AI plans differ when scenes empty", () => {
    const current = planFromCurrentScenes(sixScenes());
    const ai = buildAiDirectorDirection({
      scenes: sixScenes(),
      prompt: "Apple commercial",
      styleStrength: "balanced",
    }).plan;
    assert.notDeepEqual(
      current.map((r) => r.shotType),
      ai.map((r) => r.shotType)
    );
  });

  it("style consistency and director quality scoring", () => {
    const direction = buildAiDirectorDirection({
      scenes: sixScenes(),
      prompt: "Apple commercial",
      styleStrength: "balanced",
    });
    const consistency = computeStyleConsistencyScore(direction.plan, direction.interpretation);
    assert.ok(consistency > 0);
    const quality = computeDirectorQualityScore({
      shotDiversityScore: direction.shotDiversityScore,
      storyHealthScore: direction.storyHealthScore,
      styleConsistencyScore: consistency,
      energyFlowScore: 80,
    });
    assert.ok(quality > 40);
  });

  it("director quality report includes V26 scores", () => {
    const storyboard = {
      directorProfile: "commercial",
      aiDirectorPrompt: "Like an Apple commercial",
      aiDirectorStyleStrength: "balanced",
      scenes: sixScenes().map((s, i) => ({
        id: s.sceneId,
        order: s.order,
        title: s.title,
        shotType: i === 0 ? "wide" : "",
        cameraMovement: "",
        sceneEnergy: "",
        camera: "",
      })),
    } as unknown as StudioStoryboardDetail;
    const report = buildDirectorQualityReport(storyboard);
    assert.ok(typeof report.directorQualityScore === "number");
    assert.ok(typeof report.styleConsistencyScore === "number");
  });
});

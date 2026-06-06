import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeShotPlanConsistency,
  buildCurrentStoryboardShotPlan,
  buildProposedStoryboardShotPlan,
  buildSceneShotBeats,
  buildStoryboardShotPlan,
  resolveStoryboardShotPlanReadiness,
} from "@/lib/studio-shot-planner";
import { studioSceneDetail, studioStoryboardDetail } from "@/test/studio-api-fixtures";
import { getTranslator } from "@/i18n";

const t = getTranslator("en");

describe("studio-shot-planner beats", () => {
  it("builds opening focus and closing beats per scene", () => {
    const beats = buildSceneShotBeats({
      scene: {
        sceneId: "s1",
        order: 0,
        title: "Kitchen intro",
        action: "Chef prepares the dish",
        description: "Warm kitchen atmosphere",
      },
      arcPhase: "opening",
      focusShot: "medium",
      focusMovement: "push_in",
    });
    assert.ok(beats.some((beat) => beat.role === "opening" && beat.present));
    assert.ok(beats.some((beat) => beat.role === "focus" && beat.label.includes("Chef")));
    assert.ok(beats.some((beat) => beat.role === "closing" && beat.present));
  });

  it("includes detail beat when action mentions texture", () => {
    const beats = buildSceneShotBeats({
      scene: {
        sceneId: "s2",
        order: 1,
        title: "Finish",
        action: "Close-up on plated result",
      },
      arcPhase: "climax",
      focusShot: "medium_close_up",
      focusMovement: "static",
    });
    assert.ok(beats.some((beat) => beat.role === "detail" && beat.present));
  });
});

describe("studio-shot-planner storyboard", () => {
  it("builds camera and motion flow from storyboard scenes", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          id: "s1",
          order: 0,
          shotType: "wide",
          cameraMovement: "push_in",
          sceneEnergy: "calm",
          durationSeconds: 5,
        }),
        studioSceneDetail({
          id: "s2",
          order: 1,
          shotType: "medium_close_up",
          cameraMovement: "tracking",
          sceneEnergy: "dynamic",
          durationSeconds: 4,
        }),
      ],
    });
    const plan = buildStoryboardShotPlan({ storyboard });
    assert.equal(plan.scenes.length, 2);
    assert.equal(plan.cameraFlow.length, 2);
    assert.equal(plan.motionProgression.length, 2);
    assert.equal(plan.pacingSeconds.reduce((a, b) => a + b, 0), 9);
  });

  it("proposed plan differs from current when shots unset", () => {
    const storyboard = studioStoryboardDetail({
      aiDirectorPrompt: "Like a Netflix documentary",
      scenes: [
        studioSceneDetail({ id: "s1", order: 0, title: "Open", shotType: "", cameraMovement: "" }),
        studioSceneDetail({ id: "s2", order: 1, title: "Peak", shotType: "", cameraMovement: "" }),
        studioSceneDetail({ id: "s3", order: 2, title: "End", shotType: "", cameraMovement: "" }),
      ],
    });
    const current = buildCurrentStoryboardShotPlan(storyboard);
    const { plan: proposed } = buildProposedStoryboardShotPlan({
      storyboard,
      prompt: storyboard.aiDirectorPrompt ?? "",
      styleStrength: "balanced",
    });
    assert.notDeepEqual(
      current.cameraFlow.map((row) => row.shotType),
      proposed.cameraFlow.map((row) => row.shotType)
    );
  });
});

describe("studio-shot-planner consistency and readiness", () => {
  it("flags too many close-ups as advice only", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [0, 1, 2, 3].map((order) =>
        studioSceneDetail({
          id: `s${order}`,
          order,
          shotType: "close_up",
          cameraMovement: "static",
        })
      ),
    });
    const advice = analyzeShotPlanConsistency(buildCurrentStoryboardShotPlan(storyboard));
    assert.ok(advice.some((item) => item.code === "too_many_close_ups"));
  });

  it("resolves readiness from existing scene fields", () => {
    const ready = resolveStoryboardShotPlanReadiness(
      studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            id: "s1",
            order: 0,
            shotType: "wide",
            cameraMovement: "push_in",
            sceneEnergy: "neutral",
            durationSeconds: 5,
          }),
        ],
      })
    );
    assert.equal(ready.hasShotFlow, true);
    assert.equal(ready.hasPacing, true);
  });
});

describe("studio-shot-planner i18n", () => {
  it("has NL/EN parity for shot planner keys", () => {
    assert.equal(t("studio.shotPlanner.title"), "Shot plan");
    assert.equal(t("studio.shotPlanner.openingShot"), "Opening shot");
    assert.equal(t("studio.shotPlanner.compare.apply"), "Use proposal");
  });
});

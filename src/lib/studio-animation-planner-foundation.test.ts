import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudioAnimationPlan,
  enrichIdeaWithAnimationPlan,
} from "@/lib/studio-animation-planner";
import { toMotionAnimationPlanHandoffPlan } from "@/lib/studio-animation-plan-handoff";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import {
  studioCharacterListItem,
  studioSceneDetail,
  studioSceneImageListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-animation-planner", () => {
  it("builds story video with scene-level timing", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          title: "Intro",
          action: "presenting",
          durationSeconds: 6,
          sceneImages: [studioSceneImageListItem({ status: "completed" })],
        }),
        studioSceneDetail({
          order: 1,
          title: "Garden",
          action: "showing",
          durationSeconds: 8,
          sceneImages: [studioSceneImageListItem({ status: "completed" })],
        }),
      ],
    });
    const renderPlan = buildStudioRenderStrategyPlan({ storyboard });
    const plan = buildStudioAnimationPlan({ storyboard, renderStrategyPlan: renderPlan });

    assert.equal(renderPlan.recommendedStrategy, "story");
    assert.equal(plan.scenes.length, 2);
    assert.equal(plan.scenes[0]!.shots.length, 1);
    assert.equal(plan.scenes[0]!.shots[0]!.shotRole, "scene");
    assert.equal(plan.scenes[0]!.targetDuration, 6);
    assert.equal(plan.totalTargetDuration, 14);
    assert.equal(plan.scenes[0]!.shots[0]!.requiredImageRole, "scene_still");
    assert.equal(plan.scenes[0]!.shots[0]!.missingImage, false);
  });

  it("builds action chain with start/end image requirements", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          title: "Mascot",
          action: "bal hooghouden, schieten, juichen en rennen",
          durationSeconds: 20,
        }),
      ],
    });
    const renderPlan = buildStudioRenderStrategyPlan({ storyboard });
    const plan = buildStudioAnimationPlan({ storyboard, renderStrategyPlan: renderPlan });

    assert.equal(renderPlan.recommendedStrategy, "action_chain");
    assert.ok(plan.totalShotCount >= 3);
    const roles = plan.scenes[0]!.shots.map((s) => s.requiredImageRole);
    assert.ok(roles.includes("start_pose") || roles.includes("action_pose"));
    assert.ok(plan.scenes[0]!.shots.some((s) => s.missingImage));
  });

  it("builds hybrid with mixed requirements", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          title: "Intro",
          action: "presenting the team",
          durationSeconds: 5,
          sceneImages: [studioSceneImageListItem({ status: "completed" })],
        }),
        studioSceneDetail({
          order: 1,
          title: "Action",
          action: "bal hooghouden, schieten en juichen",
          durationSeconds: 12,
        }),
        studioSceneDetail({
          order: 2,
          title: "Outro",
          action: "welcoming fans",
          durationSeconds: 5,
          sceneImages: [studioSceneImageListItem({ status: "completed" })],
        }),
      ],
    });
    const renderPlan = buildStudioRenderStrategyPlan({ storyboard });
    const plan = buildStudioAnimationPlan({ storyboard, renderStrategyPlan: renderPlan });

    assert.equal(renderPlan.recommendedStrategy, "hybrid");
    const storyScene = plan.scenes.find((s) => s.sceneOrder === 0)!;
    const actionScene = plan.scenes.find((s) => s.sceneOrder === 1)!;
    assert.equal(storyScene.shots[0]!.requiredImageRole, "scene_still");
    assert.ok(actionScene.shots.length >= 2);
    assert.ok(actionScene.shots.some((s) => s.renderModeHint === "hybrid_action"));
  });

  it("allocates football action across 4+ shots with timing", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          action: "bal hooghouden, schieten, juichen en rennen",
          durationSeconds: 20,
        }),
      ],
    });
    const plan = buildStudioAnimationPlan({ storyboard });

    assert.ok(plan.totalShotCount >= 4);
    const scene = plan.scenes[0]!;
    assert.equal(scene.endTime - scene.startTime, 20);
    assert.ok(scene.shots.some((s) => s.shotRole === "action" || s.shotRole === "payoff"));
    const actionShots = scene.shots.filter((s) => s.shotRole === "action");
    if (actionShots.length > 0) {
      assert.ok(actionShots.every((s) => s.durationSeconds >= 1));
    }
  });

  it("allocates cooking setup/action/payoff timing", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          action: "koken, roeren, proeven en serveren",
          durationSeconds: 16,
        }),
      ],
    });
    const plan = buildStudioAnimationPlan({ storyboard });

    assert.ok(plan.totalShotCount >= 3);
    const scene = plan.scenes[0]!;
    assert.equal(scene.targetDuration, 16);
    const roles = scene.shots.map((s) => s.shotRole);
    assert.ok(roles.includes("action") || roles.includes("setup"));
  });

  it("includes speed advice from render strategy", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({ order: 0, durationSeconds: 10 }),
        studioSceneDetail({ order: 1, durationSeconds: 10 }),
        studioSceneDetail({ order: 2, durationSeconds: 10 }),
      ],
    });
    const renderPlan = buildStudioRenderStrategyPlan({ storyboard });
    const plan = buildStudioAnimationPlan({ storyboard, renderStrategyPlan: renderPlan });

    assert.equal(plan.speedAdvice.speedAdviceOnly, true);
    assert.ok(plan.providerDurationEstimate > 0);
    assert.equal(plan.finalDurationEstimate, renderPlan.estimatedFinalDurationSeconds);
    if (renderPlan.suggestedSpeedAdjustment) {
      assert.equal(plan.speedAdvice.suggestedSpeedAdjustment, renderPlan.suggestedSpeedAdjustment);
    }
  });

  it("maps handoff metadata without execution fields", () => {
    const plan = buildStudioAnimationPlan({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0, action: "koken en serveren", durationSeconds: 8 })],
      }),
    });
    const handoff = toMotionAnimationPlanHandoffPlan(plan);

    assert.equal(handoff.speedAdviceOnly, true);
    assert.ok(handoff.scenes.length >= 1);
    assert.ok(handoff.scenes[0]!.shots.length >= 1);
    assert.equal(typeof handoff.readiness.planPresent, "boolean");
  });

  it("enriches AI director idea with animation context", () => {
    const plan = buildStudioAnimationPlan({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0, durationSeconds: 12 })],
      }),
    });
    const enriched = enrichIdeaWithAnimationPlan("Sports promo", plan);
    assert.ok(enriched.includes("[animation:"));
    assert.ok(enriched.includes("Sports promo"));
  });

  it("director proposal receives animation plan preview", () => {
    const proposal = buildDirectorProposal({
      idea: "Football mascot promo with action",
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "bal hooghouden, schieten, juichen",
          }),
        ],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Mascot" })],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    assert.ok(proposal!.animationPlan);
    assert.ok(proposal!.animationPlanPreview && proposal!.animationPlanPreview.length >= 1);
    assert.ok(proposal!.animationPlanPreview![0]!.shots.length >= 1);
  });

  it("readiness tracks timing and images", () => {
    const withImages = buildStudioAnimationPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            sceneImages: [studioSceneImageListItem({ status: "completed" })],
            durationSeconds: 8,
          }),
        ],
      }),
    });
    assert.equal(withImages.readiness.planPresent, true);

    const missingImages = buildStudioAnimationPlan({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0, action: "koken, roeren, serveren", durationSeconds: 4 })],
      }),
    });
    assert.equal(missingImages.readiness.imagesComplete, false);
  });
});

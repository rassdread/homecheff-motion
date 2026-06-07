import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { toMotionRenderStrategyHandoffPlan } from "@/lib/studio-render-strategy-handoff";
import { buildWorldVisualField } from "@/lib/studio-world-identity-structured";
import {
  studioSceneDetail,
  studioSceneImageListItem,
  studioStoryboardDetail,
  studioWorldProfileListItem,
} from "@/test/studio-api-fixtures";

describe("studio-render-strategy-planner", () => {
  it("recommends story for calm multi-scene campaign", () => {
    const plan = buildStudioRenderStrategyPlan({
      storyboard: studioStoryboardDetail({
        title: "Community campaign promo",
        description: "Brand story montage for the community",
        scenes: [
          studioSceneDetail({
            order: 0,
            title: "Intro",
            action: "presenting",
            emotion: "warm",
            sceneImages: [
              studioSceneImageListItem({ status: "completed" }),
            ],
          }),
          studioSceneDetail({
            order: 1,
            title: "Garden",
            action: "showing",
            emotion: "calm",
            sceneImages: [
              studioSceneImageListItem({ status: "completed" }),
            ],
          }),
          studioSceneDetail({
            order: 2,
            title: "Outro",
            action: "welcoming",
            emotion: "happy",
            sceneImages: [
              studioSceneImageListItem({ status: "completed" }),
            ],
          }),
        ],
      }),
    });
    assert.equal(plan.recommendedStrategy, "story");
    assert.equal(plan.actionComplexity, "low");
  });

  it("recommends action_chain for football mascot sequence", () => {
    const plan = buildStudioRenderStrategyPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            title: "Mascot moment",
            action: "bal hooghouden, schieten, juichen en rennen",
            description: "Voetbalmascotte houdt bal hoog, schiet, juicht en rent weg",
          }),
        ],
      }),
    });
    assert.equal(plan.recommendedStrategy, "action_chain");
    assert.equal(plan.actionComplexity, "high");
    assert.ok(plan.suggestedShotSplitting.length >= 1);
    assert.ok(plan.suggestedShotSplitting[0]!.suggestedShotCount >= 3);
  });

  it("recommends hybrid for intro + action + finale", () => {
    const plan = buildStudioRenderStrategyPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            title: "Intro",
            action: "presenting the team",
            description: "Calm welcome",
          }),
          studioSceneDetail({
            order: 1,
            title: "Match action",
            action: "schieten, juichen, rennen",
            description: "High energy play",
          }),
          studioSceneDetail({
            order: 2,
            title: "Finale",
            action: "celebrating with crowd",
            description: "Hold on celebration",
          }),
        ],
      }),
    });
    assert.equal(plan.recommendedStrategy, "hybrid");
  });

  it("flags missing images for action chain", () => {
    const plan = buildStudioRenderStrategyPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "schieten en juichen",
          }),
        ],
      }),
    });
    assert.ok(plan.missingImageCount > 0);
    assert.ok(plan.warnings.some((w) => w.id === "missing-images"));
  });

  it("suggests speed adjustment advice when provider duration exceeds final target", () => {
    const plan = buildStudioRenderStrategyPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({ order: 0, durationSeconds: 3, action: "presenting" }),
          studioSceneDetail({ order: 1, durationSeconds: 3, action: "showing" }),
          studioSceneDetail({ order: 2, durationSeconds: 3, action: "closing" }),
          studioSceneDetail({ order: 3, durationSeconds: 3, action: "outro" }),
          studioSceneDetail({
            order: 4,
            durationSeconds: 3,
            action: "welcoming",
            sceneImages: [studioSceneImageListItem({ status: "completed" })],
          }),
        ],
      }),
      desiredFinalDurationSeconds: 12,
    });
    assert.equal(plan.speedAdviceOnly, true);
    if (plan.estimatedProviderDurationSeconds > 12) {
      assert.ok(plan.suggestedSpeedAdjustment && plan.suggestedSpeedAdjustment > 1);
    }
  });

  it("maps handoff metadata without provider jargon", () => {
    const plan = buildStudioRenderStrategyPlan({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0, action: "schieten" })],
      }),
      worlds: [
        studioWorldProfileListItem({
          id: "w-sports",
          name: "Sports World",
          continuityRules: "[identity:render]\nhc:render=start_end",
          visualStyle: buildWorldVisualField(
            {
              worldType: "sports_universe",
              visualStyle: "community",
              shapeLanguage: "rounded",
              colorTheme: "warm",
              lighting: "soft",
              mood: "warm",
              environmentFeel: "community",
              freeTags: [],
            },
            ""
          ),
        }),
      ],
    });
    const handoff = toMotionRenderStrategyHandoffPlan(plan);
    assert.equal(handoff.recommendedStrategy, "action_chain");
    assert.ok(handoff.strategyLabelKey.startsWith("studio.renderStrategy."));
    assert.ok(["story", "transition"].includes(handoff.internalInstantMode));
    assert.ok(handoff.reasons.length > 0);
  });
});

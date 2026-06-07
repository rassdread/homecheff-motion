import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildViduExecutionPlan } from "@/lib/studio-vidu-execution-planner";
import { toMotionViduExecutionPlanHandoffPlan } from "@/lib/studio-vidu-execution-plan-handoff";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { buildStoryboardAudioMixPlan } from "@/lib/studio-audio-mix-resolve";
import {
  studioSceneDetail,
  studioSceneImageListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-vidu-execution-planner", () => {
  it("maps story strategy to story_video execution plan", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          title: "Intro",
          action: "presenting",
          durationSeconds: 6,
          sceneImages: [studioSceneImageListItem({ status: "completed", id: "img1", sceneId: "s1", imageUrl: "https://example.com/1.jpg" })],
        }),
        studioSceneDetail({
          order: 1,
          title: "Outro",
          action: "welcoming",
          durationSeconds: 5,
          sceneImages: [studioSceneImageListItem({ status: "completed", id: "img2", sceneId: "s2", imageUrl: "https://example.com/2.jpg" })],
        }),
      ],
    });
    const renderPlan = buildStudioRenderStrategyPlan({ storyboard });
    const plan = buildViduExecutionPlan({ storyboard, renderStrategyPlan: renderPlan });

    assert.equal(renderPlan.recommendedStrategy, "story");
    assert.equal(plan.executionMode, "story_video");
    assert.equal(plan.jobs.length, 1);
    assert.equal(plan.jobs[0]!.jobKind, "story_multiframe");
    assert.equal(plan.jobs[0]!.inputImages.length, 2);
    assert.equal(plan.readiness.readyToRender, true);
  });

  it("maps action_chain to start/end jobs", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          id: "s1",
          order: 0,
          action: "bal hooghouden, schieten, juichen en rennen",
          durationSeconds: 20,
          sceneImages: [studioSceneImageListItem({ status: "completed", id: "img1", sceneId: "s1", imageUrl: "https://example.com/1.jpg" })],
        }),
      ],
    });
    const renderPlan = buildStudioRenderStrategyPlan({ storyboard });
    const plan = buildViduExecutionPlan({ storyboard, renderStrategyPlan: renderPlan });

    assert.equal(plan.executionMode, "action_chain");
    assert.ok(plan.jobs.length >= 1);
    assert.ok(plan.jobs.every((j) => j.jobKind === "action_start_end"));
    assert.ok(plan.jobs[0]!.inputImages.length === 2);
    assert.equal(plan.readiness.missingStartEndImages, true);
  });

  it("maps hybrid to mixed job kinds", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          id: "s1",
          order: 0,
          title: "Intro",
          action: "presenting the team",
          durationSeconds: 5,
          sceneImages: [studioSceneImageListItem({ status: "completed", id: "img1", sceneId: "s1", imageUrl: "https://example.com/1.jpg" })],
        }),
        studioSceneDetail({
          id: "s2",
          order: 1,
          title: "Action",
          action: "bal hooghouden, schieten en juichen",
          durationSeconds: 12,
          sceneImages: [studioSceneImageListItem({ status: "completed", id: "img2", sceneId: "s2", imageUrl: "https://example.com/2.jpg" })],
        }),
        studioSceneDetail({
          id: "s3",
          order: 2,
          title: "Outro",
          action: "welcoming fans",
          durationSeconds: 5,
          sceneImages: [studioSceneImageListItem({ status: "completed", id: "img3", sceneId: "s3", imageUrl: "https://example.com/3.jpg" })],
        }),
      ],
    });
    const renderPlan = buildStudioRenderStrategyPlan({ storyboard });
    const plan = buildViduExecutionPlan({ storyboard, renderStrategyPlan: renderPlan });

    assert.equal(plan.executionMode, "hybrid");
    assert.ok(plan.jobs.some((j) => j.jobKind === "hybrid_story_segment"));
    assert.ok(plan.jobs.some((j) => j.jobKind === "hybrid_action_segment"));
  });

  it("warns and activates fallback when end images missing", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          id: "s1",
          order: 0,
          action: "bal hooghouden, schieten, juichen",
          durationSeconds: 15,
        }),
      ],
    });
    const renderPlan = buildStudioRenderStrategyPlan({ storyboard });
    const plan = buildViduExecutionPlan({ storyboard, renderStrategyPlan: renderPlan });

    assert.equal(plan.executionMode, "action_chain");
    assert.ok(plan.missingRequirements.length > 0);
    assert.ok(plan.warnings.length > 0);
    assert.equal(plan.fallbackPlan.active, true);
    assert.equal(plan.readiness.readyToRender, false);
  });

  it("preserves audio mix metadata when provided", () => {
    const storyboard = studioStoryboardDetail({
      voiceEnabled: true,
      musicEnabled: true,
      scenes: [
        studioSceneDetail({
          order: 0,
          durationSeconds: 8,
          sceneImages: [studioSceneImageListItem({ status: "completed", id: "img1", sceneId: "s1", imageUrl: "https://example.com/1.jpg" })],
        }),
      ],
    });
    const audioMixPlan = buildStoryboardAudioMixPlan({
      storyboard,
      userLibrary: [],
      voiceAudioUrl: null,
    });
    const plan = buildViduExecutionPlan({ storyboard, audioMixPlan });

    assert.equal(plan.audioMixIncluded, true);
    assert.equal(typeof plan.audioMixReady, "boolean");
  });

  it("maps handoff metadata without provider jargon fields", () => {
    const plan = buildViduExecutionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            durationSeconds: 6,
            sceneImages: [studioSceneImageListItem({ status: "completed", id: "img1", sceneId: "s1", imageUrl: "https://example.com/1.jpg" })],
          }),
        ],
      }),
    });
    const handoff = toMotionViduExecutionPlanHandoffPlan(plan);

    assert.equal(typeof handoff.executionMode, "string");
    assert.equal(typeof handoff.readyToRender, "boolean");
    assert.ok(handoff.jobs.length >= 1);
    assert.equal(typeof handoff.missingRequirementCount, "number");
  });

  it("uses multiple steps flag for action and hybrid modes", () => {
    const actionPlan = buildViduExecutionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "koken, roeren, proeven en serveren",
            durationSeconds: 16,
            sceneImages: [studioSceneImageListItem({ status: "completed", id: "img1", sceneId: "s1", imageUrl: "https://example.com/1.jpg" })],
          }),
        ],
      }),
    });
    assert.equal(actionPlan.usesMultipleSteps, true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudioProductionPlan,
  enrichIdeaWithProductionPlan,
} from "@/lib/studio-production-planner";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  studioCharacterListItem,
  studioPropListItem,
  studioSceneDetail,
  studioSceneImageListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-production-planner", () => {
  it("builds production overview with duration and shot estimates", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            title: "Intro",
            action: "presenting",
            durationSeconds: 6,
            characters: [studioCharacterListItem({ id: "c1", name: "Chef" })],
          }),
          studioSceneDetail({
            order: 1,
            title: "Action",
            action: "bal hooghouden, schieten, juichen en rennen",
            durationSeconds: 8,
          }),
        ],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Chef" })],
    });
    assert.ok(plan.estimatedDurationSeconds >= 14);
    assert.ok(plan.estimatedShotCount >= 2);
    assert.ok(plan.storyStructure.length === 5);
  });

  it("detects story structure phases", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({ order: 0, title: "Open", action: "welkom" }),
          studioSceneDetail({ order: 1, title: "Mid", action: "koken en serveren" }),
          studioSceneDetail({ order: 2, title: "End", action: "afsluiting" }),
          studioSceneDetail({ order: 3, title: "Outro", action: "bedankt" }),
          studioSceneDetail({ order: 4, title: "Final", action: "wave" }),
        ],
      }),
    });
    assert.ok(plan.storyStructure.some((p) => p.status !== "missing"));
  });

  it("plans assets with present and missing counts", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            characters: [studioCharacterListItem({ id: "c1", name: "Marco" })],
          }),
        ],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Marco" })],
    });
    assert.ok(plan.assetPlanning.presentCount >= 1);
    assert.equal(plan.assetPlanning.characters.some((c) => c.status === "present"), true);
  });

  it("includes action planning from distribution", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "koken, roeren, proeven en serveren",
          }),
        ],
      }),
    });
    assert.ok(plan.actionPlanning.totalActionSteps >= 2);
    assert.ok(plan.actionPlanning.recommendedShotCount >= 2);
  });

  it("tracks image planning from render strategy", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            sceneImages: [studioSceneImageListItem({ status: "completed" })],
          }),
          studioSceneDetail({ order: 1 }),
        ],
      }),
    });
    assert.ok(plan.imagePlanning.requiredCount >= 1);
  });

  it("reports audio planning status", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        voiceEnabled: true,
        voiceNarrationScript: "Hello world",
        musicEnabled: true,
        musicStyle: "upbeat",
        scenes: [studioSceneDetail({ order: 0, description: "Scene text" })],
      }),
    });
    assert.equal(plan.audioPlanning.narration, "ready");
    assert.equal(plan.audioPlanning.transcript, "ready");
  });

  it("includes render planning strategy", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({ order: 0, action: "calm intro presenting" }),
        ],
      }),
    });
    assert.ok(plan.renderPlanning.strategyLabelKey.startsWith("studio.renderStrategy."));
    assert.ok(plan.renderPlanning.reasonKeys.length >= 0);
  });

  it("enriches AI director idea with production context", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0, durationSeconds: 10 })],
      }),
    });
    const enriched = enrichIdeaWithProductionPlan("Sports promo", plan);
    assert.ok(enriched.includes("[production:"));
    assert.ok(enriched.includes("Sports promo"));
  });

  it("director proposal receives production plan", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0, action: "koken" })],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Chef", defaultClothing: "chef" })],
    });
    const proposal = buildDirectorProposal({
      idea: "Chef cooking show",
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0, action: "koken" })],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Chef", defaultClothing: "chef" })],
      locations: [],
      props: [],
      worlds: [],
      productionPlan: plan,
    });
    assert.ok(proposal?.productionPlan);
    assert.ok(proposal.productionPlan.estimatedDurationSeconds >= 0);
  });

  it("recommends missing shots when action plan exceeds scenes", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "bal hooghouden, schieten, juichen en rennen",
            durationSeconds: 6,
          }),
        ],
      }),
      props: [
        studioPropListItem({
          id: "ball",
          name: "Football",
          appearanceMemory: "hc:type=sport,hc:func=sports",
        }),
      ],
    });
    assert.ok(
      plan.missingItems.some((m) => m.reasonKey.includes("shots") || m.reasonKey.includes("duration")) ||
        plan.actionPlanning.recommendedShotCount > plan.estimatedSceneCount
    );
  });

  it("domain readiness covers story assets images audio render", () => {
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0 })],
      }),
    });
    assert.equal(plan.domainReadiness.length, 5);
    assert.ok(plan.domainReadiness.every((d) => d.messageKey.startsWith("studio.productionPlan.domain.")));
  });
});

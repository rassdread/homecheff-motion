import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSceneGenerationPlan } from "@/lib/studio-scene-generation-orchestrator";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  studioCharacterListItem,
  studioSceneDetail,
  studioSceneImageListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-scene-generation-orchestrator", () => {
  it("plans required scene stills for story mode", () => {
    const plan = buildSceneGenerationPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            title: "Intro",
            action: "welkom",
            sceneImages: [
              studioSceneImageListItem({
                id: "img-1",
                sceneId: "scene-0",
                status: "completed",
                imageUrl: "https://x/a.jpg",
              }),
            ],
          }),
          studioSceneDetail({
            order: 1,
            title: "Outro",
            action: "afsluiting",
          }),
        ],
      }),
    });

    assert.ok(plan.requiredImages.length >= 2);
    assert.ok(plan.totalMissing >= 1);
    assert.ok(plan.generationSteps.length >= 1);
  });

  it("plans action poses for action chain scenes", () => {
    const plan = buildSceneGenerationPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            title: "Skills",
            action: "bal hooghouden, schieten, juichen en rennen",
            durationSeconds: 10,
            characters: [studioCharacterListItem({ id: "c1", name: "Speler" })],
          }),
        ],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Speler" })],
    });

    assert.ok(plan.requiredImages.length + plan.recommendedImages.length >= 2);
    assert.ok(
      plan.requiredImages.some((i) => i.imageRole.includes("pose")) ||
        plan.recommendedImages.some((i) => i.imageRole.includes("pose"))
    );
  });

  it("orders missing required images before recommended", () => {
    const plan = buildSceneGenerationPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "koken, roeren, proeven en serveren",
            durationSeconds: 12,
          }),
        ],
      }),
    });

    const ordered = [...plan.requiredImages, ...plan.recommendedImages].filter(
      (i) => i.status !== "present"
    );
    if (ordered.length >= 2) {
      assert.ok(ordered[0]!.orderIndex <= ordered[1]!.orderIndex);
    }
  });

  it("detects asset dependencies blocking image creation", () => {
    const plan = buildSceneGenerationPlan({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            title: "Empty scene",
            action: "actie",
            characters: [],
          }),
        ],
      }),
    });

    const item = plan.requiredImages.find((i) => i.sceneOrder === 0);
    assert.ok(item);
    assert.ok(item!.assetDependencies.some((d) => d.kind === "location" && d.status === "missing"));
  });

  it("production planner consumes generation planning summary", () => {
    const productionPlan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0, action: "actie" })],
      }),
    });

    assert.ok(productionPlan.generationPlanning);
    assert.equal(typeof productionPlan.generationPlanning.requiredCount, "number");
    assert.equal(typeof productionPlan.generationPlanning.readyToRender, "boolean");
  });

  it("director proposal can include generation plan context", () => {
    const proposal = buildDirectorProposal({
      idea: "Voetbal promo",
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            action: "bal hooghouden, schieten, juichen",
            characters: [studioCharacterListItem({ id: "c1", name: "Speler" })],
          }),
        ],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Speler" })],
      locations: [],
      props: [],
    });

    assert.ok(proposal?.generationPlan);
    assert.ok(proposal!.generationPlan!.requiredImages.length >= 1);
  });

  it("legacy storyboard without action still returns safe plan", () => {
    const plan = buildSceneGenerationPlan({
      storyboard: studioStoryboardDetail({ scenes: [] }),
    });
    assert.equal(plan.totalRequired, 0);
    assert.equal(plan.readiness.readyToRender, true);
  });
});

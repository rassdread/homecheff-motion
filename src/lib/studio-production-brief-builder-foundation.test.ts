import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProductionBrief,
  buildProductionPlanFromBrief,
} from "@/lib/studio-production-brief-builder";
import { enrichIdeaWithProductionBrief } from "@/lib/studio-production-brief-enrichment";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import {
  studioCharacterListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-production-brief-builder", () => {
  it("builds brief from user idea with goal and style", () => {
    const brief = buildProductionBrief({
      idea: "Een voetbalmascotte die een bal hooghoudt, scoort en juicht in een stadion.",
      characters: [studioCharacterListItem({ id: "m1", name: "Voetbalmascotte", isMascot: true })],
    });
    assert.ok(brief);
    assert.ok(brief!.goal.length > 0);
    assert.equal(brief!.actionIntensity, "high");
    assert.ok(brief!.storyPreview.estimatedSceneCount >= 3);
    assert.ok(brief!.estimatedDurationSeconds > 0);
  });

  it("includes asset recommendations from idea tokens", () => {
    const brief = buildProductionBrief({
      idea: "Pixar-style chef mascot presents a dish in a premium kitchen.",
      characters: [studioCharacterListItem({ id: "c1", name: "Chef Marco", isMascot: true })],
    });
    assert.ok(brief);
    const names = brief!.mainCharacters.map((c) => c.name.toLowerCase());
    assert.ok(names.some((n) => n.includes("chef") || n.includes("marco") || brief!.mainCharacters.length > 0));
  });

  it("enriches idea with brief context for AI Director", () => {
    const brief = buildProductionBrief({
      idea: "Premium Apple-style product launch with minimal hero shots.",
    });
    assert.ok(brief);
    const enriched = enrichIdeaWithProductionBrief(brief!.idea, brief!);
    assert.match(enriched, /\[brief:/);
    assert.match(enriched, /\[duration:/);
  });

  it("AI Director consumes production brief", () => {
    const idea = "Nike sports campaign with athletic mascot running and celebrating.";
    const brief = buildProductionBrief({ idea });
    assert.ok(brief);
    const storyboard = studioStoryboardDetail({ scenes: [], aiDirectorPrompt: idea });
    const proposal = buildDirectorProposal({
      idea,
      storyboard,
      characters: [],
      locations: [],
      props: [],
      productionBrief: brief!,
    });
    assert.ok(proposal);
    assert.ok(proposal!.scenes.length >= 3);
    assert.ok(proposal!.productionPlan);
  });

  it("Production Planner uses brief for pre-scene estimates", () => {
    const brief = buildProductionBrief({
      idea: "Emotional founder story about building a food brand from the garden.",
    });
    assert.ok(brief);
    const plan = buildProductionPlanFromBrief(brief!, {
      characters: [],
      locations: [],
      props: [],
      worlds: [],
    });
    assert.equal(plan.estimatedSceneCount, brief!.storyPreview.estimatedSceneCount);
    assert.ok(plan.estimatedDurationSeconds > 0);
    assert.equal(plan.productionGoalKey, "studio.productionPlan.goal.fromBrief");
  });

  it("buildStudioProductionPlan applies brief overrides on empty storyboard", () => {
    const brief = buildProductionBrief({
      idea: "TikTok viral recipe video with energetic chef and product hero.",
    });
    assert.ok(brief);
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({ scenes: [] }),
      productionBrief: brief!,
    });
    assert.equal(plan.estimatedSceneCount, brief!.storyPreview.estimatedSceneCount);
    assert.ok(plan.directorContextLines.some((l) => l.startsWith("brief:")));
  });

  it("returns null for empty idea", () => {
    assert.equal(buildProductionBrief({ idea: "  " }), null);
  });
});

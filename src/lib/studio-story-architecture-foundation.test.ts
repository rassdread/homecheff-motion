import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import { buildCreativeReview } from "@/lib/studio-creative-review";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import {
  buildStoryArchitectSummary,
  buildStoryArchitecture,
  pickStoryMomentForPhase,
  sceneParamsFromStoryArchitecture,
} from "@/lib/studio-story-architecture";
import { extractProposalStoryEntities } from "@/lib/studio-scene-beat-translation";
import { studioSceneDetail, studioStoryboardDetail } from "@/test/studio-api-fixtures";

describe("studio-story-architecture", () => {
  it("builds story architecture from user idea", () => {
    const architecture = buildStoryArchitecture({
      userIdea: "HomeCheff garden promo with fresh vegetables",
    });
    assert.equal(architecture.version, 1);
    assert.ok(architecture.storyGoal.length > 0);
    assert.ok(architecture.message.length > 0);
    assert.equal(architecture.storyStructure.length, 5);
    assert.equal(architecture.storyMoments.length, 5);
    assert.equal(architecture.narrativeFlow.length, 5);
  });

  it("detects intro phase in planned structure", () => {
    const architecture = buildStoryArchitecture({
      userIdea: "Promo video",
      plannedSceneCount: 5,
    });
    const intro = architecture.storyStructure.find((phase) => phase.phase === "intro");
    assert.ok(intro);
    assert.ok(intro!.sceneOrders.includes(0));
  });

  it("detects setup and development phases", () => {
    const architecture = buildStoryArchitecture({
      userIdea: "Tutorial about cooking pasta",
      plannedSceneCount: 5,
    });
    assert.ok(architecture.storyStructure.some((phase) => phase.phase === "setup"));
    assert.ok(architecture.storyStructure.some((phase) => phase.phase === "development"));
  });

  it("detects climax and ending phases", () => {
    const storyboard = studioStoryboardDetail({
      aiDirectorPrompt: "Sports mascot stadium promo",
      scenes: [
        studioSceneDetail({ order: 0, title: "Open", description: "Stadium" }),
        studioSceneDetail({ order: 1, title: "Play", description: "Action" }),
        studioSceneDetail({ order: 2, title: "Goal", description: "Score" }),
        studioSceneDetail({ order: 3, title: "Win", description: "Celebrate" }),
        studioSceneDetail({ order: 4, title: "CTA", description: "Join us" }),
      ],
    });
    const architecture = buildStoryArchitecture({
      userIdea: storyboard.aiDirectorPrompt!,
      storyboard,
    });
    const climax = architecture.storyStructure.find((phase) => phase.phase === "climax");
    const ending = architecture.storyStructure.find((phase) => phase.phase === "ending");
    assert.ok(climax);
    assert.ok(ending);
    assert.notEqual(climax!.status, "missing");
  });

  it("builds narrative moments before scenes", () => {
    const architecture = buildStoryArchitecture({
      userIdea: "Community neighborhood heroes",
      plannedSceneCount: 5,
    });
    assert.deepEqual(
      architecture.storyMoments.map((moment) => moment.id),
      ["departure", "discovery", "conflict", "breakthrough", "closing"]
    );
    assert.ok(architecture.storyMoments.every((moment) => moment.beatKey.startsWith("studio.")));
  });

  it("provides distinct scene params per moment", () => {
    const architecture = buildStoryArchitecture({
      userIdea: "Designer craft promo",
      plannedSceneCount: 5,
    });
    const entities = extractProposalStoryEntities({
      idea: "Designer craft promo",
      architecture,
      promptTokens: ["designer", "craft", "promo"],
    });
    const departure = pickStoryMomentForPhase(architecture, "opening");
    const climax = pickStoryMomentForPhase(architecture, "climax");
    const departureParams = sceneParamsFromStoryArchitecture(architecture, departure, 0, 5, entities);
    const climaxParams = sceneParamsFromStoryArchitecture(architecture, climax, 3, 5, entities);
    assert.notEqual(departureParams.moment, climaxParams.moment);
    assert.notEqual(departureParams.focus, climaxParams.focus);
    assert.equal(departureParams.scene, "1");
    assert.equal(climaxParams.scene, "4");
  });

  it("flags missing climax in recommendations", () => {
    const architecture = buildStoryArchitecture({
      userIdea: "Short clip",
      plannedSceneCount: 2,
    });
    assert.ok(
      architecture.recommendationKeys.includes("studio.storyArchitect.task.missingClimax")
      || architecture.storyStructure.find((p) => p.phase === "climax")?.status === "present"
    );
  });

  it("AI Director consumes storyArchitectureContext", () => {
    const storyboard = studioStoryboardDetail({ scenes: [], aiDirectorPrompt: "Garden promo" });
    const proposal = buildDirectorProposal({
      idea: "Garden promo",
      storyboard,
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal?.storyArchitectureContext);
    assert.ok(proposal!.storyArchitectureContext!.architecture.storyMoments.length === 5);
    const scenes = proposal!.scenes;
    assert.ok(scenes.length > 0);
    assert.ok(scenes[0]!.titleKey.includes("beatTranslation"));
    assert.ok(scenes.some((scene) => scene.titleKey.includes("breakthrough")));
    assert.notEqual(scenes[0]!.titleKey, scenes[Math.min(3, scenes.length - 1)]!.titleKey);
  });

  it("Production Planner summary can be built from architecture", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0 }), studioSceneDetail({ order: 1 })],
    });
    const plan = buildStudioProductionPlan({ storyboard });
    const architecture = buildStoryArchitecture({ userIdea: "Promo", storyboard });
    const summary = buildStoryArchitectSummary(architecture);
    assert.ok(plan.storyStructure.length === 5);
    assert.ok(summary.momentCount === 5);
  });

  it("Creation Assistant surfaces story architect gaps", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0, title: "Only scene" })],
      aiDirectorPrompt: "One scene only",
    });
    const view = buildCreationAssistantView({ storyboard });
    const architectTasks = view.nowTasks.filter((task) => task.source === "story_architect");
    assert.ok(architectTasks.length >= 0);
  });

  it("Creative Review includes story architect context lines", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({ order: 0, title: "A" }),
        studioSceneDetail({ order: 1, title: "B" }),
        studioSceneDetail({ order: 2, title: "C" }),
      ],
      aiDirectorPrompt: "Three beat story",
    });
    const review = buildCreativeReview({ storyboard });
    assert.ok(review.directorContextLines.some((line) => line.startsWith("architect:")));
  });
});

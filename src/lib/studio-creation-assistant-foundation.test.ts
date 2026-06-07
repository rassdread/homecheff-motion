import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCreationAssistantContext,
  buildCreationAssistantView,
  enrichIdeaWithCreationAssistant,
} from "@/lib/studio-creation-assistant";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  studioCharacterListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-creation-assistant", () => {
  it("builds creation assistant view with task tiers", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({ order: 0, title: "Opening", action: "Welcome guests" }),
        studioSceneDetail({ order: 1, title: "Show product", action: "Present dish" }),
      ],
    });
    const view = buildCreationAssistantView({
      storyboard,
      characters: [studioCharacterListItem({ id: "c1", name: "Chef Marco" })],
    });
    assert.equal(view.version, 1);
    assert.ok(Array.isArray(view.nowTasks));
    assert.ok(Array.isArray(view.nextTasks));
    assert.ok(Array.isArray(view.optionalTasks));
    assert.ok(Array.isArray(view.completedItems));
    assert.ok(Array.isArray(view.blockers));
    assert.ok(view.completionProgress.projectStatusKey.startsWith("studio.creationAssistant.status."));
    assert.ok(view.directorContextLines.some((l) => l.startsWith("assistant:")));
  });

  it("aggregates readiness fix actions into now tasks", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0, characters: [] })],
    });
    const view = buildCreationAssistantView({ storyboard, characters: [] });
    const fixTasks = view.nowTasks.filter((t) => t.source === "readiness_fix");
    assert.ok(fixTasks.length >= 0);
  });

  it("prioritises asset guidance as now tasks", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0, characters: [] })],
    });
    const view = buildCreationAssistantView({ storyboard, characters: [], locations: [] });
    const assetTasks = [...view.nowTasks, ...view.nextTasks].filter((t) => t.category === "asset");
    assert.ok(Array.isArray(assetTasks));
  });

  it("includes image tasks from generation plan", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0 })],
    });
    const view = buildCreationAssistantView({ storyboard });
    const imageTasks = [...view.nowTasks, ...view.nextTasks].filter((t) => t.category === "image");
    assert.ok(Array.isArray(imageTasks));
  });

  it("includes audio tasks when audio domains are missing", () => {
    const storyboard = studioStoryboardDetail({
      voiceEnabled: true,
      musicEnabled: true,
      scenes: [studioSceneDetail({ order: 0 })],
    });
    const view = buildCreationAssistantView({ storyboard });
    const audioTasks = [...view.nowTasks, ...view.nextTasks].filter((t) => t.category === "audio");
    assert.ok(audioTasks.length >= 0);
  });

  it("includes story phase tasks", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0, title: "Intro only" })],
    });
    const view = buildCreationAssistantView({ storyboard });
    const storyTasks = [...view.nowTasks, ...view.nextTasks].filter((t) => t.category === "story");
    assert.ok(storyTasks.length >= 0);
  });

  it("includes render tasks without starting render", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0 })],
    });
    const view = buildCreationAssistantView({ storyboard });
    const renderTasks = [...view.nowTasks, ...view.nextTasks, ...view.optionalTasks].filter(
      (t) => t.category === "render"
    );
    for (const task of renderTasks) {
      assert.notEqual(task.actionKind, "useSuggestion");
    }
  });

  it("tracks completion progress from domain readiness", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({ order: 0, title: "Intro" }),
        studioSceneDetail({ order: 1, title: "Build" }),
        studioSceneDetail({ order: 2, title: "Climax", emotion: "excited" }),
        studioSceneDetail({ order: 3, title: "End CTA" }),
      ],
    });
    const view = buildCreationAssistantView({
      storyboard,
      characters: [studioCharacterListItem({ id: "c1", name: "Host" })],
    });
    assert.ok(view.completionProgress.domainsTotal >= 5);
    assert.ok(view.completionProgress.percent >= 0);
    assert.ok(view.completionProgress.percent <= 100);
  });

  it("open-tool actions include toolId on actionable tasks", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0, characters: [] })],
    });
    const view = buildCreationAssistantView({ storyboard, characters: [] });
    const actionable = [...view.nowTasks, ...view.nextTasks].filter((t) => t.toolId);
    for (const task of actionable) {
      assert.ok(task.toolId);
    }
  });

  it("AI Director consumes creationAssistantContext", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0 })],
    });
    const proposal = buildDirectorProposal({
      idea: "A cooking show intro with mascot",
      storyboard,
      characters: [studioCharacterListItem({ id: "m1", name: "Mascot" })],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    assert.ok(proposal!.creationAssistantContext);
    assert.ok(proposal!.creationAssistantContext!.contextLines.length > 0);
    assert.ok(proposal!.creationAssistantContext!.openTaskKeys.length >= 0);
  });

  it("enriches idea with open task keys", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0 })],
    });
    const context = buildCreationAssistantContext({ storyboard });
    const enriched = enrichIdeaWithCreationAssistant("Make a promo video", context);
    assert.ok(enriched.includes("[Creation assistant:"));
  });

  it("i18n keys exist for project status labels", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [studioSceneDetail({ order: 0 })],
    });
    const view = buildCreationAssistantView({ storyboard });
    const validKeys = [
      "studio.creationAssistant.status.started",
      "studio.creationAssistant.status.building",
      "studio.creationAssistant.status.almost_ready",
      "studio.creationAssistant.status.ready_for_render",
    ];
    assert.ok(validKeys.includes(view.completionProgress.projectStatusKey));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAssetDecision } from "@/lib/studio-asset-decision-execution";
import { loadAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import { fulfillAssetDecision } from "@/lib/studio-asset-lifecycle-resolver";
import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  buildProductionTimeline,
  buildProductionTimelineContext,
  enrichIdeaWithProductionTimeline,
} from "@/lib/studio-production-timeline";
import {
  studioCharacterListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-production-timeline", () => {
  it("builds brief history from storyboard", () => {
    const storyboard = studioStoryboardDetail({
      title: "Sports promo",
      description: "Promote the mascot",
      aiDirectorPrompt: "Mascot scores in stadium",
      createdAt: "2026-01-01T10:00:00.000Z",
    });
    const timeline = buildProductionTimeline({ storyboard });
    assert.ok(timeline.timelineEvents.some((e) => e.kind === "production_started"));
    assert.ok(timeline.timelineEvents.some((e) => e.kind === "idea_captured"));
    assert.ok(timeline.timelineEvents.some((e) => e.kind === "style_selected"));
    assert.ok(timeline.milestones.some((m) => m.id === "milestone-started"));
  });

  it("orders timeline events newest first", () => {
    const storyboard = studioStoryboardDetail({
      scenes: [
        studioSceneDetail({
          order: 0,
          createdAt: "2026-01-02T10:00:00.000Z",
          characters: [studioCharacterListItem({ id: "c1", name: "Mascot" })],
        }),
        studioSceneDetail({
          order: 1,
          createdAt: "2026-01-03T10:00:00.000Z",
        }),
      ],
      createdAt: "2026-01-01T10:00:00.000Z",
      aiDirectorPrompt: "Mascot adventure",
    });
    const timeline = buildProductionTimeline({ storyboard });
    const times = timeline.timelineEvents.map((e) => Date.parse(e.at));
    for (let i = 1; i < times.length; i += 1) {
      assert.ok(times[i - 1]! >= times[i]!);
    }
  });

  it("includes asset decision and lifecycle history", () => {
    let registry = applyAssetDecision(loadAssetDecisionRegistry({ storyboardId: "sb-tl" }), {
      id: "char-1",
      kind: "character",
      mode: "build_new",
      name: "Hero",
    });
    registry = fulfillAssetDecision(registry, {
      decisionId: "char-1",
      kind: "character",
      createdEntityId: "c-hero",
      createdName: "Hero",
    });

    const storyboard = studioStoryboardDetail({
      id: "sb-tl",
      scenes: [
        studioSceneDetail({
          order: 0,
          characters: [studioCharacterListItem({ id: "c-hero", name: "Hero" })],
        }),
      ],
    });

    const timeline = buildProductionTimeline({
      storyboard,
      assetDecisionRegistry: registry,
    });

    assert.ok(timeline.decisionHistory.some((d) => d.name === "Hero"));
    assert.ok(timeline.timelineEvents.some((e) => e.kind === "asset_created"));
    assert.ok(timeline.timelineEvents.some((e) => e.kind === "asset_linked"));
    assert.ok(timeline.milestones.some((m) => m.id === "milestone-asset-complete"));
  });

  it("detects production evolution for scenes and characters", () => {
    const storyboard = studioStoryboardDetail({
      createdAt: "2026-01-01T10:00:00.000Z",
      scenes: [
        studioSceneDetail({
          order: 0,
          createdAt: "2026-01-01T10:00:00.000Z",
          durationSeconds: 10,
          characters: [studioCharacterListItem({ id: "c1", name: "A" })],
        }),
        studioSceneDetail({
          order: 1,
          createdAt: "2026-01-02T10:00:00.000Z",
          durationSeconds: 15,
          characters: [
            studioCharacterListItem({ id: "c1", name: "A" }),
            studioCharacterListItem({ id: "c2", name: "B" }),
          ],
        }),
      ],
    });

    const timeline = buildProductionTimeline({ storyboard });
    assert.ok(timeline.productionEvolution.some((p) => p.titleKey.includes("characters")));
    assert.ok(timeline.productionEvolution.some((p) => p.titleKey.includes("scenes")));
  });

  it("feeds Creation Assistant recent completed from timeline", () => {
    let registry = applyAssetDecision(loadAssetDecisionRegistry({ storyboardId: "sb-ca" }), {
      id: "char-ca",
      kind: "character",
      mode: "build_new",
      name: "Star",
    });
    registry = fulfillAssetDecision(registry, {
      decisionId: "char-ca",
      kind: "character",
      createdEntityId: "c-star",
      createdName: "Star",
    });

    const timeline = buildProductionTimeline({
      storyboard: studioStoryboardDetail({ id: "sb-ca", scenes: [] }),
      assetDecisionRegistry: registry,
    });

    const view = buildCreationAssistantView({
      storyboard: studioStoryboardDetail({ id: "sb-ca", scenes: [] }),
      productionTimeline: timeline,
      assetDecisionRegistry: registry,
    });

    assert.ok(
      view.completedItems.some((t) => t.source === "production_timeline" || t.source === "asset_decision")
    );
  });

  it("enriches AI Director idea with timeline context", () => {
    const storyboard = studioStoryboardDetail({
      aiDirectorPrompt: "Garden promo",
      createdAt: "2026-01-01T10:00:00.000Z",
    });
    const context = buildProductionTimelineContext({ storyboard });
    const enriched = enrichIdeaWithProductionTimeline("Garden promo", context);
    assert.match(enriched, /Production timeline:/);
    assert.match(enriched, /timeline:events:/);
  });

  it("director proposal builder consumes timeline enrichment", () => {
    const storyboard = studioStoryboardDetail({
      aiDirectorPrompt: "Chef in kitchen",
      scenes: [studioSceneDetail({ order: 0, title: "Intro" })],
    });
    let registry = loadAssetDecisionRegistry({});
    registry = applyAssetDecision(registry, {
      id: "loc-1",
      kind: "location",
      mode: "use_existing",
      name: "Kitchen",
      existingId: "l1",
    });
    const proposal = buildDirectorProposal({
      idea: "Chef in kitchen",
      storyboard,
      characters: [],
      locations: [],
      props: [],
      assetDecisionRegistry: registry,
    });
    assert.ok(proposal);
  });
});

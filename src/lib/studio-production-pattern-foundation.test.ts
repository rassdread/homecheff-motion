import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  detectProductionTypeFromIdea,
} from "@/lib/studio-production-memory-profile";
import {
  buildProductionPatternContext,
  buildProductionPatternProfile,
  buildProductionTimelineWithPatterns,
  enrichIdeaWithProductionPattern,
  enrichTimelineWithPatternHints,
  emptyProductionPatternProfile,
} from "@/lib/studio-production-pattern-profile";
import { buildProductionTimeline } from "@/lib/studio-production-timeline";
import { emptyProjectMemorySnapshot } from "@/lib/studio-project-memory-utils";
import {
  studioCharacterListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";
import type { ProductionMemoryRecord } from "@/types/studio-production-memory";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

function sampleRecord(overrides: Partial<ProductionMemoryRecord> = {}): ProductionMemoryRecord {
  return {
    storyboardId: "sb-1",
    title: "HomeCheff garden promo",
    ideaText: "Chef Marco presents fresh vegetables from the HomeCheff garden",
    directorProfile: "commercial",
    promptStyleProfile: "commercial",
    sceneCount: 5,
    shotCount: 8,
    durationSeconds: 45,
    renderStrategy: "story",
    voiceProfile: "warm_narrator",
    musicStyle: "uplifting",
    soundStyle: "balanced",
    dominantWorldIds: ["w-homecheff"],
    characterIds: ["c-marco"],
    hasCtaScene: true,
    ...overrides,
  };
}

function memoryWithRecords(records: ProductionMemoryRecord[]): StudioProjectMemorySnapshot {
  return {
    ...emptyProjectMemorySnapshot(),
    characters: {
      "c-marco": { storyboardCount: 4, sceneCount: 12, renderCount: 2, campaignCount: 1 },
    },
    worlds: {
      "w-homecheff": { storyboardCount: 3, sceneCount: 10, renderCount: 2, campaignCount: 1 },
    },
    props: {
      "p-basket": { storyboardCount: 2, sceneCount: 4, renderCount: 1, campaignCount: 0 },
    },
    productionRecords: records,
  };
}

describe("studio-production-pattern-profile", () => {
  it("returns empty profile without project memory", () => {
    const profile = buildProductionPatternProfile({
      currentIdea: "HomeCheff garden promo",
    });
    assert.equal(profile.totalProductions, 0);
    assert.equal(profile.currentProductionType, "homecheff_promo");
    assert.ok(profile.recurringProductionTypes.length === 0);
  });

  it("builds recurring production types from records", () => {
    const memory = memoryWithRecords([
      sampleRecord(),
      sampleRecord({ storyboardId: "sb-2" }),
      sampleRecord({ storyboardId: "sb-3", ideaText: "HomeCheff garden harvest" }),
    ]);
    const profile = buildProductionPatternProfile({
      projectMemory: memory,
      currentIdea: "New HomeCheff garden promo",
      characters: [studioCharacterListItem({ id: "c-marco", name: "Chef Marco" })],
      worlds: [{ id: "w-homecheff", name: "HomeCheff World" } as never],
    });

    assert.equal(profile.totalProductions, 3);
    assert.ok(profile.recurringProductionTypes.some((p) => p.id === "homecheff_promo"));
    assert.ok(profile.recurringProductionTypes.some((p) => p.id === "garden_promo"));
    assert.ok(profile.structureSummary);
    assert.equal(profile.structureSummary!.averageSceneCount, 5);
  });

  it("detects production types from idea heuristics", () => {
    assert.equal(detectProductionTypeFromIdea("Sports mascot stadium promo"), "sports_promo");
    assert.equal(detectProductionTypeFromIdea("How to cook pasta tutorial"), "tutorial_promo");
    assert.equal(detectProductionTypeFromIdea("Community neighborhood heroes"), "community_promo");
    assert.equal(detectProductionTypeFromIdea("Designer craft atelier promo"), "designer_promo");
  });

  it("builds structure, duration, and shot patterns", () => {
    const memory = memoryWithRecords([
      sampleRecord({ durationSeconds: 44, shotCount: 8, sceneCount: 5 }),
      sampleRecord({ storyboardId: "sb-2", durationSeconds: 46, shotCount: 9, sceneCount: 5 }),
      sampleRecord({ storyboardId: "sb-3", durationSeconds: 43, shotCount: 8, sceneCount: 5 }),
    ]);
    const profile = buildProductionPatternProfile({ projectMemory: memory });

    assert.ok(profile.recurringDurations.some((d) => d.label === "medium"));
    assert.ok(profile.recurringShotCounts.some((s) => s.label === "balanced"));
    assert.ok(profile.recurringStructures.length > 0);
    assert.ok(profile.structureSummary!.averageDurationSeconds >= 43);
  });

  it("builds render strategy patterns", () => {
    const memory = memoryWithRecords([
      sampleRecord({ renderStrategy: "story" }),
      sampleRecord({ storyboardId: "sb-2", renderStrategy: "story" }),
      sampleRecord({ storyboardId: "sb-3", renderStrategy: "hybrid" }),
    ]);
    const profile = buildProductionPatternProfile({ projectMemory: memory });
    assert.equal(profile.recurringRenderStrategies[0]?.label, "story");
  });

  it("builds recurring asset combinations", () => {
    const memory = memoryWithRecords([
      sampleRecord(),
      sampleRecord({ storyboardId: "sb-2" }),
    ]);
    const profile = buildProductionPatternProfile({
      projectMemory: memory,
      characters: [studioCharacterListItem({ id: "c-marco", name: "Chef Marco" })],
      worlds: [{ id: "w-homecheff", name: "HomeCheff World" } as never],
    });

    assert.ok(profile.recurringAssetCombinations.length > 0);
    assert.equal(profile.recurringAssetCombinations[0]!.characterName, "Chef Marco");
    assert.ok(profile.recurringWorlds.some((w) => w.params?.name === "HomeCheff World"));
    assert.ok(profile.recurringCharacters.length > 0);
  });

  it("builds recurring props from project memory", () => {
    const memory = memoryWithRecords([sampleRecord(), sampleRecord({ storyboardId: "sb-2" })]);
    const profile = buildProductionPatternProfile({
      projectMemory: memory,
      props: [{ id: "p-basket", name: "Harvest Basket" } as never],
    });
    assert.ok(profile.recurringProps.some((p) => p.params?.name === "Harvest Basket"));
  });

  it("enriches timeline milestones with pattern hints", () => {
    const memory = memoryWithRecords([
      sampleRecord(),
      sampleRecord({ storyboardId: "sb-2" }),
      sampleRecord({ storyboardId: "sb-3" }),
    ]);
    const storyboard = studioStoryboardDetail({
      aiDirectorPrompt: "HomeCheff garden promo",
      createdAt: "2026-01-01T10:00:00.000Z",
    });
    const timeline = buildProductionTimeline({ storyboard, projectMemory: memory });
    const profile = buildProductionPatternProfile({
      projectMemory: memory,
      currentIdea: storyboard.aiDirectorPrompt,
    });
    const enriched = enrichTimelineWithPatternHints(timeline, profile);

    const started = enriched.milestones.find((m) => m.id === "milestone-started");
    assert.ok(started?.patternHintKey);
    assert.equal(started!.patternHintKey, "studio.productionPattern.timeline.oftenUsed");
  });

  it("buildProductionTimelineWithPatterns merges timeline and hints", () => {
    const memory = memoryWithRecords([
      sampleRecord(),
      sampleRecord({ storyboardId: "sb-2" }),
    ]);
    const storyboard = studioStoryboardDetail({ createdAt: "2026-01-01T10:00:00.000Z" });
    const timeline = buildProductionTimelineWithPatterns({
      storyboard,
      projectMemory: memory,
    });
    assert.ok(timeline.milestones.length > 0);
    assert.ok(
      timeline.milestones.some((m) => m.patternHintKey === "studio.productionPattern.timeline.oftenUsed")
    );
  });

  it("builds pattern context for AI Director", () => {
    const memory = memoryWithRecords([sampleRecord(), sampleRecord({ storyboardId: "sb-2" })]);
    const context = buildProductionPatternContext({
      projectMemory: memory,
      currentIdea: "HomeCheff garden promo",
    });
    assert.ok(context.contextLines.some((l) => l.startsWith("patterns:")));
    assert.ok(context.recommendationKeys.length > 0);
    assert.ok(context.profile.directorContextLines.length > 0);
  });

  it("enriches idea with production pattern context", () => {
    const memory = memoryWithRecords([sampleRecord(), sampleRecord({ storyboardId: "sb-2" })]);
    const context = buildProductionPatternContext({
      projectMemory: memory,
      currentIdea: "HomeCheff garden promo",
    });
    const enriched = enrichIdeaWithProductionPattern("Garden promo idea", context);
    assert.ok(enriched.includes("[Production patterns:"));
    assert.ok(enriched.includes("Garden promo idea"));
  });

  it("AI Director consumes productionPatternContext", () => {
    const memory = memoryWithRecords([sampleRecord(), sampleRecord({ storyboardId: "sb-2" })]);
    const idea = "HomeCheff garden promo";
    const proposal = buildDirectorProposal({
      idea,
      storyboard: studioStoryboardDetail({ scenes: [], aiDirectorPrompt: idea }),
      characters: [],
      locations: [],
      props: [],
      projectMemory: memory,
    });
    assert.ok(proposal);
    assert.ok(proposal!.productionPatternContext);
    assert.ok(proposal!.productionPatternContext!.contextLines.length > 0);
  });

  it("emptyProductionPatternProfile has stable defaults", () => {
    const empty = emptyProductionPatternProfile();
    assert.equal(empty.version, 1);
    assert.equal(empty.totalProductions, 0);
    assert.equal(empty.currentProductionType, null);
    assert.deepEqual(empty.directorContextLines, []);
  });
});

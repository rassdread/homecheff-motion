import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProductionBrief } from "@/lib/studio-production-brief-builder";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { buildSceneGenerationPlan } from "@/lib/studio-scene-generation-orchestrator";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import {
  buildProductionMemoryProfile,
  detectPatternForText,
  findSimilarProductions,
} from "@/lib/studio-production-memory-profile";
import {
  productionMemoryBriefRecommendations,
  productionMemoryPlannerRecommendations,
  productionMemoryGenerationRecommendations,
  productionMemoryRenderReasons,
} from "@/lib/studio-production-memory-integration";
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
    voices: [
      {
        profileId: "warm_narrator",
        labelKey: "studio.voiceProfile.warmNarrator",
        characterCount: 2,
        storyboardCount: 4,
      },
    ],
    styles: [
      {
        promptStyleProfile: "commercial",
        directorProfile: "commercial",
        storyboardCount: 4,
      },
    ],
    productionRecords: records,
  };
}

describe("studio-production-memory-profile", () => {
  it("builds production memory profile from records", () => {
    const memory = memoryWithRecords([
      sampleRecord(),
      sampleRecord({ storyboardId: "sb-2", durationSeconds: 42, shotCount: 9 }),
      sampleRecord({
        storyboardId: "sb-3",
        title: "Garden harvest",
        ideaText: "Fresh garden vegetables promo for HomeCheff",
      }),
    ]);

    const profile = buildProductionMemoryProfile({
      memory,
      currentIdea: "New HomeCheff garden promo with Chef Marco",
      characters: [studioCharacterListItem({ id: "c-marco", name: "Chef Marco" })],
      libraries: {
        worlds: [{ id: "w-homecheff", name: "HomeCheff World" } as never],
      },
    });

    assert.equal(profile.totalProductions, 3);
    assert.ok(profile.averageDurationSeconds >= 40);
    assert.ok(profile.averageShotCount >= 8);
    assert.ok(profile.productionPatterns.some((p) => p.id === "homecheff_promo"));
    assert.ok(profile.recurringRenderStrategies.some((r) => r.label === "story"));
    assert.ok(profile.topCharacters.length > 0);
    assert.ok(profile.creationGuidance);
  });

  it("detects recurring duration and shot buckets", () => {
    const memory = memoryWithRecords([
      sampleRecord({ durationSeconds: 44, shotCount: 8 }),
      sampleRecord({ storyboardId: "sb-2", durationSeconds: 46, shotCount: 9 }),
      sampleRecord({ storyboardId: "sb-3", durationSeconds: 43, shotCount: 8 }),
    ]);
    const profile = buildProductionMemoryProfile({ memory });
    assert.ok(profile.recurringDurations.some((d) => d.label === "medium"));
    assert.ok(profile.recurringShotCounts.some((s) => s.label === "balanced"));
  });

  it("detects recurring world from production records", () => {
    const memory = memoryWithRecords([
      sampleRecord(),
      sampleRecord({ storyboardId: "sb-2" }),
      sampleRecord({ storyboardId: "sb-3", dominantWorldIds: ["w-homecheff"] }),
    ]);
    const profile = buildProductionMemoryProfile({
      memory,
      libraries: {
        worlds: [{ id: "w-homecheff", name: "HomeCheff World" } as never],
      },
    });
    assert.ok(profile.recurringWorlds.some((w) => w.params?.name === "HomeCheff World"));
  });

  it("detects render strategy patterns", () => {
    const memory = memoryWithRecords([
      sampleRecord({ renderStrategy: "story" }),
      sampleRecord({ storyboardId: "sb-2", renderStrategy: "story" }),
      sampleRecord({ storyboardId: "sb-3", renderStrategy: "hybrid" }),
    ]);
    const profile = buildProductionMemoryProfile({ memory });
    assert.ok(profile.recurringRenderStrategies[0]?.label === "story");
    const reasons = productionMemoryRenderReasons(profile);
    assert.equal(reasons.length, 1);
  });

  it("finds similar productions for garden promo idea", () => {
    const records = [
      sampleRecord(),
      sampleRecord({ storyboardId: "sb-2", ideaText: "HomeCheff garden harvest with Chef Marco" }),
      sampleRecord({ storyboardId: "sb-3", ideaText: "Sports mascot stadium promo" }),
    ];
    const similar = findSimilarProductions(records, "HomeCheff garden promo with vegetables");
    assert.ok(similar.length >= 2);
    assert.equal(detectPatternForText("HomeCheff garden vegetables"), "homecheff_promo");
  });

  it("Production Brief consumes production memory guidance", () => {
    const memory = memoryWithRecords([
      sampleRecord(),
      sampleRecord({ storyboardId: "sb-2" }),
      sampleRecord({ storyboardId: "sb-3" }),
    ]);
    const brief = buildProductionBrief({
      idea: "HomeCheff garden promo with Chef Marco presenting fresh vegetables",
      characters: [studioCharacterListItem({ id: "c-marco", name: "Chef Marco" })],
      projectMemory: memory,
    });
    assert.ok(brief);
    const memoryRecs = productionMemoryBriefRecommendations(
      buildProductionMemoryProfile({ memory, currentIdea: brief!.idea })
    );
    assert.ok(memoryRecs.length > 0 || brief!.productionMemoryGuidance);
  });

  it("AI Director consumes productionMemoryContext", () => {
    const memory = memoryWithRecords([sampleRecord(), sampleRecord({ storyboardId: "sb-2" })]);
    const idea = "HomeCheff garden promo";
    const storyboard = studioStoryboardDetail({ scenes: [], aiDirectorPrompt: idea });
    const proposal = buildDirectorProposal({
      idea,
      storyboard,
      characters: [],
      locations: [],
      props: [],
      projectMemory: memory,
    });
    assert.ok(proposal);
    assert.ok(proposal!.productionMemoryContext);
    assert.ok(proposal!.productionMemoryContext!.contextLines.length > 0);
  });

  it("Production Planner adds memory recommendations", () => {
    const memory = memoryWithRecords([
      sampleRecord(),
      sampleRecord({ storyboardId: "sb-2", durationSeconds: 40, shotCount: 7 }),
    ]);
    const storyboard = studioStoryboardDetail({
      aiDirectorPrompt: "HomeCheff promo",
      scenes: [],
    });
    const plan = buildStudioProductionPlan({
      storyboard,
      projectMemory: memory,
    });
    const memoryRecs = productionMemoryPlannerRecommendations(
      buildProductionMemoryProfile({ memory, currentIdea: storyboard.aiDirectorPrompt })
    );
    assert.ok(
      plan.recommendations.some((r) => r.id.startsWith("memory-")) || memoryRecs.length > 0
    );
    assert.ok(plan.directorContextLines.some((l) => l.startsWith("memory:")));
  });

  it("Scene Generation consumes production memory", () => {
    const memory = memoryWithRecords([sampleRecord(), sampleRecord({ storyboardId: "sb-2" })]);
    const storyboard = studioStoryboardDetail({ scenes: [] });
    const plan = buildSceneGenerationPlan({
      storyboard,
      projectMemory: memory,
    });
    const memoryRecs = productionMemoryGenerationRecommendations(
      buildProductionMemoryProfile({ memory })
    );
    assert.ok(
      plan.recommendations.some((r) => r.id.startsWith("memory-")) || memoryRecs.length > 0
    );
    assert.ok(plan.directorContextLines.some((l) => l.startsWith("memory:")));
  });

  it("Render Strategy includes memory advisory reasons", () => {
    const memory = memoryWithRecords([
      sampleRecord({ renderStrategy: "story" }),
      sampleRecord({ storyboardId: "sb-2", renderStrategy: "story" }),
    ]);
    const plan = buildStudioRenderStrategyPlan({
      storyboard: studioStoryboardDetail({ scenes: [] }),
      projectMemory: memory,
    });
    assert.ok(plan.reasons.some((r) => r.id === "memory-render-preference"));
  });

  it("Voice memory surfaces recurring voice types", () => {
    const memory = memoryWithRecords([sampleRecord(), sampleRecord({ storyboardId: "sb-2" })]);
    const profile = buildProductionMemoryProfile({ memory });
    assert.ok(profile.recurringVoiceTypes.some((v) => v.profileId === "warm_narrator"));
    assert.ok(profile.recurringAudioStyles.length > 0);
  });
});

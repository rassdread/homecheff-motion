import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { interpretConversationally } from "@/lib/assistant-conversational-interpretation";
import { getAssistantAnalyticsSummary, trackAssistantAnalyticsEvent } from "@/lib/assistant-analytics";
import { listActiveAdminRecommendations } from "@/lib/assistant-admin-recommendations";
import {
  buildGuidanceStepReply,
  resolvePronounMessage,
  updateConversationMemory,
} from "@/lib/assistant-conversation-memory";
import {
  buildCheapestPathReply,
  estimateProducerPlanCost,
  isCheapestPathQuestion,
} from "@/lib/assistant-cost-estimate";
import { buildDynamicLibraryRecommendations } from "@/lib/assistant-dynamic-recommendations";
import {
  buildExecutionChainForPreset,
  executionChainSummary,
} from "@/lib/assistant-execution-chain";
import {
  buildLibraryMascotProducerOptions,
  listLibraryMascots,
} from "@/lib/assistant-library-intelligence";
import { processAssistantTurn } from "@/lib/assistant-orchestrator";
import {
  appendAssistantProjectMemoryTurn,
  buildProjectMemoryReuseReply,
  createEmptyAssistantProjectMemory,
  isProjectRepeatRequest,
  rememberAssistantProjectPlan,
} from "@/lib/assistant-project-memory";
import { buildProducerProductionPlan } from "@/lib/assistant-producer-planner";
import { producerResponseFromInterpretation } from "@/lib/assistant-producer-response";
import { buildAssistantStudioContext } from "@/lib/assistant-studio-brain";
import { createAssistantSessionMemory } from "@/lib/assistant-session-memory";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

function mascotRecords(): LibraryConsistencyRecord[] {
  return [
    {
      id: "rec_chef",
      assetName: "Chef mascotte",
      category: "characters",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: "proj_1",
      projectTitle: "Demo",
      thumbnailUrl: null,
      storageKey: "k1",
      generationType: "character",
    } as LibraryConsistencyRecord,
    {
      id: "rec_garden",
      assetName: "Garden mascotte",
      category: "characters",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: "proj_1",
      projectTitle: "Demo",
      thumbnailUrl: null,
      storageKey: "k2",
      generationType: "character",
    } as LibraryConsistencyRecord,
    {
      id: "rec_designer",
      assetName: "Designer mascotte",
      category: "characters",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: "proj_1",
      projectTitle: "Demo",
      thumbnailUrl: null,
      storageKey: "k3",
      generationType: "character",
    } as LibraryConsistencyRecord,
  ];
}

function soccerRecords(): LibraryConsistencyRecord[] {
  return [
    {
      id: "rec_soccer",
      assetName: "Sergio Motion Character",
      category: "characters",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: "proj_soccer",
      projectTitle: "Voetbal",
      thumbnailUrl: null,
      storageKey: "k_soccer",
      generationType: "character",
      promptSummary: "voetbal speler stadion",
    } as LibraryConsistencyRecord,
    {
      id: "rec_stadium",
      assetName: "Stadion achtergrond",
      category: "assets",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: "proj_soccer",
      projectTitle: "Voetbal",
      thumbnailUrl: null,
      storageKey: "k_stadium",
      generationType: "fusion",
      promptSummary: "stadion voetbal",
    } as LibraryConsistencyRecord,
  ];
}

function snapshotFromRecords(records: LibraryConsistencyRecord[]) {
  return buildAssistantContextSnapshot({ projects: [], libraryRecords: records });
}

function studioFromRecords(records: LibraryConsistencyRecord[], pathname = "/studio") {
  const snapshot = snapshotFromRecords(records);
  return buildAssistantStudioContext({
    pathname,
    snapshot,
    activeProjectId: null,
    pendingPrefillId: null,
    recentHistory: [],
    projectMemory: null,
  });
}

describe("assistant v8-v20 studio brain mega sprint", () => {
  it("builds AssistantStudioContext with route, characters and unfinished flows", () => {
    const studio = studioFromRecords(mascotRecords());
    assert.equal(studio.route.module, "studio");
    assert.equal(studio.characters.length, 3);
    assert.ok(studio.preparedAssets.length >= 3);
  });

  it("project memory reuse reply lists previous plan choices", () => {
    const memory = rememberAssistantProjectPlan(createEmptyAssistantProjectMemory(), {
      at: new Date().toISOString(),
      characterName: "Sergio Motion Character",
      presetId: "goal_celebration",
      locationName: "Stadion achtergrond",
      outfitName: "Sport outfit",
      style: "celebration",
    });
    const reply = buildProjectMemoryReuseReply(memory, "nl");
    assert.ok(reply);
    assert.match(reply!, /Vorige keer gebruikte je/i);
    assert.match(reply!, /Sergio Motion Character/i);
    assert.match(reply!, /goal celebration/i);
  });

  it("orchestrator handles project repeat requests with memory context", () => {
    const projectMemory = rememberAssistantProjectPlan(createEmptyAssistantProjectMemory(), {
      at: new Date().toISOString(),
      characterName: "Sergio Motion Character",
      presetId: "goal_celebration",
      locationName: "Stadion achtergrond",
    });
    const turn = processAssistantTurn({
      message: "maak nog zo'n doelpuntvideo",
      memory: createAssistantSessionMemory(),
      snapshot: snapshotFromRecords(soccerRecords()),
      isAuthenticated: true,
      locale: "nl",
      pathname: "/animate/instant",
      projectMemory,
    });
    const reply = turn.messages.find((row) => row.role === "assistant");
    assert.ok(reply?.producerResponse);
    assert.match(reply!.producerResponse!.shortReply, /Vorige keer gebruikte je/i);
    assert.ok(isProjectRepeatRequest("maak nog zo'n doelpuntvideo"));
  });

  it("library mascot options include Chef, Garden, Designer and new mascot", () => {
    const snapshot = snapshotFromRecords(mascotRecords());
    const mascots = listLibraryMascots(snapshot);
    assert.equal(mascots.length, 3);
    const options = buildLibraryMascotProducerOptions(snapshot, "nl");
    const labels = options.map((row) => row.label);
    assert.ok(labels.some((label) => /Chef/i.test(label)));
    assert.ok(labels.some((label) => /Garden/i.test(label)));
    assert.ok(labels.some((label) => /Designer/i.test(label)));
    assert.ok(labels.some((label) => /Nieuwe mascotte/i.test(label)));
  });

  it("mascot variant with studio context surfaces library options instead of upload-only", () => {
    const studio = studioFromRecords(mascotRecords());
    const interpretation = interpretConversationally("ik wil een mascotte alternatief maken", {
      locale: "nl",
      snapshot: snapshotFromRecords(mascotRecords()),
    });
    const producer = producerResponseFromInterpretation(
      "ik wil een mascotte alternatief maken",
      interpretation,
      { locale: "nl", snapshot: snapshotFromRecords(mascotRecords()) },
      studio
    );
    assert.match(producer.shortReply, /bibliotheek|mascotte/i);
    assert.ok(producer.options.some((row) => /Chef|Garden|Designer/i.test(row.label)));
    assert.ok(producer.productionPlan);
    assert.ok(producer.costEstimate);
  });

  it("producer planner builds promotion video steps", () => {
    const studio = studioFromRecords([]);
    const interpretation = interpretConversationally("Ik wil een promotievideo voor HomeCheff", {
      locale: "nl",
    });
    assert.ok(interpretation);
    const plan = buildProducerProductionPlan({
      message: "Ik wil een promotievideo voor HomeCheff",
      interpretation: interpretation!,
      studio,
      locale: "nl",
    });
    assert.equal(plan.steps.length, 5);
    assert.match(plan.steps[0]!.title, /Verhaal maken/i);
    assert.match(plan.steps[4]!.title, /TikTok/i);
    assert.ok(plan.estimatedCredits > 0);
  });

  it("cost estimation highlights savings when reusing library assets", () => {
    const studio = studioFromRecords(mascotRecords());
    const interpretation = interpretConversationally("ik wil een mascotte alternatief maken", {
      locale: "nl",
    });
    const plan = buildProducerProductionPlan({
      message: "ik wil een mascotte alternatief maken",
      interpretation: interpretation!,
      studio,
      locale: "nl",
    });
    const cost = estimateProducerPlanCost(plan, studio, "nl");
    assert.equal(cost.reuseExistingAssets, true);
    assert.ok(cost.savingsPercent >= 40);
    assert.match(cost.summary, /minder credits|saves about/i);
    assert.equal(isCheapestPathQuestion("Wat is de goedkoopste manier?"), true);
    assert.match(buildCheapestPathReply(studio, "nl"), /80%|bestaande assets/i);
  });

  it("dynamic recommendations include soccer goal celebration when library has soccer assets", () => {
    const studio = studioFromRecords(soccerRecords(), "/");
    const recs = buildDynamicLibraryRecommendations(studio, "/");
    assert.ok(recs.some((row) => row.id === "dynamic_goal_celebration"));
    assert.ok(recs.some((row) => row.promptMessage.includes("doelpunt")));
  });

  it("admin recommendations expose active trending entries", () => {
    const active = listActiveAdminRecommendations("/animate/instant");
    assert.ok(active.some((row) => row.category === "trending"));
    assert.ok(active.every((row) => row.active));
  });

  it("conversation memory resolves pronoun follow-ups", () => {
    const studio = studioFromRecords(mascotRecords());
    const memory = updateConversationMemory(
      { lastEntities: [] },
      {
        message: "ik wil een mascotte alternatief maken",
        interpretation: interpretConversationally("ik wil een mascotte alternatief maken", {
          locale: "nl",
        }),
        studio,
        clusterId: "mascot_variant",
      }
    );
    const resolved = resolvePronounMessage("Maak hem iets moderner", memory, studio);
    assert.match(resolved, /Chef mascotte|moderner/i);
    const guidance = buildGuidanceStepReply(
      { ...memory, guidanceTopic: "mascot_variant", guidanceStep: 2 },
      "nl"
    );
    assert.match(guidance ?? "", /Stap 2/i);
  });

  it("execution chain prepares goal celebration without provider calls", () => {
    const snapshot = snapshotFromRecords(soccerRecords());
    const chain = buildExecutionChainForPreset("goal_celebration", snapshot, "nl");
    assert.ok(chain);
    assert.equal(chain!.requiresConfirmation, true);
    assert.equal(chain!.steps.length, 5);
    assert.match(executionChainSummary(chain!, "nl"), /asset/i);
    const turn = processAssistantTurn({
      message: "Maak een doelpuntvideo",
      memory: createAssistantSessionMemory(),
      snapshot,
      isAuthenticated: true,
      locale: "nl",
      pathname: "/animate/instant",
    });
    const reply = turn.messages.find((row) => row.role === "assistant");
    assert.ok(reply?.producerResponse?.executionChain);
    assert.ok(reply?.producerResponse?.executionChain!.steps.length >= 2);
  });

  it("orchestrator updates conversation memory across turns", () => {
    const memory = createAssistantSessionMemory();
    const snapshot = snapshotFromRecords(mascotRecords());
    const first = processAssistantTurn({
      message: "ik wil een mascotte alternatief maken",
      memory,
      snapshot,
      isAuthenticated: true,
      locale: "nl",
      pathname: "/studio/characters",
    });
    assert.ok(first.memory.conversationMemory?.guidanceStep);
    const second = processAssistantTurn({
      message: "Nee, nieuwe mascotte",
      memory: first.memory,
      snapshot,
      isAuthenticated: true,
      locale: "nl",
      pathname: "/studio/characters",
    });
    assert.ok((second.memory.conversationMemory?.guidanceStep ?? 0) >= 1);
  });

  it("analytics summary is safe in node test environment", () => {
    trackAssistantAnalyticsEvent("prompt", { prompt: "test prompt" });
    const summary = getAssistantAnalyticsSummary();
    assert.equal(summary.totalPrompts, 0);
    assert.deepEqual(summary.topPrompts, []);
  });

  it("project memory turn append keeps recent presets and characters", () => {
    const memory = appendAssistantProjectMemoryTurn(createEmptyAssistantProjectMemory(), {
      userMessage: "doelpuntviering",
      intent: "create_motion_video",
      presetId: "goal_celebration",
      characterName: "Sergio",
      route: "/animate/instant",
    });
    assert.equal(memory.presets[0], "goal_celebration");
    assert.equal(memory.characterNames[0], "Sergio");
    assert.equal(memory.recentTurns.length, 1);
  });
});

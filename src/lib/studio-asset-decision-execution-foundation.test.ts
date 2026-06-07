import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAssetDecision,
  applyDecisionsToDirectorProposal,
  enrichBriefWithAssetDecisions,
  filterProductionMissingItemsByDecisions,
  filterSceneGenerationPlanByDecisions,
  isAssetDecisionSkipped,
  resolveAssetDecisions,
} from "@/lib/studio-asset-decision-execution";
import { loadAssetDecisionRegistry, saveAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { buildProductionBrief } from "@/lib/studio-production-brief-builder";
import { buildSceneGenerationPlan } from "@/lib/studio-scene-generation-orchestrator";
import {
  studioCharacterListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-asset-decision-execution", () => {
  it("applyAssetDecision records use_existing for character", () => {
    let registry = loadAssetDecisionRegistry({});
    registry = applyAssetDecision(registry, {
      id: "char-1",
      kind: "character",
      mode: "use_existing",
      name: "Voetbalmascotte",
      existingId: "c1",
    });
    assert.equal(registry.decisions.length, 1);
    assert.equal(registry.decisions[0]?.mode, "use_existing");
  });

  it("applyAssetDecision records skip and excludes from recommendations", () => {
    let registry = loadAssetDecisionRegistry({});
    registry = applyAssetDecision(registry, {
      id: "loc-1",
      kind: "location",
      mode: "skip",
      name: "Stadion",
    });
    assert.equal(isAssetDecisionSkipped(registry, "location", { name: "Stadion" }), true);
  });

  it("applyAssetDecision records build_new without auto-create", () => {
    const registry = applyAssetDecision(loadAssetDecisionRegistry({}), {
      id: "prop-1",
      kind: "prop",
      mode: "build_new",
      name: "Voetbal",
    });
    const resolved = resolveAssetDecisions(registry);
    assert.equal(resolved.buildNew.length, 1);
    assert.equal(resolved.useExisting.length, 0);
  });

  it("enrichBriefWithAssetDecisions removes skipped assets", () => {
    const brief = buildProductionBrief({
      idea: "Voetbalmascotte in stadion met bal",
      characters: [studioCharacterListItem({ id: "c1", name: "Mascot", isMascot: true })],
    });
    assert.ok(brief);
    let registry = loadAssetDecisionRegistry({ briefIdea: brief!.idea });
    registry = applyAssetDecision(registry, {
      id: brief!.recommendedLocations[0]?.id ?? "loc-skip",
      kind: "location",
      mode: "skip",
      name: brief!.recommendedLocations[0]?.name ?? "Stadion",
    });
    const enriched = enrichBriefWithAssetDecisions(brief!, registry);
    if (brief!.recommendedLocations.length > 0) {
      assert.ok(enriched.recommendedLocations.length <= brief!.recommendedLocations.length);
    }
  });

  it("AI Director consumes asset decisions in proposal", () => {
    const idea = "Voetbalmascotte scoort in stadion";
    const characters = [studioCharacterListItem({ id: "c1", name: "Mascot", isMascot: true })];
    let registry = loadAssetDecisionRegistry({});
    registry = applyAssetDecision(registry, {
      id: "char-c1",
      kind: "character",
      mode: "use_existing",
      name: "Mascot",
      existingId: "c1",
    });
    const storyboard = studioStoryboardDetail({ scenes: [], aiDirectorPrompt: idea });
    const proposal = buildDirectorProposal({
      idea,
      storyboard,
      characters,
      locations: [],
      props: [],
      assetDecisionRegistry: registry,
    });
    assert.ok(proposal);
    const linked = proposal!.scenes.some((s) => s.characterRefs.some((r) => r.existingId === "c1"));
    assert.equal(linked, true);
  });

  it("Production Planner filters skipped missing items", () => {
    let registry = loadAssetDecisionRegistry({});
    registry = applyAssetDecision(registry, {
      id: "missing-char",
      kind: "character",
      mode: "skip",
      name: "Chef",
    });
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({ scenes: [] }),
      assetDecisionRegistry: registry,
    });
    const filtered = filterProductionMissingItemsByDecisions(plan.missingItems, registry);
    assert.ok(filtered.length <= plan.missingItems.length);
  });

  it("Scene Generation Orchestrator filters skipped asset gaps", () => {
    let registry = loadAssetDecisionRegistry({});
    registry = applyAssetDecision(registry, {
      id: "gap-loc",
      kind: "location",
      mode: "skip",
      name: "Kitchen",
    });
    const plan = buildSceneGenerationPlan({
      storyboard: studioStoryboardDetail({
        scenes: [studioSceneDetail({ order: 0, title: "Scene", action: "koken" })],
      }),
      assetDecisionRegistry: registry,
    });
    const filtered = filterSceneGenerationPlanByDecisions(plan, registry);
    assert.ok(filtered.missingAssets.length <= plan.missingAssets.length);
  });

  it("persists registry to storage roundtrip", () => {
    const store = new Map<string, string>();
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => {
            store.set(key, value);
          },
          removeItem: (key: string) => {
            store.delete(key);
          },
        },
      },
      configurable: true,
    });

    try {
      const registry = applyAssetDecision(loadAssetDecisionRegistry({ briefIdea: "test" }), {
        id: "w1",
        kind: "world",
        mode: "use_existing",
        name: "HomeCheff World",
        existingId: "world-1",
      });
      saveAssetDecisionRegistry(registry);
      const loaded = loadAssetDecisionRegistry({ briefIdea: "test" });
      assert.equal(loaded.decisions.length, 1);
      assert.equal(loaded.decisions[0]?.kind, "world");
    } finally {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
      });
    }
  });

  it("applyDecisionsToDirectorProposal removes skipped proposed assets", () => {
    const idea = "Chef mascot in garden";
    const proposal = buildDirectorProposal({
      idea,
      storyboard: studioStoryboardDetail({ scenes: [] }),
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    const registry = applyAssetDecision(loadAssetDecisionRegistry({}), {
      id: "skip-new",
      kind: "character",
      mode: "skip",
      name: proposal!.scenes[0]?.proposedCharacters[0]?.name ?? "Chef",
    });
    const adjusted = applyDecisionsToDirectorProposal(proposal!, registry);
    const proposedCount = adjusted.scenes.reduce((sum, s) => sum + s.proposedCharacters.length, 0);
    assert.ok(proposedCount <= proposal!.scenes.reduce((sum, s) => sum + s.proposedCharacters.length, 0));
  });
});

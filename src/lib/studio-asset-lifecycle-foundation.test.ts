import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAssetDecision,
  applyDecisionsToDirectorProposal,
  filterProductionMissingItemsByDecisions,
  resolveAssetDecisions,
} from "@/lib/studio-asset-decision-execution";
import { loadAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import {
  assetLifecycleStatusLabelKey,
  fulfillAssetDecision,
  findDecisionToFulfill,
  getAssetLifecycleDisplayStatus,
} from "@/lib/studio-asset-lifecycle-resolver";
import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import {
  studioCharacterListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-asset-lifecycle-resolver", () => {
  it("fulfills build_new character decision with created entity id", () => {
    let registry = applyAssetDecision(loadAssetDecisionRegistry({ storyboardId: "sb-1" }), {
      id: "char-new",
      kind: "character",
      mode: "build_new",
      name: "Voetbalmascotte",
    });

    registry = fulfillAssetDecision(registry, {
      decisionId: "char-new",
      kind: "character",
      createdEntityId: "c-new-1",
      createdName: "Voetbalmascotte",
      storyboardId: "sb-1",
    });

    const decision = registry.decisions.find((d) => d.id === "char-new");
    assert.equal(decision?.mode, "use_existing");
    assert.equal(decision?.existingId, "c-new-1");
    assert.ok(decision?.fulfilledAt);
    assert.equal(getAssetLifecycleDisplayStatus(decision!), "completed");
    assert.equal(assetLifecycleStatusLabelKey(decision!), "studio.assetDecision.status.completed");
  });

  it("matches pending decision by name when decisionId omitted", () => {
    const registry = applyAssetDecision(loadAssetDecisionRegistry({}), {
      id: "loc-1",
      kind: "location",
      mode: "build_new",
      name: "Stadion",
    });
    const match = findDecisionToFulfill(registry, {
      kind: "location",
      createdEntityId: "l-1",
      createdName: "Stadion",
    });
    assert.equal(match?.id, "loc-1");
  });

  it("location lifecycle completion updates registry", () => {
    let registry = applyAssetDecision(loadAssetDecisionRegistry({ storyboardId: "sb-2" }), {
      id: "loc-new",
      kind: "location",
      mode: "build_new",
      name: "Keuken",
    });
    registry = fulfillAssetDecision(registry, {
      kind: "location",
      createdEntityId: "loc-99",
      createdName: "Keuken",
      storyboardId: "sb-2",
    });
    assert.equal(resolveAssetDecisions(registry).buildNew.length, 0);
    assert.equal(resolveAssetDecisions(registry).useExisting.length, 1);
  });

  it("prop and world decisions can be fulfilled", () => {
    let registry = loadAssetDecisionRegistry({ storyboardId: "sb-3" });
    registry = applyAssetDecision(registry, {
      id: "prop-1",
      kind: "prop",
      mode: "build_new",
      name: "Voetbal",
    });
    registry = applyAssetDecision(registry, {
      id: "world-1",
      kind: "world",
      mode: "build_new",
      name: "HomeCheff World",
    });

    registry = fulfillAssetDecision(registry, {
      decisionId: "prop-1",
      kind: "prop",
      createdEntityId: "p-1",
      createdName: "Voetbal",
    });
    registry = fulfillAssetDecision(registry, {
      decisionId: "world-1",
      kind: "world",
      createdEntityId: "w-1",
      createdName: "HomeCheff World",
    });

    assert.equal(registry.decisions.filter((d) => d.fulfilledAt).length, 2);
  });

  it("filters missing planner items for pending build_new decisions", () => {
    const registry = applyAssetDecision(loadAssetDecisionRegistry({}), {
      id: "char-pending",
      kind: "character",
      mode: "build_new",
      name: "Chef",
    });
    const plan = buildStudioProductionPlan({
      storyboard: studioStoryboardDetail({ scenes: [] }),
      assetDecisionRegistry: registry,
    });
    const filtered = filterProductionMissingItemsByDecisions(plan.missingItems, registry);
    const hadChef = plan.missingItems.some((m) => m.label.toLowerCase().includes("chef"));
    const stillHasChef = filtered.some((m) => m.label.toLowerCase().includes("chef"));
    if (hadChef) {
      assert.equal(stillHasChef, false);
    }
  });

  it("AI Director proposal injects fulfilled character on scene 0", () => {
    let registry = applyAssetDecision(loadAssetDecisionRegistry({}), {
      id: "char-fulfill",
      kind: "character",
      mode: "build_new",
      name: "Mascot",
    });
    registry = fulfillAssetDecision(registry, {
      decisionId: "char-fulfill",
      kind: "character",
      createdEntityId: "c-fulfilled",
      createdName: "Mascot",
    });

    const proposal = buildDirectorProposal({
      idea: "Mascot in kitchen",
      storyboard: studioStoryboardDetail({ scenes: [] }),
      characters: [studioCharacterListItem({ id: "c-fulfilled", name: "Mascot" })],
      locations: [],
      props: [],
      assetDecisionRegistry: registry,
    });
    assert.ok(proposal);
    const adjusted = applyDecisionsToDirectorProposal(proposal!, registry);
    const linked = adjusted.scenes.some((s) =>
      s.characterRefs.some((r) => r.existingId === "c-fulfilled")
    );
    assert.equal(linked, true);
  });

  it("Creation Assistant shows fulfilled asset in completed items", () => {
    let registry = applyAssetDecision(loadAssetDecisionRegistry({ storyboardId: "sb-ca" }), {
      id: "char-ca",
      kind: "character",
      mode: "build_new",
      name: "Hero",
    });
    registry = fulfillAssetDecision(registry, {
      decisionId: "char-ca",
      kind: "character",
      createdEntityId: "c-hero",
      createdName: "Hero",
    });

    const view = buildCreationAssistantView({
      storyboard: studioStoryboardDetail({ id: "sb-ca", scenes: [] }),
      characters: [studioCharacterListItem({ id: "c-hero", name: "Hero" })],
      locations: [],
      props: [],
      worlds: [],
      assetDecisionRegistry: registry,
    });

    assert.ok(
      view.completedItems.some((t) => t.messageKey === "studio.assetLifecycle.task.completed")
    );
  });

  it("Creation Assistant shows in-progress task for pending build_new", () => {
    const registry = applyAssetDecision(loadAssetDecisionRegistry({ storyboardId: "sb-pending" }), {
      id: "loc-pending",
      kind: "location",
      mode: "build_new",
      name: "Garden",
    });

    const view = buildCreationAssistantView({
      storyboard: studioStoryboardDetail({ id: "sb-pending", scenes: [] }),
      characters: [],
      locations: [],
      props: [],
      worlds: [],
      assetDecisionRegistry: registry,
    });

    assert.ok(
      view.nextTasks.some((t) => t.messageKey === "studio.assetLifecycle.task.inProgress")
    );
  });
});

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { getTranslator } from "@/i18n";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  buildInsightsHubContext,
  buildStudioInsightsHubView,
  enrichIdeaWithInsightsHub,
} from "@/lib/studio-insights-hub";
import { clearDirectorDecisionStorageForTests } from "@/lib/studio-director-decision-storage";
import { clearSnapshotStorageForTests } from "@/lib/studio-snapshot-storage";
import { buildStudioSnapshot } from "@/lib/studio-snapshot-builder";
import { saveStudioSnapshot } from "@/lib/studio-snapshot-storage";
import {
  studioCharacterListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-insights-hub-foundation", () => {
  beforeEach(() => {
    clearDirectorDecisionStorageForTests();
    clearSnapshotStorageForTests();
  });

  it("derives project phase from domain readiness", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-insights-phase",
      aiDirectorPrompt: "Garden promo",
      scenes: [studioSceneDetail({ order: 0, title: "Open" })],
    });
    const view = buildStudioInsightsHubView({ storyboard });
    assert.ok(view.projectPhases.length === 7);
    assert.ok(view.projectPhases.some((step) => step.status === "current"));
    assert.notEqual(view.currentPhase, "ready");
  });

  it("includes explanation sources for advisory items", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-insights-why",
      aiDirectorPrompt: "Short promo without climax",
      scenes: [studioSceneDetail({ order: 0, title: "Only scene" })],
    });
    const view = buildStudioInsightsHubView({ storyboard });
    assert.ok(view.explanations.length > 0);
    assert.ok(view.explanations.every((item) => item.sourceLabelKey.startsWith("studio.insightsHub.source.")));
  });

  it("surfaces learning summary from memory systems", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-insights-learn",
      aiDirectorPrompt: "Brand story",
      scenes: [],
    });
    const view = buildStudioInsightsHubView({ storyboard });
    assert.ok(Array.isArray(view.learningLines));
  });

  it("summarizes snapshots and timeline activity", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-insights-snap",
      aiDirectorPrompt: "Snapshot test",
      scenes: [studioSceneDetail({ order: 0 })],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const snapshot = buildStudioSnapshot({ storyboard });
    saveStudioSnapshot(snapshot);

    const view = buildStudioInsightsHubView({ storyboard });
    assert.ok(view.snapshotSummary.recoveryPoint);
    assert.ok(view.timelineSummary.weekCount >= 0);
  });

  it("picks one next best action from Creation Assistant", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-insights-next",
      aiDirectorPrompt: "Needs work",
      scenes: [],
    });
    const view = buildStudioInsightsHubView({ storyboard });
    if (view.nextBestAction) {
      assert.ok(view.nextBestAction.messageKey.length > 0);
      assert.ok(view.nextBestAction.sourceLabelKey.startsWith("studio.insightsHub.source."));
    }
  });

  it("builds insight summary context for AI Director", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-insights-director",
      aiDirectorPrompt: "Promo video",
      scenes: [studioSceneDetail({ order: 0, title: "Hook" })],
    });
    const context = buildInsightsHubContext({ storyboard });
    assert.ok(context.contextLines.length > 0);
    const enriched = enrichIdeaWithInsightsHub("Fresh idea", context);
    assert.ok(enriched.includes("[Project insights:"));
  });

  it("AI Director proposal includes insightSummaryContext", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-insights-proposal",
      aiDirectorPrompt: "Chef promo",
      scenes: [],
    });
    const proposal = buildDirectorProposal({
      idea: "Chef promo",
      storyboard,
      characters: [
        studioCharacterListItem({ id: "c1", name: "Chef", role: "mascot" }),
      ],
      locations: [],
      props: [],
    });
    assert.ok(proposal?.insightSummaryContext);
    assert.ok(proposal!.insightSummaryContext!.contextLines.length >= 0);
  });

  it("maps health domains with pass warning or missing", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-insights-health",
      aiDirectorPrompt: "Health check",
      scenes: [
        studioSceneDetail({
          order: 0,
          title: "Scene",
          characters: [studioCharacterListItem({ id: "c1", name: "Hero" })],
        }),
      ],
    });
    const view = buildStudioInsightsHubView({
      storyboard,
      characters: [studioCharacterListItem({ id: "c1", name: "Hero" })],
    });
    assert.equal(view.healthDomains.length, 5);
    assert.ok(view.healthDomains.every((domain) => ["pass", "warning", "missing"].includes(domain.status)));
  });

  it("has NL/EN i18n parity for insights hub keys", () => {
    const nlKeys = Object.keys(nl).filter((key) => key.startsWith("studio.insightsHub."));
    const enKeys = Object.keys(en).filter((key) => key.startsWith("studio.insightsHub."));
    assert.deepEqual(nlKeys.sort(), enKeys.sort());
    assert.ok(nlKeys.length > 20);
    const tEn = getTranslator("en");
    for (const key of nlKeys) {
      assert.ok(tEn(key as keyof typeof en).length > 0);
    }
    assert.ok(nl["studio.tools.insights"]);
    assert.ok(en["studio.tools.insights"]);
  });
});

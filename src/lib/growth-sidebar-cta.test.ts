import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GROWTH_SIDEBAR_CTA_BLOCKS,
  pickGrowthSidebarCtaBlock,
  resolveGrowthCtaRecommendation,
} from "@/lib/growth-sidebar-cta";
import type { AssistantRecommendation } from "@/types/assistant-recommendation";

function mockRecommendation(id: string): AssistantRecommendation {
  return {
    id,
    emoji: "🎬",
    titleKey: "assistant.recommendation.goalCelebration.title",
    descriptionKey: "assistant.recommendation.goalCelebration.description",
    whyKey: "assistant.recommendation.goalCelebration.why",
    promptMessage: "Make a goal video",
    category: "for_you",
    status: "ready",
    score: 1,
  };
}

describe("growth-sidebar-cta", () => {
  it("rotates CTA blocks from session seed", () => {
    const a = pickGrowthSidebarCtaBlock("session-a");
    const b = pickGrowthSidebarCtaBlock("session-b");
    assert.ok(GROWTH_SIDEBAR_CTA_BLOCKS.some((row) => row.id === a.id));
    assert.ok(GROWTH_SIDEBAR_CTA_BLOCKS.some((row) => row.id === b.id));
  });

  it("returns stable block for same seed", () => {
    assert.deepEqual(pickGrowthSidebarCtaBlock("stable"), pickGrowthSidebarCtaBlock("stable"));
  });

  it("resolves recommendation by catalog id", () => {
    const block = GROWTH_SIDEBAR_CTA_BLOCKS[0]!;
    const recs = [mockRecommendation(block.recommendationId)];
    assert.equal(resolveGrowthCtaRecommendation(block, recs)?.id, block.recommendationId);
  });

  it("returns null when recommendation is not in current list", () => {
    const block = GROWTH_SIDEBAR_CTA_BLOCKS[0]!;
    assert.equal(resolveGrowthCtaRecommendation(block, []), null);
  });
});

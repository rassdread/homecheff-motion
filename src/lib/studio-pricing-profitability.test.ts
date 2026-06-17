import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyMarginPercent,
  computeActionPricingProfitability,
  getWorstPackEurPerCredit,
} from "@/lib/studio-pricing-profitability";
import { STUDIO_ACTION_COST_REGISTRY } from "@/server/studio-account/studio-action-cost-registry";

describe("studio-pricing-profitability", () => {
  it("worst pack is pack_8000", () => {
    const eur = getWorstPackEurPerCredit();
    assert.ok(eur > 0.006);
    assert.ok(eur < 0.007);
  });

  it("voice_clone at 400 credits is SAFE at worst pack", () => {
    const row = computeActionPricingProfitability({
      creditCost: 400,
      providerCostUsd: 1.0,
    });
    assert.equal(row.status, "SAFE");
    assert.ok(row.marginPercent >= 60);
  });

  it("voice_clone at 75 credits would be CRITICAL", () => {
    const row = computeActionPricingProfitability({
      creditCost: 75,
      providerCostUsd: 1.0,
    });
    assert.equal(row.status, "CRITICAL");
  });

  it("registry voice_clone default is 400", () => {
    assert.equal(STUDIO_ACTION_COST_REGISTRY.voice_clone.defaultCreditCost, 400);
  });

  it("classifies margin bands", () => {
    assert.equal(classifyMarginPercent(70), "SAFE");
    assert.equal(classifyMarginPercent(40), "LOW_MARGIN");
    assert.equal(classifyMarginPercent(-10), "NEGATIVE_MARGIN");
    assert.equal(classifyMarginPercent(-60), "CRITICAL");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveConversionSurface,
  resolveUsageLevel,
} from "@/lib/conversion-surface-engine";

describe("conversion surface engine", () => {
  it("resolveUsageLevel maps credit balance tiers", () => {
    assert.equal(resolveUsageLevel(150), "high");
    assert.equal(resolveUsageLevel(50), "medium");
    assert.equal(resolveUsageLevel(20), "low");
    assert.equal(resolveUsageLevel(0), "zero");
  });

  it("guest surface shows pricing only", () => {
    const surface = resolveConversionSurface({
      currentPlan: "free",
      availableCredits: 0,
      pageType: "homepage",
      loggedIn: false,
      usageLevel: "zero",
    });
    assert.equal(surface.showViewPricing, true);
    assert.equal(surface.showBuyCredits, false);
    assert.equal(surface.showUpgradePlan, false);
  });

  it("logged-in surface always offers buy credits", () => {
    const surface = resolveConversionSurface({
      currentPlan: "pro",
      availableCredits: 500,
      pageType: "studio_dashboard",
      loggedIn: true,
      usageLevel: "high",
    });
    assert.equal(surface.showBuyCredits, true);
    assert.equal(surface.showUpgradePlan, true);
  });

  it("blocks when estimated credits exceed balance", () => {
    const surface = resolveConversionSurface({
      currentPlan: "creator",
      availableCredits: 10,
      pageType: "motion",
      loggedIn: true,
      usageLevel: "low",
      estimatedCredits: 120,
    });
    assert.equal(surface.showInsufficientBlock, true);
  });

  it("usage page recommends upgrade on heavy usage", () => {
    const surface = resolveConversionSurface({
      currentPlan: "free",
      availableCredits: 400,
      pageType: "usage",
      loggedIn: true,
      usageLevel: "high",
      creditsUsedThisMonth: 250,
    });
    assert.equal(surface.showPromoCampaign, true);
    assert.equal(surface.promoPlanId, "pro");
  });
});

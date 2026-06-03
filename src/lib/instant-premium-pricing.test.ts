import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateInstantPremiumPriceCents,
  estimateInstantPremiumPriceEur,
  formatInstantPremiumPriceEur,
  instantPremiumPacingOptionsShareSamePrice,
  resolveInstantPremiumPricingSummary,
} from "@/lib/instant-premium-pricing";

describe("instant-premium-pricing", () => {
  it("maps image tiers to EUR prices", () => {
    assert.equal(estimateInstantPremiumPriceEur(2), 0.49);
    assert.equal(estimateInstantPremiumPriceEur(3), 0.99);
    assert.equal(estimateInstantPremiumPriceEur(4), 1.49);
    assert.equal(estimateInstantPremiumPriceEur(5), 1.99);
    assert.equal(estimateInstantPremiumPriceEur(6), 2.49);
  });

  it("converts to cents for Stripe", () => {
    assert.equal(estimateInstantPremiumPriceCents(2), 49);
    assert.equal(estimateInstantPremiumPriceCents(3), 99);
  });

  it("formats nl price labels", () => {
    assert.equal(formatInstantPremiumPriceEur(2, "nl"), "€0,49");
    assert.equal(formatInstantPremiumPriceEur(3, "en"), "€0.99");
  });

  it("scales price by provider duration not storyboard duration", () => {
    const baseline = estimateInstantPremiumPriceEur(9, { providerDurationSeconds: 40 });
    const shorter = estimateInstantPremiumPriceEur(9, { providerDurationSeconds: 42 });
    const storyboardInflated = estimateInstantPremiumPriceEur(9, { durationSeconds: 49 });
    assert.ok(shorter > baseline);
    assert.ok(storyboardInflated > shorter);
  });

  it("detects when pacing presets share the same EUR price", () => {
    const shared = instantPremiumPacingOptionsShareSamePrice(4, {
      instantMode: "story",
      sceneTexts: [
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        {},
      ],
    });
    assert.equal(shared, true);

    const varied = instantPremiumPacingOptionsShareSamePrice(4, {
      instantMode: "transition",
      sceneTexts: [],
    });
    assert.equal(varied, false);
  });

  it("resolveInstantPremiumPricingSummary scales price with provider seconds", () => {
    const fast = resolveInstantPremiumPricingSummary(4, {
      imageCount: 4,
      instantMode: "transition",
      transitionSeconds: 3,
    });
    const standard = resolveInstantPremiumPricingSummary(4, {
      imageCount: 4,
      instantMode: "transition",
      transitionSeconds: 5,
    });
    assert.ok(fast.providerDurationSeconds < standard.providerDurationSeconds);
    assert.ok(fast.priceEur < standard.priceEur);
    assert.equal(fast.pacingOptionsShareSamePrice, false);
  });
});

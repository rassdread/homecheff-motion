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
  it("uses V1 credit-tier prices for transition mode", () => {
    assert.equal(
      estimateInstantPremiumPriceEur(2, { instantMode: "transition" }),
      0.99
    );
    assert.equal(
      estimateInstantPremiumPriceEur(3, { instantMode: "transition" }),
      2.99
    );
    assert.equal(
      estimateInstantPremiumPriceEur(4, { instantMode: "transition" }),
      4.99
    );
  });

  it("converts to cents for Stripe", () => {
    assert.equal(
      estimateInstantPremiumPriceCents(2, { instantMode: "transition" }),
      99
    );
    assert.equal(
      estimateInstantPremiumPriceCents(3, { instantMode: "transition" }),
      299
    );
  });

  it("formats nl price labels", () => {
    assert.equal(
      formatInstantPremiumPriceEur(2, "nl", { instantMode: "transition" }),
      "€0,99"
    );
    assert.equal(
      formatInstantPremiumPriceEur(3, "en", { instantMode: "transition" }),
      "€2.99"
    );
  });

  it("admin users get free price", () => {
    assert.equal(estimateInstantPremiumPriceEur(5, { userRole: "admin" }), 0);
  });

  it("story mode uses higher tier prices", () => {
    const transition = estimateInstantPremiumPriceEur(4, { instantMode: "transition" });
    const story = estimateInstantPremiumPriceEur(4, { instantMode: "story" });
    assert.ok(story >= transition);
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

  it("resolveInstantPremiumPricingSummary includes pricing metadata", () => {
    const summary = resolveInstantPremiumPricingSummary(4, {
      imageCount: 4,
      instantMode: "transition",
      transitionSeconds: 5,
    });
    assert.ok(summary.priceEur > 0);
    assert.ok(summary.pricingRuleLabel.length > 0);
    assert.equal(summary.priceIsEstimate, true);
  });
});

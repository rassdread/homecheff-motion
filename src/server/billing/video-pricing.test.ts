import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteVideoPrice } from "@/server/billing/video-pricing";

describe("video-pricing V1", () => {
  it("transition mode tier 0-100 credits = €0.99", () => {
    const q = quoteVideoPrice({
      renderType: "transition_mode",
      creditsUsed: 80,
    });
    assert.equal(q.grossPriceEur, 0.99);
    assert.equal(q.pricingPlan, "v1");
  });

  it("story mode tier 301-600 = €4.99", () => {
    const q = quoteVideoPrice({
      renderType: "story_mode",
      creditsUsed: 450,
    });
    assert.equal(q.grossPriceEur, 4.99);
  });

  it("text rerender = €0.49", () => {
    const q = quoteVideoPrice({
      renderType: "text_rerender",
      actionType: "text_rerender",
      creditsUsed: 0,
    });
    assert.equal(q.grossPriceEur, 0.49);
  });

  it("admin user = free", () => {
    const q = quoteVideoPrice({
      renderType: "transition_mode",
      creditsUsed: 200,
      user: { role: "admin" },
    });
    assert.equal(q.netPriceEur, 0);
    assert.equal(q.isAdminFree, true);
  });

  it("language export = €0.99", () => {
    const q = quoteVideoPrice({
      renderType: "language_export",
      actionType: "language_export",
      creditsUsed: 0,
    });
    assert.equal(q.grossPriceEur, 0.99);
  });
});

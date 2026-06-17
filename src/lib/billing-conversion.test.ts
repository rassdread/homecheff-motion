import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateDaysRemaining,
  resolveLowCreditTier,
  pricePerCredit,
} from "@/lib/billing-conversion-utils";
import { getBillingConversionEventCounts } from "@/lib/billing-conversion-analytics";

describe("billing conversion utils", () => {
  it("resolveLowCreditTier at thresholds", () => {
    assert.equal(resolveLowCreditTier(150), null);
    assert.equal(resolveLowCreditTier(100), 100);
    assert.equal(resolveLowCreditTier(50), 100);
    assert.equal(resolveLowCreditTier(0), 20);
  });

  it("estimateDaysRemaining from usage", () => {
    assert.equal(estimateDaysRemaining({ availableCredits: 0, creditsUsedLast30Days: 30 }), 0);
    assert.equal(
      estimateDaysRemaining({ availableCredits: 100, creditsUsedLast30Days: 30 }),
      100
    );
    assert.equal(
      estimateDaysRemaining({ availableCredits: 100, creditsUsedLast30Days: 0 }),
      null
    );
  });

  it("pricePerCredit", () => {
    assert.equal(pricePerCredit(9.99, 1250), 0.008);
  });
});

describe("billing conversion analytics", () => {
  it("tracks event counts", () => {
    const counts = getBillingConversionEventCounts();
    assert.ok(typeof counts.buy_credits_clicked === "number");
    assert.ok(typeof counts.conversion_surface_impression === "number");
    assert.ok(typeof counts.pricing_view === "number");
    assert.ok(typeof counts.yearly_selected === "number");
    assert.ok(typeof counts.monthly_selected === "number");
  });
});

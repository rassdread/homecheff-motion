import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeCommercialGrossMargin,
  extractPurchaseMeta,
  resolveCreditPurchaseRevenueEur,
  stripeAmountTotalToEur,
  sumPackPurchaseRevenueEur,
} from "@/lib/studio-commercial-revenue";
import { USD_PER_CREDIT } from "@/lib/studio-credit-constants";

describe("studio commercial revenue (S.8E)", () => {
  it("never uses credits × USD_PER_CREDIT as EUR revenue", () => {
    const packs = new Map([["pack_500", 4.99]]);
    const resolved = resolveCreditPurchaseRevenueEur(
      {
        purchaseKey: "cs_test_1",
        packSlug: "pack_500",
        amountEurFromStripe: null,
        creditsDelta: 500,
      },
      packs
    );
    assert.equal(resolved.amountEur, 4.99);
    assert.notEqual(resolved.amountEur, 500 * USD_PER_CREDIT);
    assert.equal(resolved.source, "pack_catalog");
  });

  it("prefers Stripe amount_total over catalog", () => {
    const packs = new Map([["pack_500", 4.99]]);
    const resolved = resolveCreditPurchaseRevenueEur(
      {
        purchaseKey: "cs_test_2",
        packSlug: "pack_500",
        amountEurFromStripe: 3.99,
        creditsDelta: 500,
      },
      packs
    );
    assert.equal(resolved.amountEur, 3.99);
    assert.equal(resolved.source, "stripe_amount");
  });

  it("dedupes by purchase key and sums pack revenue", () => {
    const packs = new Map([
      ["pack_500", 4.99],
      ["pack_1250", 9.99],
    ]);
    const sum = sumPackPurchaseRevenueEur(
      [
        {
          purchaseKey: "cs_a",
          packSlug: "pack_500",
          amountEurFromStripe: 4.99,
          creditsDelta: 500,
        },
        {
          purchaseKey: "cs_a",
          packSlug: "pack_500",
          amountEurFromStripe: 4.99,
          creditsDelta: 500,
        },
        {
          purchaseKey: "cs_b",
          packSlug: "pack_1250",
          amountEurFromStripe: null,
          creditsDelta: 1250,
        },
      ],
      packs
    );
    assert.equal(sum.purchaseCount, 2);
    assert.equal(sum.packRevenueEur, 14.98);
    assert.equal(sum.stripeAmountCount, 1);
    assert.equal(sum.catalogFallbackCount, 1);
  });

  it("converts Stripe cents to EUR", () => {
    assert.equal(stripeAmountTotalToEur(499), 4.99);
    assert.equal(stripeAmountTotalToEur(null), null);
  });

  it("extracts amountEur from purchase metadata", () => {
    const meta = extractPurchaseMeta({
      stripeSessionId: "cs_x",
      packSlug: "pack_500",
      amountEur: 4.99,
    });
    assert.equal(meta.stripeSessionId, "cs_x");
    assert.equal(meta.amountEur, 4.99);
  });

  it("computes margin with FX — does not subtract USD from EUR raw", () => {
    const m = computeCommercialGrossMargin({
      grossRevenueEur: 10,
      providerCostUsd: 2.16,
      eurToUsd: 1.08,
    });
    assert.equal(m.providerCostEur, 2);
    assert.equal(m.netRevenueEur, 8);
    assert.equal(m.grossMarginPercent, 80);
  });
});

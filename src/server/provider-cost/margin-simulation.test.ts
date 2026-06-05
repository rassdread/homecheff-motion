import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  breakEvenPriceEur,
  simulateMarginAtPrice,
  simulateMarginsForPrices,
  summarizePortfolioMargins,
} from "@/server/provider-cost/margin-simulation";

describe("margin-simulation", () => {
  it("computes margin at sale price", () => {
    const row = simulateMarginAtPrice(0.5, 2.99, 1);
    assert.equal(row.revenueUsd, 2.99);
    assert.equal(row.marginUsd, 2.49);
    assert.equal(row.breakEven, true);
  });

  it("break-even price matches cost", () => {
    assert.equal(breakEvenPriceEur(1.5, 1), 1.5);
  });

  it("simulates all default price points", () => {
    const rows = simulateMarginsForPrices(1);
    assert.equal(rows.length, 4);
    assert.ok(rows.every((r) => r.salePriceEur > 0));
  });

  it("summarizes portfolio margins", () => {
    const summary = summarizePortfolioMargins([
      { netCostUsd: 0.5 },
      { netCostUsd: 5 },
    ]);
    assert.equal(summary.avgNetCostPerVideoUsd, 2.75);
    assert.equal(summary.profitableVideoCount + summary.lossMakingVideoCount, 2);
  });
});

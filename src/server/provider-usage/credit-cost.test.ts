import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CREDIT_UNIT_COST_USD,
  creditsToTotalCostUsd,
  resolveCreditAccuracy,
} from "@/server/provider-usage/credit-cost";

test("creditsToTotalCostUsd uses 0.005 per credit", () => {
  assert.equal(CREDIT_UNIT_COST_USD, 0.005);
  assert.equal(creditsToTotalCostUsd(100), 0.5);
  assert.equal(creditsToTotalCostUsd(60), 0.3);
});

test("resolveCreditAccuracy distinguishes exact estimated pending", () => {
  assert.equal(
    resolveCreditAccuracy({ isEstimated: false, creditsUsed: 60, completedAt: new Date() }),
    "exact"
  );
  assert.equal(
    resolveCreditAccuracy({ isEstimated: true, creditsUsed: 60, completedAt: new Date() }),
    "estimated"
  );
  assert.equal(
    resolveCreditAccuracy({ isEstimated: false, creditsUsed: null, completedAt: null }),
    "pending"
  );
});

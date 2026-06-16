import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSyncAssistantBillingPreview } from "@/lib/assistant-billing-awareness";
import {
  applyPlanCreditDiscount,
  carryModeAllowsRetention,
  resolveRegistryActionCreditCost,
  splitSpendFromBuckets,
} from "@/lib/studio-billing-sync";
import { applySubscriptionCancellationPolicy, evaluateCreditPolicy } from "@/server/studio-account/studio-credit-policy";
import { STUDIO_ACTION_COST_REGISTRY } from "@/server/studio-account/studio-action-cost-registry";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";
import { creditsNeverExpire } from "@/server/studio-account/studio-billing-policy-service";
import { mapPromotionGrantToOrigin } from "@/server/studio-account/studio-promotion-service";

describe("studio billing phase 1-8", () => {
  it("subscriptions do not grant monthly credits in plan config", () => {
    assert.equal(STUDIO_PLANS.creator.monthlyCredits, 0);
    assert.equal(STUDIO_PLANS.pro.monthlyCredits, 0);
    assert.equal(STUDIO_PLANS.studio.monthlyCredits, 0);
  });

  it("plan credit discount reduces registry cost", () => {
    const base = STUDIO_ACTION_COST_REGISTRY.motion_render.defaultCreditCost;
    const discounted = applyPlanCreditDiscount(base, STUDIO_PLANS.pro.creditDiscountPercent);
    assert.ok(discounted < base);
    assert.equal(discounted, Math.ceil(base * 0.85));
  });

  it("resolveRegistryActionCreditCost matches plan benefits", () => {
    const resolved = resolveRegistryActionCreditCost({
      actionType: "motion_render",
      planId: "studio",
    });
    assert.ok(resolved);
    assert.equal(resolved.discountPercent, 20);
    assert.equal(
      resolved.creditCost,
      applyPlanCreditDiscount(STUDIO_ACTION_COST_REGISTRY.motion_render.defaultCreditCost, 20)
    );
  });

  it("spend promotional bucket before purchased", () => {
    const split = splitSpendFromBuckets({ promotionalBalance: 30, purchasedBalance: 100 }, 50);
    assert.equal(split.fromPromotional, 30);
    assert.equal(split.fromPurchased, 20);
  });

  it("carry policy defaults to unlimited retention", () => {
    assert.equal(creditsNeverExpire("UNLIMITED"), true);
    assert.equal(carryModeAllowsRetention("UNLIMITED"), true);
    assert.equal(carryModeAllowsRetention("NONE"), false);
  });

  it("cancellation retains prepaid credits", () => {
    const policy = applySubscriptionCancellationPolicy({ creditPolicyVersion: "v1" });
    assert.equal(policy.billingStatus, "prepaid");
    assert.equal(policy.retainCredits, true);
  });

  it("promotion grant types map to credit origins", () => {
    assert.equal(mapPromotionGrantToOrigin("BETA"), "BETA");
    assert.equal(mapPromotionGrantToOrigin("COMPENSATION"), "COMPENSATION");
    assert.equal(mapPromotionGrantToOrigin("PROMOTIONAL"), "PROMOTIONAL");
  });

  it("evaluateCreditPolicy uses resolved credit cost when provided", () => {
    const result = evaluateCreditPolicy({
      userId: "u1",
      accountType: "creator",
      planVersion: "v1",
      creditPolicyVersion: "v1",
      billingStatus: "active",
      actionType: "motion_render",
      balance: 1000,
      reservedBalance: 0,
      autoChargeSmallActions: true,
      confirmAboveCredits: 100,
      resolvedCreditCost: 18,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.requiredCredits, 18);
    assert.equal(result.balanceAfter, 982);
  });

  it("assistant billing preview uses wallet balance and unified pricing", () => {
    const preview = buildSyncAssistantBillingPreview({
      actionType: "motion_render",
      planId: "pro",
      availableCredits: 881,
      locale: "nl",
    });
    assert.ok(preview.estimatedCredits > 0);
    assert.equal(preview.availableCredits, 881);
    assert.equal(preview.balanceAfter, 881 - preview.estimatedCredits);
    assert.match(preview.summaryNl, /Dit kost naar schatting/);
    assert.match(preview.summaryNl, /Je hebt 881 credits beschikbaar/);
  });

  it("assistant billing preview includes reuse savings when stadium asset exists", () => {
    const preview = buildSyncAssistantBillingPreview({
      actionType: "motion_render",
      availableCredits: 500,
      locale: "nl",
      studio: {
        route: { pathname: "/", module: "motion" },
        project: null,
        storyboardId: null,
        characters: [],
        assets: [{ assetId: "a1", assetName: "Ajax Stadion", kind: "location" }],
        preparedAssets: [],
        recentAssistantActions: [],
        unfinishedFlows: [],
        usageSummary: {},
        projectMemory: null,
      },
    });
    assert.ok(preview.savingsFromReuse.some((row) => row.creditsSaved === 6));
  });
});

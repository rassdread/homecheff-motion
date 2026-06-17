import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STUDIO_ACTION_COST_REGISTRY,
  STUDIO_ACTION_TYPES,
  listAllActionCosts,
} from "@/server/studio-account/studio-action-cost-registry";
import {
  applySubscriptionCancellationPolicy,
  evaluateCreditPolicy,
} from "@/server/studio-account/studio-credit-policy";
import { STUDIO_CREDIT_PACKS, getCreditPack } from "@/server/studio-account/studio-credit-packs";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";

function policyInput(overrides: Partial<Parameters<typeof evaluateCreditPolicy>[0]> = {}) {
  return {
    userId: "user-1",
    accountType: "free" as const,
    planVersion: "v1",
    creditPolicyVersion: "v1",
    billingStatus: "none",
    actionType: "ai_analysis",
    balance: 0,
    reservedBalance: 0,
    autoChargeSmallActions: true,
    confirmAboveCredits: 100,
    ...overrides,
  };
}

describe("studio credit policy", () => {
  it("free user blocked from AI action without credits", () => {
    const result = evaluateCreditPolicy(policyInput());
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "free_account_provider_action");
    assert.equal(result.upgradeSuggestion, "creator");
  });

  it("paid user can run small AI action", () => {
    const result = evaluateCreditPolicy(
      policyInput({
        accountType: "creator",
        billingStatus: "active",
        balance: 500,
        actionType: "ai_analysis",
      })
    );
    assert.equal(result.allowed, true);
    assert.equal(result.requiredCredits, STUDIO_ACTION_COST_REGISTRY.ai_analysis.defaultCreditCost);
    assert.ok(result.requiredCredits >= 1);
  });

  it("small action auto-charges without confirmation", () => {
    const result = evaluateCreditPolicy(
      policyInput({
        accountType: "creator",
        balance: 500,
        actionType: "ai_analysis",
        confirmAboveCredits: 100,
        autoChargeSmallActions: true,
      })
    );
    assert.equal(result.allowed, true);
    assert.equal(result.confirmationRequired, false);
  });

  it("big action requires confirmation", () => {
    const result = evaluateCreditPolicy(
      policyInput({
        accountType: "pro",
        balance: 5000,
        actionType: "motion_render",
        confirmAboveCredits: 100,
      })
    );
    assert.equal(result.allowed, true);
    assert.equal(result.confirmationRequired, true);
    assert.ok(result.requiredCredits >= 100);
  });

  it("insufficient credits blocks action", () => {
    const result = evaluateCreditPolicy(
      policyInput({
        accountType: "creator",
        balance: 0,
        actionType: "scene_generation",
      })
    );
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "insufficient_credits");
  });

  it("admin bypass allows action without credits", () => {
    const result = evaluateCreditPolicy(
      policyInput({
        role: "admin",
        balance: 0,
        actionType: "motion_render",
      })
    );
    assert.equal(result.allowed, true);
    assert.equal(result.requiredCredits, 0);
  });

  it("auto-charge off requires confirmation for small actions", () => {
    const result = evaluateCreditPolicy(
      policyInput({
        accountType: "creator",
        balance: 500,
        actionType: "ai_analysis",
        autoChargeSmallActions: false,
      })
    );
    assert.equal(result.allowed, true);
    assert.equal(result.confirmationRequired, true);
  });

  it("cancel subscription keeps credits under policy V1", () => {
    const policy = applySubscriptionCancellationPolicy({ creditPolicyVersion: "v1" });
    assert.equal(policy.billingStatus, "prepaid");
    assert.equal(policy.retainCredits, true);
  });
});

describe("studio action cost registry", () => {
  it("covers all Studio/Motion/Publish/Editor action types", () => {
    assert.equal(STUDIO_ACTION_TYPES.length, listAllActionCosts().length);
    const services = new Set(listAllActionCosts().map((e) => e.service));
    assert.ok(services.has("studio"));
    assert.ok(services.has("motion"));
    assert.ok(services.has("publish"));
    assert.ok(services.has("editor"));
  });

  it("every provider-cost action costs at least 1 credit", () => {
    for (const entry of listAllActionCosts()) {
      if (entry.requiresProviderCost) {
        assert.ok(entry.defaultCreditCost >= entry.minimumCreditCost);
        assert.ok(entry.minimumCreditCost >= 1);
      }
    }
  });

  it("motion render has high credit cost for confirmation threshold", () => {
    const motion = STUDIO_ACTION_COST_REGISTRY.motion_render;
    assert.ok(motion.defaultCreditCost >= 100);
  });

  it("voice clone is priced above provider cost for safe margin", () => {
    const voiceClone = STUDIO_ACTION_COST_REGISTRY.voice_clone;
    assert.equal(voiceClone.defaultCreditCost, 400);
    assert.equal(voiceClone.reservedCostUsd, 1.0);
    assert.equal(voiceClone.actualCostEstimateUsd, 1.0);
    assert.equal(voiceClone.confirmationCategory, "confirm");
  });
});

describe("studio plan and credit packs config", () => {
  it("plan config has version fields", () => {
    for (const plan of Object.values(STUDIO_PLANS)) {
      assert.equal(plan.planVersion, "v1");
      assert.equal(plan.creditPolicyVersion, "v1");
    }
  });

  it("credit packs are defined with expected start values", () => {
    assert.equal(STUDIO_CREDIT_PACKS.length, 4);
    const pack500 = getCreditPack("pack_500");
    assert.ok(pack500);
    assert.equal(pack500!.credits, 500);
    assert.equal(pack500!.priceEur, 4.99);
  });

  it("creator plan provides benefits not monthly credit grants", () => {
    assert.equal(STUDIO_PLANS.creator.monthlyCredits, 0);
    assert.equal(STUDIO_PLANS.creator.creditDiscountPercent, 10);
    assert.equal(STUDIO_PLANS.creator.monthlyPriceEur, 7.99);
    assert.equal(STUDIO_PLANS.pro.monthlyPriceEur, 24.99);
    assert.equal(STUDIO_PLANS.studio.monthlyPriceEur, 79.99);
  });
});

describe("wallet ledger invariants (pure)", () => {
  it("available balance never goes negative in policy output", () => {
    const result = evaluateCreditPolicy(
      policyInput({
        accountType: "creator",
        balance: 10,
        reservedBalance: 5,
        actionType: "ai_analysis",
      })
    );
    assert.ok(result.balanceAfter >= 0);
  });

  it("no negative balance when insufficient", () => {
    const result = evaluateCreditPolicy(
      policyInput({
        accountType: "creator",
        balance: 1,
        actionType: "motion_render",
      })
    );
    assert.equal(result.allowed, false);
    assert.equal(result.balanceAfter, 1);
  });
});

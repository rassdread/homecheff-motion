import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWizardCreditTransactionMetadata,
  markWizardTransactionRefunded,
  validateWizardCreditReservation,
} from "@/lib/wizard-credit-reservation";
import { resolveWizardWorkflowPrice } from "@/lib/wizard-workflow-pricing";

describe("wizard credit reservation", () => {
  it("passes when user has enough credits", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "character_upgrade",
      referenceCount: 1,
      cachedAnalysisCount: 0,
      userIsAdmin: false,
    });
    const result = validateWizardCreditReservation({
      price,
      creditsAvailable: price.totalCredits,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.metadata.status, "reserved");
      assert.equal(result.metadata.totalCredits, price.totalCredits);
    }
  });

  it("fails when credits are insufficient", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "genetic_blend",
      referenceCount: 2,
      cachedAnalysisCount: 0,
      userIsAdmin: false,
    });
    const result = validateWizardCreditReservation({
      price,
      creditsAvailable: 0,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "insufficient_credits");
    }
  });

  it("admin bypass skips payment requirement", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "product_branding",
      referenceCount: 1,
      cachedAnalysisCount: 0,
      userIsAdmin: true,
    });
    const result = validateWizardCreditReservation({ price, creditsAvailable: 0 });
    assert.equal(result.ok, true);
  });

  it("tracks refund metadata", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "future_child",
      referenceCount: 2,
      cachedAnalysisCount: 0,
      userIsAdmin: false,
    });
    const metadata = buildWizardCreditTransactionMetadata(price, "reserved");
    const refunded = markWizardTransactionRefunded(metadata, "analysis_failed");
    assert.equal(refunded.status, "refunded");
    assert.equal(refunded.failureReason, "analysis_failed");
  });
});

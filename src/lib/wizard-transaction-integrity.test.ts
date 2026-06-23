import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createWizardTransaction,
  registerWizardPremiumCapture,
  transitionWizardTransaction,
} from "@/lib/wizard-transaction-lifecycle";
import { resolveWizardWorkflowPrice } from "@/lib/wizard-workflow-pricing";
import { markWizardTransactionRefunded as markReservationRefunded } from "@/lib/wizard-credit-reservation";

describe("wizard transaction lifecycle", () => {
  it("tracks state transitions from CREATED to RESERVED to ANALYSIS_RUNNING", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "character_fusion",
      referenceCount: 2,
      cachedAnalysisCount: 0,
      userIsAdmin: false,
    });
    let record = createWizardTransaction(price);
    assert.equal(record.state, "CREATED");
    record = { ...record, state: "RESERVED", metadata: { ...record.metadata, status: "reserved" } };
    record = transitionWizardTransaction(record, "ANALYSIS_RUNNING");
    assert.equal(record.state, "ANALYSIS_RUNNING");
  });

  it("markWizardTransactionRefunded is wired in reservation + lifecycle modules", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "campaign_variant",
      referenceCount: 1,
      cachedAnalysisCount: 0,
      userIsAdmin: false,
    });
    const record = createWizardTransaction(price);
    const refunded = markReservationRefunded(record.metadata, "render_failed");
    assert.equal(refunded.status, "refunded");
  });

  it("registers premium capture sessions without duplicates", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "future_child",
      referenceCount: 1,
      cachedAnalysisCount: 0,
      userIsAdmin: false,
    });
    let record = createWizardTransaction(price);
    const session = {
      adminBypass: false,
      reservation: {
        reservationId: "res_1",
        requiredCredits: 5,
        service: "studio",
        provider: "openai",
        reservedCostUsd: 0.01,
        marginEstimate: 0.01,
      },
      creditsCharged: 5,
      creditStatus: "charged" as const,
      startedAt: new Date().toISOString(),
    };
    record = registerWizardPremiumCapture(record, session);
    record = registerWizardPremiumCapture(record, session);
    assert.equal(record.capturedPremiumSessions.length, 1);
  });
});

/**
 * Wizard credit pre-flight — validates total price before analysis/render pipeline starts.
 * Server-side reserve/capture/refund remains in studio-credit-authorization + premium vision billing.
 */

import type { WizardWorkflowPrice } from "@/lib/wizard-workflow-pricing";

export type WizardCreditTransactionStatus =
  | "pending"
  | "reserved"
  | "completed"
  | "refunded"
  | "failed";

export type WizardCreditTransactionMetadata = {
  workflowType: string;
  totalCredits: number;
  analysisCreditsIncluded: number;
  renderCreditsIncluded: number;
  cachedAnalysesUsed: number;
  referencesCount: number;
  status: WizardCreditTransactionStatus;
  transactionId: string;
  failureReason?: string;
  adminBypass: boolean;
};

export type WizardCreditReservationResult =
  | { ok: true; metadata: WizardCreditTransactionMetadata }
  | { ok: false; code: "insufficient_credits"; required: number; available: number };

function createTransactionId(): string {
  return `wiz_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function validateWizardCreditReservation(input: {
  price: WizardWorkflowPrice;
  creditsAvailable: number;
}): WizardCreditReservationResult {
  if (input.price.adminBypass || !input.price.requiresPayment) {
    return {
      ok: true,
      metadata: buildWizardCreditTransactionMetadata(input.price, "reserved"),
    };
  }

  if (input.creditsAvailable < input.price.totalCredits) {
    return {
      ok: false,
      code: "insufficient_credits",
      required: input.price.totalCredits,
      available: input.creditsAvailable,
    };
  }

  return {
    ok: true,
    metadata: buildWizardCreditTransactionMetadata(input.price, "reserved"),
  };
}

export function buildWizardCreditTransactionMetadata(
  price: WizardWorkflowPrice,
  status: WizardCreditTransactionStatus,
  failureReason?: string
): WizardCreditTransactionMetadata {
  return {
    workflowType: price.workflowType,
    totalCredits: price.totalCredits,
    analysisCreditsIncluded: price.analysisCredits,
    renderCreditsIncluded: price.renderCredits,
    cachedAnalysesUsed: price.cachedAnalysesUsed,
    referencesCount: price.referenceCount,
    status,
    transactionId: createTransactionId(),
    failureReason,
    adminBypass: price.adminBypass,
  };
}

export function markWizardTransactionCompleted(
  metadata: WizardCreditTransactionMetadata
): WizardCreditTransactionMetadata {
  return { ...metadata, status: "completed", failureReason: undefined };
}

export function markWizardTransactionRefunded(
  metadata: WizardCreditTransactionMetadata,
  failureReason: string
): WizardCreditTransactionMetadata {
  return { ...metadata, status: "refunded", failureReason };
}

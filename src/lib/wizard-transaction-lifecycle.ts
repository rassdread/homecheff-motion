/**
 * Unified wizard transaction lifecycle — correlates client pre-flight metadata
 * with premium analysis sessions and render outcomes for refund compensation.
 */

import { refundPremiumVisionCreditsClient } from "@/lib/editor-premium-vision-credits-client";
import type { PremiumVisionCreditSession } from "@/lib/editor-premium-vision-credits";
import {
  buildWizardCreditTransactionMetadata,
  markWizardTransactionCompleted,
  markWizardTransactionRefunded,
  type WizardCreditTransactionMetadata,
} from "@/lib/wizard-credit-reservation";
import type { WizardWorkflowPrice } from "@/lib/wizard-workflow-pricing";

export const WIZARD_TRANSACTION_STATES = [
  "CREATED",
  "RESERVED",
  "ANALYSIS_RUNNING",
  "ANALYSIS_COMPLETE",
  "RENDER_RUNNING",
  "CAPTURED",
  "REFUNDED",
  "FAILED",
] as const;

export type WizardTransactionState = (typeof WIZARD_TRANSACTION_STATES)[number];

export type WizardTransactionRecord = {
  state: WizardTransactionState;
  metadata: WizardCreditTransactionMetadata;
  capturedPremiumSessions: PremiumVisionCreditSession[];
  renderCaptured: boolean;
};

export function createWizardTransaction(price: WizardWorkflowPrice): WizardTransactionRecord {
  return {
    state: "CREATED",
    metadata: buildWizardCreditTransactionMetadata(price, "pending"),
    capturedPremiumSessions: [],
    renderCaptured: false,
  };
}

export function transitionWizardTransaction(
  record: WizardTransactionRecord,
  nextState: WizardTransactionState
): WizardTransactionRecord {
  const statusMap: Partial<
    Record<WizardTransactionState, WizardCreditTransactionMetadata["status"]>
  > = {
    RESERVED: "reserved",
    CAPTURED: "completed",
    REFUNDED: "refunded",
    FAILED: "failed",
  };
  const mapped = statusMap[nextState];
  return {
    ...record,
    state: nextState,
    metadata: mapped
      ? { ...record.metadata, status: mapped }
      : record.metadata,
  };
}

export function markWizardTransactionReserved(
  record: WizardTransactionRecord
): WizardTransactionRecord {
  return {
    ...record,
    state: "RESERVED",
    metadata: { ...record.metadata, status: "reserved" },
  };
}

export function registerWizardPremiumCapture(
  record: WizardTransactionRecord,
  session: PremiumVisionCreditSession | null | undefined
): WizardTransactionRecord {
  if (!session || session.adminBypass || session.creditStatus !== "charged") {
    return record;
  }
  if (record.capturedPremiumSessions.some((s) => s.reservation.reservationId === session.reservation.reservationId)) {
    return record;
  }
  return {
    ...transitionWizardTransaction(record, "ANALYSIS_COMPLETE"),
    capturedPremiumSessions: [...record.capturedPremiumSessions, session],
  };
}

export async function refundWizardCapturedPremiumSessions(
  record: WizardTransactionRecord,
  failureReason: string
): Promise<WizardTransactionRecord> {
  if (record.metadata.adminBypass || record.capturedPremiumSessions.length === 0) {
    return transitionWizardTransaction(
      {
        ...record,
        metadata: markWizardTransactionRefunded(record.metadata, failureReason),
      },
      "REFUNDED"
    );
  }

  for (const session of record.capturedPremiumSessions) {
    if (session.creditStatus === "charged") {
      await refundPremiumVisionCreditsClient(session);
    }
  }

  return transitionWizardTransaction(
    {
      ...record,
      capturedPremiumSessions: [],
      metadata: markWizardTransactionRefunded(record.metadata, failureReason),
    },
    "REFUNDED"
  );
}

export async function compensateWizardPipelineFailure(input: {
  record: WizardTransactionRecord;
  failureReason: string;
  renderFailed: boolean;
}): Promise<WizardTransactionRecord> {
  if (input.renderFailed && input.record.capturedPremiumSessions.length > 0) {
    return refundWizardCapturedPremiumSessions(input.record, input.failureReason);
  }
  if (input.failureReason.startsWith("analysis")) {
    return transitionWizardTransaction(
      {
        ...input.record,
        metadata: markWizardTransactionRefunded(input.record.metadata, input.failureReason),
      },
      "FAILED"
    );
  }
  return transitionWizardTransaction(
    {
      ...input.record,
      metadata: markWizardTransactionRefunded(input.record.metadata, input.failureReason),
    },
    "FAILED"
  );
}

export function markWizardTransactionCaptureComplete(
  record: WizardTransactionRecord
): WizardTransactionRecord {
  return {
    ...transitionWizardTransaction(record, "CAPTURED"),
    renderCaptured: true,
    metadata: markWizardTransactionCompleted(record.metadata),
  };
}

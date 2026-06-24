/**
 * Production settlement — capture used portion or refund unused on failure.
 * Enforces: Estimate → Reserve → Execute → Capture | Refund
 */

import {
  captureStudioActionReservation,
  refundStudioActionReservation,
} from "@/server/studio-account/studio-credit-authorization";
import { patchProductionTransaction } from "@/lib/studio-production-transaction";
import { readOrchestratorState, writeOrchestratorState } from "@/lib/studio-production-orchestrator";
import { appendProductionLedgerEntry } from "@/server/studio/production-ledger";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { ProductionTransaction } from "@/types/studio-video-production";

export type ProductionSettlementInput = {
  userId: string;
  project: HomeCheffProjectPackage;
  outcome: "complete" | "fail";
  /** Fraction of work completed 0–1 (for partial capture). */
  completedFraction?: number;
  providerCostEventIds?: string[];
  consumedCogsUsd?: number;
  errorMessage?: string;
};

export type ProductionSettlementResult = {
  ok: boolean;
  capturedCredits: number;
  refundedCredits: number;
  project: HomeCheffProjectPackage;
  transaction: ProductionTransaction;
};

export async function settleProductionContract(
  input: ProductionSettlementInput
): Promise<ProductionSettlementResult> {
  const state = readOrchestratorState(input.project);
  const transaction = state.productionTransaction;
  const contract = state.videoPlanContract;
  const reservationId = state.workflowReservation?.reservationId ?? transaction?.reservationId;

  if (!transaction || !reservationId) {
    throw new Error("No active production transaction to settle.");
  }

  if (transaction.captured || transaction.refunded) {
    return {
      ok: true,
      capturedCredits: transaction.captured ? transaction.totalCredits : 0,
      refundedCredits: transaction.refunded ? transaction.totalCredits : 0,
      project: input.project,
      transaction,
    };
  }

  const totalCredits = transaction.totalCredits;
  const fraction = Math.min(1, Math.max(0, input.completedFraction ?? 0));
  let capturedCredits = 0;
  let refundedCredits = 0;

  let nextTx = patchProductionTransaction(transaction, {
    providerCostEventIds: input.providerCostEventIds ?? transaction.providerCostEventIds,
    consumedCogsUsd: input.consumedCogsUsd ?? transaction.consumedCogsUsd,
  });

  if (input.outcome === "complete" || fraction >= 0.95) {
    await captureStudioActionReservation({
      userId: input.userId,
      reservation: {
        reservationId,
        requiredCredits: totalCredits,
        service: "studio",
        provider: "orchestrator",
        reservedCostUsd: contract?.estimatedCogsUsd ?? 0,
        marginEstimate: contract?.grossMarginAtWorstPack ?? 0,
      },
      projectId: transaction.hcProjectId,
      providerCostUsd: input.consumedCogsUsd,
      metadataJson: {
        productionComplete: true,
        contractId: contract?.id,
        providerCostEventIds: input.providerCostEventIds,
      },
    });
    capturedCredits = totalCredits;
    nextTx = patchProductionTransaction(nextTx, {
      captured: true,
      phase: "completed",
      settledAt: new Date().toISOString(),
    });

    if (contract) {
      await appendProductionLedgerEntry({
        userId: input.userId,
        hcProjectId: transaction.hcProjectId,
        contractId: contract.id,
        labelKey: "studio.ledger.production",
        credits: totalCredits,
        phase: "rendering",
        reservationId,
        captured: true,
        providerCostEventIds: input.providerCostEventIds ?? [],
      });
    }
  } else if (fraction <= 0.05) {
    await refundStudioActionReservation({
      userId: input.userId,
      reservation: {
        reservationId,
        requiredCredits: totalCredits,
        service: "studio",
        provider: "orchestrator",
        reservedCostUsd: 0,
        marginEstimate: 0,
      },
      projectId: transaction.hcProjectId,
      failedGeneration: true,
      metadataJson: {
        contractId: contract?.id,
        error: input.errorMessage,
        providerCostEventIds: input.providerCostEventIds,
      },
    });
    refundedCredits = totalCredits;
    nextTx = patchProductionTransaction(nextTx, {
      refunded: true,
      phase: "refunded",
      settledAt: new Date().toISOString(),
    });
  } else {
    const captureAmount = Math.max(1, Math.ceil(totalCredits * fraction));
    const refundAmount = Math.max(0, totalCredits - captureAmount);

    await captureStudioActionReservation({
      userId: input.userId,
      reservation: {
        reservationId,
        requiredCredits: captureAmount,
        service: "studio",
        provider: "orchestrator",
        reservedCostUsd: (input.consumedCogsUsd ?? 0) * fraction,
        marginEstimate: contract?.grossMarginAtWorstPack ?? 0,
      },
      projectId: transaction.hcProjectId,
      providerCostUsd: input.consumedCogsUsd,
      metadataJson: {
        partialCapture: true,
        completedFraction: fraction,
        contractId: contract?.id,
      },
    });
    capturedCredits = captureAmount;

    if (refundAmount > 0) {
      await refundStudioActionReservation({
        userId: input.userId,
        reservation: {
          reservationId,
          requiredCredits: refundAmount,
          service: "studio",
          provider: "orchestrator",
          reservedCostUsd: 0,
          marginEstimate: 0,
        },
        projectId: transaction.hcProjectId,
        failedGeneration: true,
        metadataJson: { partialRefund: true, completedFraction: fraction },
      });
      refundedCredits = refundAmount;
    }

    nextTx = patchProductionTransaction(nextTx, {
      captured: true,
      phase: "completed",
      settledAt: new Date().toISOString(),
      consumedCredits: captureAmount,
    });
  }

  const nextProject = writeOrchestratorState(input.project, {
    productionTransaction: nextTx,
    lifecycle: input.outcome === "complete" ? "completed" : "failed",
    status: input.outcome === "complete" ? "completed" : "failed",
    productionError: input.errorMessage?.slice(0, 500),
  });

  return {
    ok: true,
    capturedCredits,
    refundedCredits,
    project: nextProject,
    transaction: nextTx,
  };
}

/** Estimate completed fraction from production execution batches. */
export function estimateProductionCompletedFraction(project: HomeCheffProjectPackage): number {
  const state = readOrchestratorState(project);
  const batches = state.productionExecution?.batches ?? [];
  if (batches.length === 0) return 0;
  const completed = batches.filter((b) => b.status === "completed").length;
  return completed / batches.length;
}

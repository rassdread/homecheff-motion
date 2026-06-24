/**
 * Production project ledger — every contract charge traces to ledger entries.
 */

import { prisma } from "@/lib/prisma";
import { createStudioWorkflowTransactionId } from "@/lib/studio-analysis-planner";
import type { ProductionLedgerEntry, ProductionProjectLedger } from "@/types/studio-video-plan-contract";

export async function appendProductionLedgerEntry(input: {
  userId: string;
  hcProjectId: string;
  contractId: string;
  labelKey: string;
  credits: number;
  phase: ProductionLedgerEntry["phase"];
  reservationId?: string;
  captured: boolean;
  refunded?: boolean;
  providerCostEventIds?: string[];
}): Promise<void> {
  await prisma.studioLedgerEntry.create({
    data: {
      userId: input.userId,
      projectId: input.hcProjectId,
      service: "studio",
      actionType: input.captured ? "usage_capture" : input.refunded ? "usage_refund" : "usage_reservation",
      creditsDelta: input.captured ? -input.credits : input.refunded ? input.credits : 0,
      balanceAfter: 0,
      provider: "orchestrator",
      metadataJson: {
        contractId: input.contractId,
        labelKey: input.labelKey,
        phase: input.phase,
        reservationId: input.reservationId,
        providerCostEventIds: input.providerCostEventIds ?? [],
        ledgerKind: "production_contract",
      },
    },
  });
}

export async function loadProductionProjectLedger(
  userId: string,
  hcProjectId: string
): Promise<ProductionProjectLedger> {
  const rows = await prisma.studioLedgerEntry.findMany({
    where: {
      userId,
      projectId: hcProjectId,
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const entries: ProductionLedgerEntry[] = rows
    .filter((r) => {
      const meta = r.metadataJson as { ledgerKind?: string } | null;
      return meta?.ledgerKind === "production_contract";
    })
    .map((r) => {
      const meta = r.metadataJson as {
        contractId?: string;
        labelKey?: string;
        phase?: ProductionLedgerEntry["phase"];
        reservationId?: string;
        providerCostEventIds?: string[];
      };
      return {
        id: r.id,
        contractId: meta.contractId ?? "",
        labelKey: meta.labelKey ?? "studio.ledger.entry",
        credits: Math.abs(r.creditsDelta),
        phase: meta.phase ?? "post_production",
        reservationId: meta.reservationId,
        captured: r.actionType === "usage_capture",
        refunded: r.actionType === "usage_refund",
        providerCostEventIds: meta.providerCostEventIds ?? [],
        createdAt: r.createdAt.toISOString(),
      };
    });

  return {
    hcProjectId,
    entries,
    totalCredits: entries.filter((e) => e.captured).reduce((s, e) => s + e.credits, 0),
    updatedAt: new Date().toISOString(),
  };
}

export function createLedgerEntryId(): string {
  return createStudioWorkflowTransactionId();
}

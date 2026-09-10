/**
 * Read-only Studio billing reconciliation helper.
 * Does not mutate wallets.
 */

import { prisma } from "@/lib/prisma";

export type StudioBillingReconciliationRow = {
  code: "EARLY_CAPTURE_HOLD_MISSING" | "HOLD_PENDING" | "HOLD_FINAL";
  animationProjectId: string;
  detail: string;
};

export async function listMotionCreditHolds(ownerId: string, limit = 50) {
  return prisma.studioGenerationJob.findMany({
    where: {
      ownerId,
      capability: "VIDEO_GENERATE",
      idempotencyKey: { startsWith: "motion-credit-hold:" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      chargeFinalized: true,
      creditsReserved: true,
      creditsCharged: true,
      creditReservationId: true,
      idempotencyKey: true,
      metadataJson: true,
    },
  });
}

export function classifyMotionHold(row: {
  chargeFinalized: boolean;
  status: string;
  idempotencyKey: string;
}): StudioBillingReconciliationRow {
  const animationProjectId = row.idempotencyKey.replace(/^motion-credit-hold:/, "");
  if (row.chargeFinalized) {
    return {
      code: "HOLD_FINAL",
      animationProjectId,
      detail: `final status=${row.status}`,
    };
  }
  return {
    code: "HOLD_PENDING",
    animationProjectId,
    detail: "reservation awaiting provider terminal state",
  };
}

/**
 * Finalize pending ProviderCostEvent rows when a render is cancelled.
 */

import { prisma } from "@/lib/prisma";
import {
  CANCEL_COST_PENDING_REASON,
  type CancelCostEventRow,
} from "@/lib/render-cancel-credits";
import { getViduCreditBalance } from "@/server/video-providers/vidu-credits";
import { syncCustomerBillingFromCostEvent } from "@/server/billing/sync-billing-from-cost";
import { COST_ACTION, UNIT_COST_USD } from "@/server/provider-cost/cost-event-types";

async function fetchViduBalance(): Promise<number | null> {
  const result = await getViduCreditBalance({ bypassCache: true });
  return result.ok && result.credits != null ? result.credits : null;
}

export async function finalizeCancelledCostEventsForProject(
  projectId: string,
  providerJobIds: string[]
): Promise<CancelCostEventRow[]> {
  const uniqueJobIds = [...new Set(providerJobIds.map((id) => id.trim()).filter(Boolean))];
  const pendingEvents = await prisma.providerCostEvent.findMany({
    where: {
      projectId,
      provider: "vidu",
      actionType: COST_ACTION.VIDU_RENDER,
      status: "pending",
      ...(uniqueJobIds.length > 0 ?
        { OR: [{ relatedJobId: { in: uniqueJobIds } }, { providerJobId: { in: uniqueJobIds } }] }
      : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  if (pendingEvents.length === 0) {
    return [];
  }

  const balanceAfter = await fetchViduBalance();
  const updated: CancelCostEventRow[] = [];

  for (const event of pendingEvents) {
    let unitsUsed: number | null = null;
    let status = "cancelled";
    let isEstimated = event.isEstimated;
    let estimateReason = event.estimateReason;

    if (event.balanceBefore != null && balanceAfter != null) {
      unitsUsed = Math.max(0, event.balanceBefore - balanceAfter);
      isEstimated = false;
      estimateReason = null;
    } else if (event.balanceBefore != null && balanceAfter == null) {
      status = "pending_cost_check";
      isEstimated = true;
      estimateReason = CANCEL_COST_PENDING_REASON;
    } else {
      isEstimated = true;
      estimateReason = estimateReason ?? CANCEL_COST_PENDING_REASON;
    }

    const internalCostUsd =
      unitsUsed != null ? unitsUsed * (event.unitCostUsd || UNIT_COST_USD.vidu_credit) : null;

    await prisma.providerCostEvent.update({
      where: { id: event.id },
      data: {
        status,
        balanceAfter,
        unitsUsed,
        internalCostUsd,
        totalCostUsd: internalCostUsd,
        providerJobId: event.providerJobId ?? event.relatedJobId,
        isEstimated,
        estimateReason,
        completedAt: new Date(),
      },
    });

    await syncCustomerBillingFromCostEvent(event.id).catch((err) => {
      console.error("[billing] finalizeCancelledCostEventsForProject", err);
    });

    updated.push({
      id: event.id,
      providerJobId: event.providerJobId ?? event.relatedJobId,
      balanceBefore: event.balanceBefore,
      balanceAfter,
      unitsUsed,
      status,
      isEstimated,
      estimateReason,
    });
  }

  return updated;
}

/**
 * Per-project cost summary for video detail — user sees gross/credits; admin sees internal costs.
 */

import { prisma } from "@/lib/prisma";
import {
  resolveCostAccuracy,
  type CostAccuracy,
} from "@/server/provider-cost/cost-event-types";
import { resolveEurToUsdRate } from "@/server/provider-cost/margin-simulation";
import type { ProjectVideoCostSummary } from "@/types/project-video-cost";

function usdToEur(usd: number): number {
  return Math.round((usd / resolveEurToUsdRate()) * 100) / 100;
}

export async function loadProjectVideoCostSummary(params: {
  projectId: string;
  isAdmin: boolean;
}): Promise<ProjectVideoCostSummary | null> {
  const [costEvents, billingEvents] = await Promise.all([
    prisma.providerCostEvent.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customerBillingEvent.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (costEvents.length === 0 && billingEvents.length === 0) {
    return null;
  }

  let creditsUsed = 0;
  let internalCostUsd = 0;
  let exactCostUsd = 0;
  let estimatedCostUsd = 0;
  let pendingCount = 0;

  for (const e of costEvents) {
    const units = e.unitsUsed ?? 0;
    const cost = e.internalCostUsd ?? e.totalCostUsd ?? 0;
    if (e.unitType === "credits" && units > 0) {
      creditsUsed += units;
    }
    internalCostUsd += cost;
    const accuracy = resolveCostAccuracy(e);
    if (accuracy === "exact") {
      exactCostUsd += cost;
    } else if (accuracy === "estimated") {
      estimatedCostUsd += cost;
    } else {
      pendingCount += 1;
    }
  }

  let grossPriceEur = 0;
  let netPriceEur = 0;
  let isAdminFree = false;
  let billingEstimated = false;

  for (const b of billingEvents) {
    grossPriceEur += b.grossPriceEur;
    netPriceEur += b.netPriceEur;
    if (b.isAdminFree) {
      isAdminFree = true;
    }
    if (b.isEstimated) {
      billingEstimated = true;
    }
    const meta = (b.metadataJson as { creditsUsed?: number } | null) ?? {};
    if (meta.creditsUsed && creditsUsed === 0) {
      creditsUsed += meta.creditsUsed;
    }
  }

  grossPriceEur = Math.round(grossPriceEur * 100) / 100;
  netPriceEur = Math.round(netPriceEur * 100) / 100;
  internalCostUsd = Math.round(internalCostUsd * 10000) / 10000;

  const internalCostEur = usdToEur(internalCostUsd);
  const marginEur = Math.round((netPriceEur - internalCostEur) * 100) / 100;
  const marginPercent =
    netPriceEur > 0 ? Math.round((marginEur / netPriceEur) * 1000) / 10 : 0;

  let costAccuracy: CostAccuracy = "exact";
  if (pendingCount > 0) {
    costAccuracy = "pending";
  } else if (estimatedCostUsd > 0 && exactCostUsd === 0) {
    costAccuracy = "estimated";
  } else if (estimatedCostUsd > 0) {
    costAccuracy = "estimated";
  }

  const summary: ProjectVideoCostSummary = {
    creditsUsed: Math.round(creditsUsed),
    grossPriceEur,
    netPriceEur,
    isAdminFree,
    isEstimated: billingEstimated || costAccuracy !== "exact",
    costAccuracy,
    eventCount: costEvents.length,
    billingEventCount: billingEvents.length,
    status: pendingCount > 0 ? "pending" : costEvents.some((e) => e.status === "failed") ? "partial" : "complete",
  };

  if (params.isAdmin) {
    summary.internalCostUsd = internalCostUsd;
    summary.internalCostEur = internalCostEur;
    summary.marginEur = marginEur;
    summary.marginPercent = marginPercent;
    summary.exactCostUsd = Math.round(exactCostUsd * 10000) / 10000;
    summary.estimatedCostUsd = Math.round(estimatedCostUsd * 10000) / 10000;
    summary.providerEvents = costEvents.slice(0, 20).map((e) => ({
      id: e.id,
      provider: e.provider,
      actionType: e.actionType,
      status: e.status,
      unitsUsed: e.unitsUsed,
      unitType: e.unitType,
      totalCostUsd: e.totalCostUsd ?? e.internalCostUsd,
      isEstimated: e.isEstimated,
      costAccuracy: resolveCostAccuracy(e),
      completedAt: e.completedAt?.toISOString() ?? null,
      relatedJobId: e.relatedJobId,
    }));
  }

  return summary;
}

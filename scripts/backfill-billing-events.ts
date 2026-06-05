/**
 * Backfill ProviderCostEvent + CustomerBillingEvent from legacy render data.
 * Run: npx tsx scripts/backfill-billing-events.ts
 */

import { prisma } from "@/lib/prisma";
import { loadRenderCreditDataset } from "@/server/admin/render-analytics-credits";
import { createCustomerBillingEvent } from "@/server/billing/customer-billing-events";
import { CREDIT_UNIT_COST_USD } from "@/server/provider-usage/credit-cost";
import { resolveRenderTypeForProject } from "@/server/provider-usage/provider-usage-log";

async function main() {
  const creditRows = await loadRenderCreditDataset();
  let created = 0;
  let skipped = 0;

  for (const row of creditRows) {
    const existing = await prisma.providerCostEvent.findFirst({
      where: {
        OR: [
          { providerJobId: row.providerJobId ?? undefined },
          {
            relatedJobId: row.providerJobId ?? undefined,
            actionType: "vidu_render",
          },
        ],
      },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const costEvent = await prisma.providerCostEvent.create({
      data: {
        provider: row.provider,
        actionType: "vidu_render",
        projectId: row.projectId,
        userId: row.userId,
        providerJobId: row.providerJobId,
        relatedJobId: row.providerJobId,
        balanceBefore: row.creditsBefore,
        balanceAfter: row.creditsAfter,
        unitsUsed: row.creditsUsed,
        unitType: "credits",
        unitCostUsd: row.creditUnitCostUsd || CREDIT_UNIT_COST_USD,
        internalCostUsd: row.totalCostUsd,
        totalCostUsd: row.totalCostUsd,
        status: row.status,
        isEstimated: row.isEstimated,
        needsReview: row.needsReview,
        estimateReason: row.estimateReason ?? "Backfilled from existing render metadata",
        metadataJson: { renderType: row.renderType },
        startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
        completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: row.userId },
      select: { role: true },
    });

    const renderType = resolveRenderTypeForProject({
      projectType: "instant",
      instantMode: row.renderType.includes("story") ? "story" : "transition",
      sourceProjectId: row.renderType === "concept_render" ? "x" : null,
    });

    await createCustomerBillingEvent({
      userId: row.userId,
      projectId: row.projectId,
      providerCostEventId: costEvent.id,
      actionType: "vidu_render",
      renderType: renderType.includes("story") ? "story_mode" : "transition_mode",
      creditsUsed: row.creditsUsed,
      internalCostUsd: row.totalCostUsd,
      status: row.status === "completed" ? "completed" : row.status,
      user: { role: user?.role ?? "user" },
      isEstimated: true,
      metadataJson: { backfill: true, pricingRuleLabel: "V1 estimated backfill" },
    });

    created += 1;
  }

  console.info("[backfill-billing]", { created, skipped, total: creditRows.length });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

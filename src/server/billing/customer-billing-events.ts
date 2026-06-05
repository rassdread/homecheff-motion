/**
 * Customer-facing billing events — gross prices only (no internal cost in user APIs).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  quoteVideoPrice,
  type BillingUserContext,
  type PriceQuote,
} from "@/server/billing/video-pricing";
import type {
  VideoPricingActionType,
  VideoRenderType,
} from "@/server/billing/video-pricing-config";
import { PRICING_PLAN_V1 } from "@/server/billing/video-pricing-config";

export type CreateBillingEventInput = {
  userId: string;
  projectId?: string | null;
  providerCostEventId?: string | null;
  actionType: string;
  renderType: VideoRenderType;
  creditsUsed: number;
  internalCostUsd?: number;
  status?: string;
  user?: BillingUserContext;
  isEstimated?: boolean;
  metadataJson?: Prisma.InputJsonValue;
  exportIncluded?: boolean;
};

function mapActionToRenderType(actionType: string, renderType?: string): VideoRenderType {
  if (renderType) {
    return renderType as VideoRenderType;
  }
  if (actionType === "text_rerender") {
    return "text_rerender";
  }
  if (actionType === "language_export") {
    return "language_export";
  }
  if (actionType === "video_export" || actionType === "full_export") {
    return "full_export";
  }
  return "transition_mode";
}

/** Create or update customer billing row linked to a provider cost event. */
export async function createCustomerBillingEvent(
  input: CreateBillingEventInput
): Promise<string> {
  const renderType = mapActionToRenderType(input.actionType, input.renderType);
  const billingAction: VideoPricingActionType =
    input.actionType === "video_export" || input.actionType === "full_export" ?
      "full_export"
    : input.actionType === "text_rerender" ? "text_rerender"
    : input.actionType === "language_export" ? "language_export"
    : "vidu_render";

  const quote = quoteVideoPrice({
    renderType,
    actionType: billingAction,
    creditsUsed: input.creditsUsed,
    internalCostUsd: input.internalCostUsd,
    user: input.user,
    exportIncluded: input.exportIncluded,
  });

  if (input.providerCostEventId) {
    const existing = await prisma.customerBillingEvent.findFirst({
      where: { providerCostEventId: input.providerCostEventId },
      select: { id: true },
    });
    if (existing) {
      await prisma.customerBillingEvent.update({
        where: { id: existing.id },
        data: billingDataFromQuote(quote, input),
      });
      return existing.id;
    }
  }

  const row = await prisma.customerBillingEvent.create({
    data: billingDataFromQuote(quote, input),
  });
  return row.id;
}

function billingDataFromQuote(
  quote: PriceQuote,
  input: CreateBillingEventInput
): Prisma.CustomerBillingEventUncheckedCreateInput {
  const status = input.status ?? "completed";
  return {
    userId: input.userId,
    projectId: input.projectId ?? null,
    providerCostEventId: input.providerCostEventId ?? null,
    actionType: input.actionType,
    renderType: quote.renderType,
    customerUnits: 1,
    unitType: "action",
    unitPriceEur: quote.netPriceEur,
    grossPriceEur: quote.grossPriceEur,
    discountEur: quote.discountEur,
    netPriceEur: quote.netPriceEur,
    currency: "EUR",
    pricingPlan: quote.pricingPlan ?? PRICING_PLAN_V1,
    pricingRuleLabel: quote.pricingRuleLabel,
    marginMode: "tiered",
    status,
    isTestMode: quote.isTestMode,
    isAdminFree: quote.isAdminFree,
    isEstimated: input.isEstimated ?? quote.isEstimated,
    metadataJson: {
      creditsUsed: quote.creditsUsed,
      pricingRuleLabel: quote.pricingRuleLabel,
      ...(input.metadataJson as object | undefined),
    } as Prisma.InputJsonValue,
  };
}

import type { UserBillingRow, UserUsageSummary } from "@/types/customer-usage";

export type { UserBillingRow, UserUsageSummary };

function periodStart(period: UserUsageSummary["period"], now = new Date()): Date | null {
  if (period === "allTime") {
    return null;
  }
  const d = new Date(now);
  if (period === "today") {
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  if (period === "last7Days") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

export async function loadUserBillingUsage(
  userId: string,
  filter: UserUsageSummary["period"] = "allTime"
): Promise<{
  summary: UserUsageSummary;
  rows: UserBillingRow[];
}> {
  const since = periodStart(filter);
  const events = await prisma.customerBillingEvent.findMany({
    where: {
      userId,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    include: {
      project: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const rows: UserBillingRow[] = events.map((e) => {
    const meta = (e.metadataJson as { creditsUsed?: number } | null) ?? {};
    return {
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      projectId: e.projectId,
      projectTitle: e.project?.title ?? null,
      actionType: e.actionType,
      renderType: e.renderType,
      status: e.status,
      creditsUsed: meta.creditsUsed ?? 0,
      netPriceEur: e.netPriceEur,
      grossPriceEur: e.grossPriceEur,
      pricingRuleLabel: e.pricingRuleLabel,
      isEstimated: e.isEstimated,
    };
  });

  const videoActions = new Set(["vidu_render", "video_export"]);
  const renderRows = rows.filter((r) => videoActions.has(r.actionType) || r.renderType.includes("mode"));
  const amountSpentEur = Math.round(rows.reduce((s, r) => s + r.netPriceEur, 0) * 100) / 100;
  const creditsUsed = renderRows.reduce((s, r) => s + r.creditsUsed, 0);

  return {
    summary: {
      period: filter,
      videoCount: renderRows.length,
      creditsUsed,
      amountSpentEur,
      avgPricePerVideoEur:
        renderRows.length > 0 ?
          Math.round((amountSpentEur / renderRows.length) * 100) / 100
        : 0,
    },
    rows,
  };
}

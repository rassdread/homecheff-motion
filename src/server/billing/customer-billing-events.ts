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
import { isCustomerFacingBillingAction } from "@/server/provider-cost/cost-event-types";
import type { UserBillingRow, UserUsageSummary } from "@/types/customer-usage";

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
  /** For full_rerender — price tier follows story vs transition. */
  underlyingInstantMode?: "story" | "transition";
};

function mapActionToRenderType(actionType: string, renderType?: string): VideoRenderType {
  if (renderType === "full_rerender") {
    return "full_rerender";
  }
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
    underlyingInstantMode: input.underlyingInstantMode,
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

export type { UserBillingRow, UserUsageSummary };

const VIDEO_RENDER_TYPES = new Set([
  "transition_mode",
  "story_mode",
  "full_rerender",
  "classic",
  "concept_render",
]);

type BillingEventRecord = {
  id: string;
  createdAt: Date;
  projectId: string | null;
  providerCostEventId: string | null;
  actionType: string;
  renderType: string;
  status: string;
  netPriceEur: number;
  grossPriceEur: number;
  pricingRuleLabel: string | null;
  isEstimated: boolean;
  metadataJson: unknown;
  project?: { title: string | null } | null;
};

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** Strip admin/internal fields and normalize nullable DB values for user APIs. */
export function mapCustomerBillingEventToUserRow(event: BillingEventRecord): UserBillingRow {
  const meta = (event.metadataJson as { creditsUsed?: unknown } | null) ?? {};
  return {
    id: event.id,
    createdAt: event.createdAt.toISOString(),
    projectId: event.projectId,
    projectTitle: event.project?.title ?? null,
    actionType: safeString(event.actionType, "vidu_render"),
    renderType: safeString(event.renderType, "transition_mode"),
    status: safeString(event.status, "completed"),
    creditsUsed: safeNumber(meta.creditsUsed, 0),
    netPriceEur: safeNumber(event.netPriceEur, 0),
    grossPriceEur: safeNumber(event.grossPriceEur, 0),
    pricingRuleLabel: event.pricingRuleLabel ?? null,
    isEstimated: Boolean(event.isEstimated),
  };
}

/** Keep newest row per providerCostEventId; drop instrumentation-only actions. */
export function filterCustomerFacingBillingEvents<T extends BillingEventRecord>(
  events: T[]
): T[] {
  const seenCostIds = new Set<string>();
  const rows: T[] = [];

  for (const event of events) {
    if (!isCustomerFacingBillingAction(event.actionType)) {
      continue;
    }
    const costId = event.providerCostEventId?.trim();
    if (costId) {
      if (seenCostIds.has(costId)) {
        continue;
      }
      seenCostIds.add(costId);
    }
    rows.push(event);
  }

  return rows;
}

export function summarizeUserBillingRows(
  rows: UserBillingRow[],
  period: UserUsageSummary["period"]
): UserUsageSummary {
  const renderRows = rows.filter(
    (row) =>
      row.actionType === "vidu_render" ||
      VIDEO_RENDER_TYPES.has(row.renderType)
  );
  const amountSpentEur =
    Math.round(rows.reduce((sum, row) => sum + safeNumber(row.netPriceEur, 0), 0) * 100) / 100;
  const creditsUsed = renderRows.reduce((sum, row) => sum + safeNumber(row.creditsUsed, 0), 0);

  return {
    period,
    videoCount: renderRows.length,
    creditsUsed,
    amountSpentEur,
    avgPricePerVideoEur:
      renderRows.length > 0 ?
        Math.round((amountSpentEur / renderRows.length) * 100) / 100
      : 0,
  };
}

export function emptyUserUsageSummary(
  period: UserUsageSummary["period"]
): UserUsageSummary {
  return {
    period,
    videoCount: 0,
    creditsUsed: 0,
    amountSpentEur: 0,
    avgPricePerVideoEur: 0,
  };
}

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
  try {
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

    const visibleEvents = filterCustomerFacingBillingEvents(events);
    const rows = visibleEvents.map(mapCustomerBillingEventToUserRow);

    return {
      summary: summarizeUserBillingRows(rows, filter),
      rows,
    };
  } catch (err) {
    console.error("[billing] loadUserBillingUsage", err);
    return {
      summary: emptyUserUsageSummary(filter),
      rows: [],
    };
  }
}

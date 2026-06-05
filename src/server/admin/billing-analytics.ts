/**
 * Commercial billing analytics — gross revenue + margin (admin only).
 */

import { prisma } from "@/lib/prisma";
import { resolveEurToUsdRate } from "@/server/provider-cost/margin-simulation";
import { listActivePricingRulesForAdmin } from "@/server/billing/video-pricing";

export type RevenuePeriodTotals = {
  grossRevenueEur: number;
  netRevenueEur: number;
  internalCostUsd: number;
  internalCostEur: number;
  grossMarginEur: number;
  grossMarginPercent: number;
  eventCount: number;
  adminFreeCount: number;
};

export type BillingAnalytics = {
  today: RevenuePeriodTotals;
  last7Days: RevenuePeriodTotals;
  last30Days: RevenuePeriodTotals;
  allTime: RevenuePeriodTotals;
  pricingRules: ReturnType<typeof listActivePricingRulesForAdmin>;
  topUsersByRevenue: {
    userId: string;
    email: string;
    grossRevenueEur: number;
    internalCostUsd: number;
    marginEur: number;
    isAdmin: boolean;
  }[];
  topProjectsByRevenue: {
    projectId: string;
    projectTitle: string | null;
    grossRevenueEur: number;
    internalCostUsd: number;
    marginEur: number;
  }[];
};

function emptyPeriod(): RevenuePeriodTotals {
  return {
    grossRevenueEur: 0,
    netRevenueEur: 0,
    internalCostUsd: 0,
    internalCostEur: 0,
    grossMarginEur: 0,
    grossMarginPercent: 0,
    eventCount: 0,
    adminFreeCount: 0,
  };
}

function usdToEur(usd: number): number {
  return Math.round((usd / resolveEurToUsdRate()) * 100) / 100;
}

export async function buildBillingAnalytics(): Promise<BillingAnalytics> {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const billingEvents = await prisma.customerBillingEvent.findMany({
    include: {
      user: { select: { email: true, role: true } },
      project: { select: { title: true } },
      providerCostEvent: { select: { internalCostUsd: true, totalCostUsd: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const today = emptyPeriod();
  const last7Days = emptyPeriod();
  const last30Days = emptyPeriod();
  const allTime = emptyPeriod();

  const userMap = new Map<
    string,
    { email: string; gross: number; costUsd: number; isAdmin: boolean }
  >();
  const projectMap = new Map<
    string,
    { title: string | null; gross: number; costUsd: number }
  >();

  for (const e of billingEvents) {
    const at = e.createdAt;
    const costUsd =
      e.providerCostEvent?.internalCostUsd ??
      e.providerCostEvent?.totalCostUsd ??
      0;
    const periods = [allTime];
    if (at >= last30) {
      periods.push(last30Days);
    }
    if (at >= last7) {
      periods.push(last7Days);
    }
    if (at >= dayStart) {
      periods.push(today);
    }

    for (const p of periods) {
      p.eventCount += 1;
      p.grossRevenueEur += e.grossPriceEur;
      p.netRevenueEur += e.netPriceEur;
      p.internalCostUsd += costUsd;
      if (e.isAdminFree) {
        p.adminFreeCount += 1;
      }
    }

    if (e.userId) {
      const cur = userMap.get(e.userId) ?? {
        email: e.user.email,
        gross: 0,
        costUsd: 0,
        isAdmin: e.user.role === "admin",
      };
      cur.gross += e.grossPriceEur;
      cur.costUsd += costUsd;
      userMap.set(e.userId, cur);
    }

    if (e.projectId) {
      const cur = projectMap.get(e.projectId) ?? {
        title: e.project?.title ?? null,
        gross: 0,
        costUsd: 0,
      };
      cur.gross += e.grossPriceEur;
      cur.costUsd += costUsd;
      projectMap.set(e.projectId, cur);
    }
  }

  for (const p of [today, last7Days, last30Days, allTime]) {
    p.grossRevenueEur = Math.round(p.grossRevenueEur * 100) / 100;
    p.netRevenueEur = Math.round(p.netRevenueEur * 100) / 100;
    p.internalCostEur = usdToEur(p.internalCostUsd);
    p.grossMarginEur = Math.round((p.netRevenueEur - p.internalCostEur) * 100) / 100;
    p.grossMarginPercent =
      p.netRevenueEur > 0 ?
        Math.round((p.grossMarginEur / p.netRevenueEur) * 10000) / 100
      : 0;
  }

  const topUsersByRevenue = [...userMap.entries()]
    .map(([userId, u]) => ({
      userId,
      email: u.email,
      grossRevenueEur: Math.round(u.gross * 100) / 100,
      internalCostUsd: Math.round(u.costUsd * 100) / 100,
      marginEur: Math.round((u.gross - usdToEur(u.costUsd)) * 100) / 100,
      isAdmin: u.isAdmin,
    }))
    .sort((a, b) => b.grossRevenueEur - a.grossRevenueEur)
    .slice(0, 50);

  const topProjectsByRevenue = [...projectMap.entries()]
    .map(([projectId, p]) => ({
      projectId,
      projectTitle: p.title,
      grossRevenueEur: Math.round(p.gross * 100) / 100,
      internalCostUsd: Math.round(p.costUsd * 100) / 100,
      marginEur: Math.round((p.gross - usdToEur(p.costUsd)) * 100) / 100,
    }))
    .sort((a, b) => b.grossRevenueEur - a.grossRevenueEur)
    .slice(0, 20);

  return {
    today,
    last7Days,
    last30Days,
    allTime,
    pricingRules: listActivePricingRulesForAdmin("nl"),
    topUsersByRevenue,
    topProjectsByRevenue,
  };
}

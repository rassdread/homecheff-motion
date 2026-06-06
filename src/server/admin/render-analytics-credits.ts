/**
 * Credit-based render analytics — ProviderUsageLog + estimated fallbacks for legacy rows.
 * totalCostUsd = creditsUsed × creditUnitCostUsd (never a fixed price per render).
 */

import { prisma } from "@/lib/prisma";
import {
  CREDIT_UNIT_COST_USD,
  creditsToTotalCostUsd,
  resolveCreditAccuracy,
  type CreditAccuracy,
} from "@/server/provider-usage/credit-cost";
import { estimateCreditsForTransition } from "@/server/provider-usage/estimate-transition-credits";
import { resolveRenderTypeForProject } from "@/server/provider-usage/provider-usage-log";
import type { AdminProjectDisplay } from "@/types/admin-project-display";
import type { InstantModeUsageAnalytics, ModeUsageStats } from "@/types/render-analytics";

export type RenderCreditRow = {
  id: string;
  provider: string;
  providerJobId: string | null;
  projectId: string;
  projectTitle: string | null;
  projectDisplay: AdminProjectDisplay | null;
  userId: string;
  ownerEmail: string;
  renderType: string;
  status: string;
  durationSeconds: number | null;
  creditsBefore: number | null;
  creditsAfter: number | null;
  creditsUsed: number;
  creditUnitCostUsd: number;
  totalCostUsd: number;
  isEstimated: boolean;
  needsReview: boolean;
  estimateReason: string | null;
  creditAccuracy: CreditAccuracy;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type CreditPeriodTotals = {
  credits: number;
  costUsd: number;
  exactCredits: number;
  estimatedCredits: number;
  pendingCount: number;
};

export type CreditAnalytics = {
  today: CreditPeriodTotals;
  last7Days: CreditPeriodTotals;
  last30Days: CreditPeriodTotals;
  allTime: CreditPeriodTotals;
  avgCreditsPerRender: number;
  maxCreditsPerRender: number;
  minCreditsPerRender: number;
  failedCredits: number;
  cancelledCredits: number;
  exactRenderCount: number;
  estimatedRenderCount: number;
  pendingRenderCount: number;
  rows: RenderCreditRow[];
};

function startOfDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function emptyPeriod(): CreditPeriodTotals {
  return {
    credits: 0,
    costUsd: 0,
    exactCredits: 0,
    estimatedCredits: 0,
    pendingCount: 0,
  };
}

function addToPeriod(period: CreditPeriodTotals, row: RenderCreditRow, at: Date): void {
  period.credits += row.creditsUsed;
  period.costUsd = Math.round((period.costUsd + row.totalCostUsd) * 100) / 100;
  if (row.creditAccuracy === "exact") {
    period.exactCredits += row.creditsUsed;
  } else if (row.creditAccuracy === "estimated") {
    period.estimatedCredits += row.creditsUsed;
  } else {
    period.pendingCount += 1;
  }
  void at;
}

function logRowToCreditRow(
  log: {
    id: string;
    provider: string;
    providerJobId: string | null;
    projectId: string;
    userId: string;
    renderType: string;
    status: string;
    durationSeconds: number | null;
    creditsBefore: number | null;
    creditsAfter: number | null;
    creditsUsed: number | null;
    creditUnitCostUsd: number;
    totalCostUsd: number | null;
    isEstimated: boolean;
    needsReview: boolean;
    estimateReason: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    project: { title: string | null; owner: { email: string } };
  }
): RenderCreditRow {
  const creditsUsed = log.creditsUsed ?? 0;
  const creditAccuracy = resolveCreditAccuracy({
    isEstimated: log.isEstimated,
    creditsUsed: log.creditsUsed,
    completedAt: log.completedAt,
  });
  const unitCost = log.creditUnitCostUsd || CREDIT_UNIT_COST_USD;
  const totalCostUsd =
    log.totalCostUsd != null ?
      log.totalCostUsd
    : creditsToTotalCostUsd(creditsUsed);

  return {
    id: log.id,
    provider: log.provider,
    providerJobId: log.providerJobId,
    projectId: log.projectId,
    projectTitle: log.project.title,
    projectDisplay: null,
    userId: log.userId,
    ownerEmail: log.project.owner.email,
    renderType: log.renderType,
    status: log.status,
    durationSeconds: log.durationSeconds,
    creditsBefore: log.creditsBefore,
    creditsAfter: log.creditsAfter,
    creditsUsed,
    creditUnitCostUsd: unitCost,
    totalCostUsd,
    isEstimated: log.isEstimated,
    needsReview: log.needsReview,
    estimateReason: log.estimateReason,
    creditAccuracy,
    startedAt: log.startedAt?.toISOString() ?? null,
    completedAt: log.completedAt?.toISOString() ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

/** Build full credit dataset: persisted logs + synthetic estimates for legacy transitions. */
export async function loadRenderCreditDataset(): Promise<RenderCreditRow[]> {
  const logs = await prisma.providerUsageLog.findMany({
    include: {
      project: {
        select: {
          title: true,
          owner: { select: { email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const loggedJobIds = new Set(
    logs.map((l) => l.providerJobId).filter((id): id is string => id != null && id.trim() !== "")
  );

  const legacyTransitions = await prisma.animationTransition.findMany({
    where: { providerJobId: { not: null } },
    include: {
      project: {
        select: {
          id: true,
          ownerId: true,
          title: true,
          projectType: true,
          instantMode: true,
          sourceProjectId: true,
          presetId: true,
          estimatedCredits: true,
          viduDurationSeconds: true,
          instantTransitionSeconds: true,
          owner: { select: { email: true } },
          _count: { select: { transitions: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const transitionsWithoutLog = legacyTransitions.filter(
    (tr) => tr.providerJobId?.trim() && !loggedJobIds.has(tr.providerJobId.trim())
  );

  const rows: RenderCreditRow[] = logs.map(logRowToCreditRow);

  for (const tr of transitionsWithoutLog) {
    const p = tr.project;
    const duration = p.viduDurationSeconds ?? p.instantTransitionSeconds;
    const creditsUsed = estimateCreditsForTransition({
      presetId: p.presetId,
      viduDurationSeconds: p.viduDurationSeconds,
      instantTransitionSeconds: p.instantTransitionSeconds,
      estimatedCredits: p.estimatedCredits,
      transitionCount: Math.max(1, p._count.transitions),
    });

    rows.push({
      id: `legacy-${tr.id}`,
      provider: tr.provider ?? "vidu",
      providerJobId: tr.providerJobId,
      projectId: tr.projectId,
      projectTitle: p.title,
      projectDisplay: null,
      userId: p.ownerId,
      ownerEmail: p.owner.email,
      renderType: resolveRenderTypeForProject(p),
      status: tr.status,
      durationSeconds: duration,
      creditsBefore: null,
      creditsAfter: null,
      creditsUsed,
      creditUnitCostUsd: CREDIT_UNIT_COST_USD,
      totalCostUsd: creditsToTotalCostUsd(creditsUsed),
      isEstimated: true,
      needsReview: false,
      estimateReason: "legacy_transition_no_usage_log",
      creditAccuracy: "estimated",
      startedAt: tr.createdAt.toISOString(),
      completedAt: tr.updatedAt.toISOString(),
      createdAt: tr.createdAt.toISOString(),
    });
  }

  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function aggregateCreditAnalytics(
  rows: RenderCreditRow[],
  now = new Date()
): CreditAnalytics {
  const dayStart = startOfDay(now);
  const last7 = daysAgo(now, 7);
  const last30 = daysAgo(now, 30);

  const today = emptyPeriod();
  const last7Days = emptyPeriod();
  const last30Days = emptyPeriod();
  const allTime = emptyPeriod();

  let failedCredits = 0;
  let cancelledCredits = 0;
  let exactRenderCount = 0;
  let estimatedRenderCount = 0;
  let pendingRenderCount = 0;

  const withCredits = rows.filter((r) => r.creditsUsed > 0 || r.creditAccuracy === "pending");

  for (const row of rows) {
    const at = new Date(row.completedAt ?? row.startedAt ?? row.createdAt);
    addToPeriod(allTime, row, at);
    if (at >= last30) {
      addToPeriod(last30Days, row, at);
    }
    if (at >= last7) {
      addToPeriod(last7Days, row, at);
    }
    if (at >= dayStart) {
      addToPeriod(today, row, at);
    }

    if (row.status === "failed") {
      failedCredits += row.creditsUsed;
    }
    if (row.status === "cancelled") {
      cancelledCredits += row.creditsUsed;
    }
    if (row.creditAccuracy === "exact") {
      exactRenderCount += 1;
    } else if (row.creditAccuracy === "estimated") {
      estimatedRenderCount += 1;
    } else {
      pendingRenderCount += 1;
    }
  }

  const creditValues = withCredits
    .filter((r) => r.creditsUsed > 0)
    .map((r) => r.creditsUsed);

  return {
    today,
    last7Days,
    last30Days,
    allTime,
    avgCreditsPerRender:
      creditValues.length > 0 ?
        Math.round(creditValues.reduce((a, b) => a + b, 0) / creditValues.length)
      : 0,
    maxCreditsPerRender: creditValues.length > 0 ? Math.max(...creditValues) : 0,
    minCreditsPerRender: creditValues.length > 0 ? Math.min(...creditValues) : 0,
    failedCredits,
    cancelledCredits,
    exactRenderCount,
    estimatedRenderCount,
    pendingRenderCount,
    rows,
  };
}

export function creditsByProvider(rows: RenderCreditRow[]): Map<
  string,
  {
    credits: number;
    costUsd: number;
    exactCredits: number;
    estimatedCredits: number;
    calls: number;
    failed: number;
    cancelled: number;
  }
> {
  const map = new Map<
    string,
    {
      credits: number;
      costUsd: number;
      exactCredits: number;
      estimatedCredits: number;
      calls: number;
      failed: number;
      cancelled: number;
    }
  >();

  for (const row of rows) {
    const cur = map.get(row.provider) ?? {
      credits: 0,
      costUsd: 0,
      exactCredits: 0,
      estimatedCredits: 0,
      calls: 0,
      failed: 0,
      cancelled: 0,
    };
    cur.calls += 1;
    cur.credits += row.creditsUsed;
    cur.costUsd = Math.round((cur.costUsd + row.totalCostUsd) * 100) / 100;
    if (row.creditAccuracy === "exact") {
      cur.exactCredits += row.creditsUsed;
    } else if (row.creditAccuracy === "estimated") {
      cur.estimatedCredits += row.creditsUsed;
    }
    if (row.status === "failed") {
      cur.failed += 1;
    }
    if (row.status === "cancelled") {
      cur.cancelled += 1;
    }
    map.set(row.provider, cur);
  }
  return map;
}

export function creditsByProject(
  rows: RenderCreditRow[]
): Map<string, { credits: number; costUsd: number; renderCount: number }> {
  const map = new Map<string, { credits: number; costUsd: number; renderCount: number }>();
  for (const row of rows) {
    const cur = map.get(row.projectId) ?? { credits: 0, costUsd: 0, renderCount: 0 };
    cur.credits += row.creditsUsed;
    cur.costUsd = Math.round((cur.costUsd + row.totalCostUsd) * 100) / 100;
    cur.renderCount += 1;
    map.set(row.projectId, cur);
  }
  return map;
}

export function creditsByUser(
  rows: RenderCreditRow[]
): Map<string, { credits: number; costUsd: number; renderCount: number }> {
  const map = new Map<string, { credits: number; costUsd: number; renderCount: number }>();
  for (const row of rows) {
    const cur = map.get(row.userId) ?? { credits: 0, costUsd: 0, renderCount: 0 };
    cur.credits += row.creditsUsed;
    cur.costUsd = Math.round((cur.costUsd + row.totalCostUsd) * 100) / 100;
    cur.renderCount += 1;
    map.set(row.userId, cur);
  }
  return map;
}

function emptyModeStats(): ModeUsageStats {
  return { renderCount: 0, credits: 0, costUsd: 0, failedCount: 0, avgDurationSeconds: null };
}

/** Aggregate Vidu usage by story / transition / full rerender render types. */
export function aggregateInstantModeUsage(rows: RenderCreditRow[]): InstantModeUsageAnalytics {
  const buckets: InstantModeUsageAnalytics = {
    story: emptyModeStats(),
    transition: emptyModeStats(),
    fullRerender: emptyModeStats(),
  };
  const durationTotals = { story: 0, transition: 0, fullRerender: 0 };
  const durationCounts = { story: 0, transition: 0, fullRerender: 0 };

  for (const row of rows) {
    const key =
      row.renderType === "full_rerender" ? "fullRerender"
      : row.renderType === "story_mode" ? "story"
      : "transition";
    const b = buckets[key];
    b.renderCount += 1;
    b.credits += row.creditsUsed;
    b.costUsd += row.totalCostUsd;
    if (row.status === "failed" || row.status === "cancelled") {
      b.failedCount += 1;
    }
    if (row.durationSeconds != null && row.durationSeconds > 0) {
      durationTotals[key] += row.durationSeconds;
      durationCounts[key] += 1;
    }
  }

  for (const key of ["story", "transition", "fullRerender"] as const) {
    const count = durationCounts[key];
    buckets[key].avgDurationSeconds =
      count > 0 ? Math.round((durationTotals[key] / count) * 10) / 10 : null;
    buckets[key].costUsd = Math.round(buckets[key].costUsd * 100) / 100;
  }

  return buckets;
}

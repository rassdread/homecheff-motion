/**
 * Per-video / per-project cost aggregation from ProviderCostEvent + legacy ProviderUsageLog.
 */

import { prisma } from "@/lib/prisma";
import {
  resolveCostAccuracy,
  type CostAccuracy,
  unitsToTotalCostUsd,
} from "@/server/provider-cost/cost-event-types";
import {
  breakEvenPriceEur,
  DEFAULT_SALE_PRICES_EUR,
  REFERENCE_SALE_PRICE_EUR,
  simulateMarginAtPrice,
  simulateMarginsForPrices,
  summarizePortfolioMargins,
  type MarginSimulationRow,
  type PortfolioMarginSummary,
} from "@/server/provider-cost/margin-simulation";
import { loadRenderCreditDataset } from "@/server/admin/render-analytics-credits";

export type CostEventRow = {
  id: string;
  provider: string;
  actionType: string;
  projectId: string | null;
  projectTitle: string | null;
  userId: string | null;
  ownerEmail: string | null;
  relatedJobId: string | null;
  relatedExportId: string | null;
  balanceBefore: number | null;
  balanceAfter: number | null;
  unitsUsed: number;
  unitType: string;
  unitCostUsd: number;
  totalCostUsd: number;
  status: string;
  isEstimated: boolean;
  needsReview: boolean;
  estimateReason: string | null;
  costAccuracy: CostAccuracy;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type VideoCostRow = {
  projectId: string;
  projectTitle: string | null;
  ownerEmail: string;
  userId: string;
  status: string;
  videoSeconds: number;
  eventCount: number;
  netCostUsd: number;
  exactCostUsd: number;
  estimatedCostUsd: number;
  costByAction: Record<string, number>;
  costByProvider: Record<string, number>;
  marginAtReference: MarginSimulationRow;
  marginsByPrice: MarginSimulationRow[];
  breakEvenPriceEur: number;
  completedAt: string | null;
};

export type VideoCostAnalytics = {
  completedVideos: number;
  avgNetCostPerVideoUsd: number;
  portfolio: PortfolioMarginSummary;
  referenceSalePriceEur: number;
  salePricesEur: number[];
  topExpensiveVideos: VideoCostRow[];
  topLossMakingVideos: VideoCostRow[];
  byProject: VideoCostRow[];
  byUser: {
    userId: string;
    email: string;
    videoCount: number;
    netCostUsd: number;
    avgCostPerVideoUsd: number;
  }[];
  byProvider: {
    provider: string;
    eventCount: number;
    netCostUsd: number;
    exactCostUsd: number;
    estimatedCostUsd: number;
  }[];
  costEvents: CostEventRow[];
};

function eventToRow(
  e: {
    id: string;
    provider: string;
    actionType: string;
    projectId: string | null;
    userId: string | null;
    relatedJobId: string | null;
    relatedExportId: string | null;
    balanceBefore: number | null;
    balanceAfter: number | null;
    unitsUsed: number | null;
    unitType: string;
    unitCostUsd: number;
    totalCostUsd: number | null;
    status: string;
    isEstimated: boolean;
    needsReview: boolean;
    estimateReason: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    project: { title: string | null; owner: { email: string } } | null;
    user: { email: string } | null;
  }
): CostEventRow {
  const unitsUsed = e.unitsUsed ?? 0;
  const totalCostUsd =
    e.totalCostUsd ?? unitsToTotalCostUsd(unitsUsed, e.unitCostUsd);
  return {
    id: e.id,
    provider: e.provider,
    actionType: e.actionType,
    projectId: e.projectId,
    projectTitle: e.project?.title ?? null,
    userId: e.userId,
    ownerEmail: e.project?.owner.email ?? e.user?.email ?? null,
    relatedJobId: e.relatedJobId,
    relatedExportId: e.relatedExportId,
    balanceBefore: e.balanceBefore,
    balanceAfter: e.balanceAfter,
    unitsUsed,
    unitType: e.unitType,
    unitCostUsd: e.unitCostUsd,
    totalCostUsd,
    status: e.status,
    isEstimated: e.isEstimated,
    needsReview: e.needsReview,
    estimateReason: e.estimateReason,
    costAccuracy: resolveCostAccuracy({
      isEstimated: e.isEstimated,
      unitsUsed: e.unitsUsed,
      completedAt: e.completedAt,
      status: e.status,
    }),
    startedAt: e.startedAt?.toISOString() ?? null,
    completedAt: e.completedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

/** Supplement cost events from legacy usage logs not yet mirrored. */
async function loadSupplementalCostEvents(): Promise<CostEventRow[]> {
  const creditRows = await loadRenderCreditDataset();
  const existing = await prisma.providerCostEvent.findMany({
    where: { actionType: "vidu_render", relatedJobId: { not: null } },
    select: { relatedJobId: true },
  });
  const logged = new Set(existing.map((e) => e.relatedJobId).filter(Boolean));

  return creditRows
    .filter((r) => r.providerJobId && !logged.has(r.providerJobId))
    .map((r) => ({
      id: `legacy-cost-${r.id}`,
      provider: r.provider,
      actionType: "vidu_render",
      projectId: r.projectId,
      projectTitle: r.projectTitle,
      userId: r.userId,
      ownerEmail: r.ownerEmail,
      relatedJobId: r.providerJobId,
      relatedExportId: null,
      balanceBefore: r.creditsBefore,
      balanceAfter: r.creditsAfter,
      unitsUsed: r.creditsUsed,
      unitType: "credits",
      unitCostUsd: r.creditUnitCostUsd,
      totalCostUsd: r.totalCostUsd,
      status: r.status,
      isEstimated: r.isEstimated,
      needsReview: r.needsReview,
      estimateReason: r.estimateReason,
      costAccuracy: r.creditAccuracy,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
    }));
}

export async function loadCostEventDataset(): Promise<CostEventRow[]> {
  const events = await prisma.providerCostEvent.findMany({
    include: {
      project: { select: { title: true, owner: { select: { email: true } } } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = events.map(eventToRow);
  const supplemental = await loadSupplementalCostEvents();
  return [...rows, ...supplemental].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function aggregateVideoCosts(
  costEvents: CostEventRow[],
  projects: {
    id: string;
    title: string | null;
    status: string;
    ownerId: string;
    ownerEmail: string;
    instantOutputDurationSeconds: number | null;
    updatedAt: Date;
  }[]
): VideoCostRow[] {
  const byProject = new Map<string, CostEventRow[]>();
  for (const e of costEvents) {
    if (!e.projectId) {
      continue;
    }
    const list = byProject.get(e.projectId) ?? [];
    list.push(e);
    byProject.set(e.projectId, list);
  }

  const rows: VideoCostRow[] = [];

  for (const p of projects) {
    const events = byProject.get(p.id) ?? [];
    let netCostUsd = 0;
    let exactCostUsd = 0;
    let estimatedCostUsd = 0;
    const costByAction: Record<string, number> = {};
    const costByProvider: Record<string, number> = {};

    for (const e of events) {
      netCostUsd += e.totalCostUsd;
      if (e.costAccuracy === "exact") {
        exactCostUsd += e.totalCostUsd;
      } else if (e.costAccuracy === "estimated") {
        estimatedCostUsd += e.totalCostUsd;
      }
      costByAction[e.actionType] = (costByAction[e.actionType] ?? 0) + e.totalCostUsd;
      costByProvider[e.provider] = (costByProvider[e.provider] ?? 0) + e.totalCostUsd;
    }

    netCostUsd = Math.round(netCostUsd * 100) / 100;
    exactCostUsd = Math.round(exactCostUsd * 100) / 100;
    estimatedCostUsd = Math.round(estimatedCostUsd * 100) / 100;

    const marginAtReference = simulateMarginAtPrice(netCostUsd, REFERENCE_SALE_PRICE_EUR);
    const marginsByPrice = simulateMarginsForPrices(netCostUsd, DEFAULT_SALE_PRICES_EUR);

    rows.push({
      projectId: p.id,
      projectTitle: p.title,
      ownerEmail: p.ownerEmail,
      userId: p.ownerId,
      status: p.status,
      videoSeconds: p.instantOutputDurationSeconds ?? 0,
      eventCount: events.length,
      netCostUsd,
      exactCostUsd,
      estimatedCostUsd,
      costByAction,
      costByProvider,
      marginAtReference,
      marginsByPrice,
      breakEvenPriceEur: breakEvenPriceEur(netCostUsd),
      completedAt: p.status === "completed" ? p.updatedAt.toISOString() : null,
    });
  }

  return rows.sort((a, b) => b.netCostUsd - a.netCostUsd);
}

export async function buildVideoCostAnalytics(): Promise<VideoCostAnalytics> {
  const costEvents = await loadCostEventDataset();

  const projects = await prisma.animationProject.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      ownerId: true,
      instantOutputDurationSeconds: true,
      updatedAt: true,
      owner: { select: { email: true } },
    },
  });

  const projectInputs = projects.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    ownerId: p.ownerId,
    ownerEmail: p.owner.email,
    instantOutputDurationSeconds: p.instantOutputDurationSeconds,
    updatedAt: p.updatedAt,
  }));

  const byProject = aggregateVideoCosts(costEvents, projectInputs);
  const completed = byProject.filter((v) => v.status === "completed" && v.netCostUsd > 0);

  const portfolio = summarizePortfolioMargins(
    completed.length > 0 ? completed : byProject.filter((v) => v.netCostUsd > 0)
  );

  const topExpensiveVideos = [...byProject]
    .filter((v) => v.netCostUsd > 0)
    .sort((a, b) => b.netCostUsd - a.netCostUsd)
    .slice(0, 20);

  const topLossMakingVideos = [...byProject]
    .filter((v) => v.marginAtReference.marginUsd < 0)
    .sort((a, b) => a.marginAtReference.marginUsd - b.marginAtReference.marginUsd)
    .slice(0, 20);

  const userMap = new Map<
    string,
    { email: string; videoCount: number; netCostUsd: number }
  >();
  for (const v of byProject) {
    const cur = userMap.get(v.userId) ?? {
      email: v.ownerEmail,
      videoCount: 0,
      netCostUsd: 0,
    };
    cur.videoCount += 1;
    cur.netCostUsd += v.netCostUsd;
    userMap.set(v.userId, cur);
  }

  const byUser = [...userMap.entries()]
    .map(([userId, u]) => ({
      userId,
      email: u.email,
      videoCount: u.videoCount,
      netCostUsd: Math.round(u.netCostUsd * 100) / 100,
      avgCostPerVideoUsd:
        u.videoCount > 0 ?
          Math.round((u.netCostUsd / u.videoCount) * 100) / 100
        : 0,
    }))
    .sort((a, b) => b.netCostUsd - a.netCostUsd)
    .slice(0, 50);

  const providerMap = new Map<
    string,
    { eventCount: number; netCostUsd: number; exactCostUsd: number; estimatedCostUsd: number }
  >();
  for (const e of costEvents) {
    const cur = providerMap.get(e.provider) ?? {
      eventCount: 0,
      netCostUsd: 0,
      exactCostUsd: 0,
      estimatedCostUsd: 0,
    };
    cur.eventCount += 1;
    cur.netCostUsd += e.totalCostUsd;
    if (e.costAccuracy === "exact") {
      cur.exactCostUsd += e.totalCostUsd;
    } else if (e.costAccuracy === "estimated") {
      cur.estimatedCostUsd += e.totalCostUsd;
    }
    providerMap.set(e.provider, cur);
  }

  const byProvider = [...providerMap.entries()]
    .map(([provider, p]) => ({
      provider,
      eventCount: p.eventCount,
      netCostUsd: Math.round(p.netCostUsd * 100) / 100,
      exactCostUsd: Math.round(p.exactCostUsd * 100) / 100,
      estimatedCostUsd: Math.round(p.estimatedCostUsd * 100) / 100,
    }))
    .sort((a, b) => b.netCostUsd - a.netCostUsd);

  return {
    completedVideos: completed.length,
    avgNetCostPerVideoUsd: portfolio.avgNetCostPerVideoUsd,
    portfolio,
    referenceSalePriceEur: REFERENCE_SALE_PRICE_EUR,
    salePricesEur: [...DEFAULT_SALE_PRICES_EUR],
    topExpensiveVideos,
    topLossMakingVideos,
    byProject,
    byUser,
    byProvider,
    costEvents,
  };
}

/**
 * Admin render / cost analytics — aggregates Prisma data + storage HEAD audit.
 * Costs are estimates unless noted (no provider billing ledger exists).
 */

import { prisma } from "@/lib/prisma";
import { auditAdminVideoStorage } from "@/server/animation-projects/admin-storage-audit";
import { animationProjectWithMediaInclude } from "@/server/animation-projects/queries";
import { getViduCreditBalance } from "@/server/video-providers/vidu-credits";
import {
  aggregateCreditAnalytics,
  aggregateInstantModeUsage,
  creditsByProject,
  creditsByProvider,
  creditsByUser,
  loadRenderCreditDataset,
} from "@/server/admin/render-analytics-credits";
import {
  buildPeriodCostSummary,
  estimateStorageCostFromBytes,
  INFRA_BASELINE_USD_PER_MONTH,
  OPENAI_OCR_ESTIMATE_USD,
  prorateInfraCost,
} from "@/server/admin/render-analytics-cost";
import { CREDIT_UNIT_COST_USD } from "@/server/provider-usage/credit-cost";
import {
  buildAdminProjectDisplayMap,
  resolveAdminProjectDisplay,
} from "@/server/admin/admin-project-display";
import { buildBillingAnalytics } from "@/server/admin/billing-analytics";
import { buildVideoCostAnalytics } from "@/server/admin/video-cost-analytics";
import { buildStudioCostAnalytics } from "@/server/admin/studio-cost-analytics";
import { buildStudioProfitabilityReport } from "@/server/admin/studio-profitability";
import type {
  BalanceSnapshotRow,
  ExportTypeAnalytics,
  FinancialSummary,
  ProjectUsageRow,
  ProviderCostRow,
  RenderAnalyticsReport,
  RenderCreditRow,
  RenderStatusBreakdown,
  RenderTypeBreakdown,
  ScaleProjection,
  UserUsageRow,
} from "@/types/render-analytics";

const SQL_QUERIES: string[] = [
  `-- Transition status counts
SELECT status, COUNT(*) AS count FROM "AnimationTransition" GROUP BY status;`,
  `-- Render versions by kind + status
SELECT kind, status, COUNT(*) FROM "ProjectRenderVersion" GROUP BY kind, status;`,
  `-- Language exports by status
SELECT status, COUNT(*) FROM "VideoLanguageExport" GROUP BY status;`,
  `-- Projects by type/mode/status
SELECT "projectType", "instantMode", status, COUNT(*) FROM "AnimationProject" GROUP BY 1,2,3;`,
  `-- Usage ledger credits per user
SELECT "userId", SUM("estimatedCredits") FROM "AnimationUsageLedger" GROUP BY "userId";`,
  `-- Active render users (30d)
SELECT COUNT(DISTINCT p."ownerId") FROM "AnimationProject" p
  JOIN "ProjectRenderVersion" rv ON rv."projectId" = p.id
  WHERE rv."createdAt" >= NOW() - INTERVAL '30 days';`,
  `-- Vidu jobs by provider
SELECT COALESCE(provider, 'unknown'), status, COUNT(*) FROM "AnimationTransition" GROUP BY 1, 2;`,
  `-- Credit usage per render
SELECT provider, SUM("creditsUsed"), SUM("totalCostUsd"), COUNT(*) FILTER (WHERE "isEstimated") FROM "ProviderUsageLog" GROUP BY provider;`,
  `-- Daily balance snapshots
SELECT provider, balance, "capturedAt" FROM "ProviderCreditBalanceSnapshot" ORDER BY "capturedAt" DESC LIMIT 30;`,
];

function startOfDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function startOfMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const SUCCESS_STATUSES = new Set(["completed", "done", "success"]);
const FAILED_STATUSES = new Set(["failed", "error", "failed_overlay"]);
const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);
const IN_PROGRESS_STATUSES = new Set([
  "queued",
  "generating",
  "rendering",
  "running",
  "pending",
  "processing",
]);

function classifyStatus(status: string): keyof Omit<RenderStatusBreakdown, "total"> {
  const s = status.toLowerCase();
  if (SUCCESS_STATUSES.has(s)) {
    return "successful";
  }
  if (FAILED_STATUSES.has(s)) {
    return "failed";
  }
  if (CANCELLED_STATUSES.has(s)) {
    return "cancelled";
  }
  if (IN_PROGRESS_STATUSES.has(s)) {
    return "inProgress";
  }
  return "inProgress";
}

function accumulateStatus(counts: RenderStatusBreakdown, status: string, n = 1): void {
  counts.total += n;
  const bucket = classifyStatus(status);
  counts[bucket] += n;
}

function emptyStatusBreakdown(): RenderStatusBreakdown {
  return { total: 0, successful: 0, failed: 0, cancelled: 0, inProgress: 0 };
}

function videoSecondsForProject(project: {
  instantOutputDurationSeconds: number | null;
  viduDurationSeconds: number | null;
  instantTransitionSeconds: number;
  _count?: { images: number; transitions: number };
}): number {
  if (project.instantOutputDurationSeconds != null && project.instantOutputDurationSeconds > 0) {
    return project.instantOutputDurationSeconds;
  }
  if (project.viduDurationSeconds != null && project.viduDurationSeconds > 0) {
    const n = Math.max(1, project._count?.transitions ?? 1);
    return project.viduDurationSeconds * n;
  }
  const transitions = Math.max(1, (project._count?.images ?? 2) - 1);
  return transitions * project.instantTransitionSeconds;
}

export async function getRenderAnalyticsReport(): Promise<RenderAnalyticsReport> {
  const now = new Date();
  const dayStart = startOfDay(now);
  const last7 = daysAgo(now, 7);
  const last30 = daysAgo(now, 30);

  const [
    transitionStatusGroups,
    transitionProviderGroups,
    renderVersionGroups,
    languageExportGroups,
    projectStatusGroups,
    totalUsers,
    usageLedgerAgg,
    projectsWithMedia,
    allProjectsLite,
    renderVersions,
    languageExports,
    transitionsWithProject,
    users,
    viduBalance,
    totalProjectCount,
    pendingOrderGroups,
    exportProviderGroups,
  ] = await Promise.all([
    prisma.animationTransition.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.animationTransition.groupBy({
      by: ["provider", "status"],
      _count: { _all: true },
    }),
    prisma.projectRenderVersion.groupBy({
      by: ["kind", "status"],
      _count: { _all: true },
    }),
    prisma.videoLanguageExport.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.animationProject.groupBy({
      by: ["projectType", "instantMode", "status"],
      _count: { _all: true },
    }),
    prisma.user.count(),
    prisma.animationUsageLedger.aggregate({
      _sum: { estimatedCredits: true },
      _count: { _all: true },
    }),
    prisma.animationProject.findMany({
      include: {
        ...animationProjectWithMediaInclude,
        owner: { select: { email: true } },
        _count: { select: { images: true, transitions: true, renderVersions: true } },
      },
    }),
    prisma.animationProject.findMany({
      select: {
        id: true,
        ownerId: true,
        title: true,
        status: true,
        projectType: true,
        instantMode: true,
        sourceProjectId: true,
        studioSourceStoryboardId: true,
        instantPreviousFinalVideoUrl: true,
        presetId: true,
        estimatedCredits: true,
        viduDurationSeconds: true,
        instantTransitionSeconds: true,
        instantOutputDurationSeconds: true,
        instantDetectedTextMetadata: true,
        createdAt: true,
        owner: { select: { email: true } },
        images: {
          orderBy: { order: "asc" },
          take: 1,
          select: { previewUrl: true },
        },
        fullRerenderDraft: { select: { projectId: true } },
        _count: {
          select: { images: true, transitions: true, renderVersions: true },
        },
      },
    }),
    prisma.projectRenderVersion.findMany({
      select: {
        id: true,
        projectId: true,
        kind: true,
        status: true,
        createdAt: true,
        completedAt: true,
        project: {
          select: {
            title: true,
            owner: { select: { email: true } },
            presetId: true,
            estimatedCredits: true,
            viduDurationSeconds: true,
            instantTransitionSeconds: true,
            instantOutputDurationSeconds: true,
            instantMode: true,
            projectType: true,
            sourceProjectId: true,
            ownerId: true,
            _count: { select: { images: true, transitions: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.videoLanguageExport.findMany({
      select: {
        id: true,
        projectId: true,
        status: true,
        createdAt: true,
        completedAt: true,
        project: {
          select: {
            instantOutputDurationSeconds: true,
            owner: { select: { email: true } },
          },
        },
      },
    }),
    prisma.animationTransition.findMany({
      select: {
        id: true,
        projectId: true,
        status: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            title: true,
            owner: { select: { email: true } },
            presetId: true,
            estimatedCredits: true,
            viduDurationSeconds: true,
            instantTransitionSeconds: true,
            instantOutputDurationSeconds: true,
            instantMode: true,
            projectType: true,
            _count: { select: { images: true, transitions: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ select: { id: true, email: true, createdAt: true } }),
    getViduCreditBalance(),
    prisma.animationProject.count(),
    prisma.instantPremiumPendingOrder.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.animationExport.groupBy({
      by: ["provider", "status"],
      _count: { _all: true },
    }),
  ]);

  let storageSummary: Awaited<ReturnType<typeof auditAdminVideoStorage>>;
  let storageAuditFailed = false;
  try {
    storageSummary = await auditAdminVideoStorage({ projectLimit: 250 });
  } catch (error) {
    storageAuditFailed = true;
    console.error("[render-analytics] storage audit failed:", error);
    storageSummary = {
      totalVideoStorageBytes: 0,
      totalCleanVideoBytes: 0,
      totalLanguageVersionBytes: 0,
      totalLanguageVersionCount: 0,
      averageBytesPerProject: 0,
      projectCount: 0,
      totalActiveStorageBytes: 0,
      totalArchivedStorageBytes: 0,
      estimatedMonthlyStorageCostUsd: 0,
      estimatedTransferCostUsd: 0,
      topProjects: [],
      probedAt: new Date().toISOString(),
    };
  }

  const ocrProjectsCount = allProjectsLite.filter(
    (p) => p.instantDetectedTextMetadata != null
  ).length;

  const [creditRows, videoCosts, billing, studioCosts, profitability, customerBillingDb] =
    await Promise.all([
    loadRenderCreditDataset(),
    buildVideoCostAnalytics(),
    buildBillingAnalytics(),
    buildStudioCostAnalytics(),
    buildStudioProfitabilityReport(),
    prisma.customerBillingEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        createdAt: true,
        userId: true,
        projectId: true,
        actionType: true,
        renderType: true,
        customerUnits: true,
        grossPriceEur: true,
        netPriceEur: true,
        status: true,
        pricingRuleLabel: true,
        isAdminFree: true,
        isEstimated: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  const projectDisplayById = buildAdminProjectDisplayMap(allProjectsLite);

  const customerBillingRows = customerBillingDb.map((e) => ({
    createdAt: e.createdAt.toISOString(),
    userId: e.userId,
    ownerEmail: e.user.email,
    projectId: e.projectId,
    projectDisplay: resolveAdminProjectDisplay(projectDisplayById, {
      projectId: e.projectId,
      renderType: e.renderType,
      ownerEmail: e.user.email,
      createdAt: e.createdAt.toISOString(),
    }),
    actionType: e.actionType,
    renderType: e.renderType,
    customerUnits: e.customerUnits,
    grossPriceEur: e.grossPriceEur,
    netPriceEur: e.netPriceEur,
    status: e.status,
    pricingRuleLabel: e.pricingRuleLabel,
    isAdminFree: e.isAdminFree,
    isEstimated: e.isEstimated,
  }));
  const creditAnalytics = aggregateCreditAnalytics(creditRows, now);
  const projectCreditMap = creditsByProject(creditRows);
  const userCreditMap = creditsByUser(creditRows);
  const providerCreditMap = creditsByProvider(creditRows);

  const balanceSnapshots: BalanceSnapshotRow[] = (
    await prisma.providerCreditBalanceSnapshot.findMany({
      orderBy: { capturedAt: "desc" },
      take: 30,
    })
  ).map((s) => ({
    provider: s.provider,
    balance: s.balance,
    capturedAt: s.capturedAt.toISOString(),
  }));

  // --- Render status breakdowns (versions + language exports + transitions as jobs) ---
  const allTime = emptyStatusBreakdown();
  const last7Days = emptyStatusBreakdown();
  const last30Days = emptyStatusBreakdown();

  for (const row of renderVersionGroups) {
    accumulateStatus(allTime, row.status, row._count._all);
  }
  for (const row of languageExportGroups) {
    accumulateStatus(allTime, row.status, row._count._all);
  }

  for (const rv of renderVersions) {
    if (rv.createdAt >= last7) {
      accumulateStatus(last7Days, rv.status);
    }
    if (rv.createdAt >= last30) {
      accumulateStatus(last30Days, rv.status);
    }
  }
  for (const le of languageExports) {
    if (le.createdAt >= last7) {
      accumulateStatus(last7Days, le.status);
    }
    if (le.createdAt >= last30) {
      accumulateStatus(last30Days, le.status);
    }
  }

  // --- Render type breakdown ---
  const byType: RenderTypeBreakdown = {
    storyMode: 0,
    transitionMode: 0,
    fullRerender: 0,
    textRerender: 0,
    languageExport: languageExports.length,
    conceptRender: 0,
    draftRender: 0,
    classic: 0,
  };

  for (const rv of renderVersions) {
    if (rv.kind === "full_rerender") {
      byType.fullRerender += 1;
    } else if (rv.kind === "text_rerender") {
      byType.textRerender += 1;
    } else if (rv.kind === "initial") {
      const p = rv.project;
      if (p.sourceProjectId) {
        byType.conceptRender += 1;
      } else if (p.projectType === "classic") {
        byType.classic += 1;
      } else if (p.instantMode === "story") {
        byType.storyMode += 1;
      } else {
        byType.transitionMode += 1;
      }
    }
  }

  for (const p of allProjectsLite) {
    if (p.status === "draft" && p._count.transitions > 0) {
      byType.draftRender += 1;
    }
    if (p.sourceProjectId && p.status === "completed" && p._count.renderVersions === 0) {
      byType.conceptRender += 1;
    }
    if (
      p.projectType === "classic" &&
      p.status === "completed" &&
      p._count.renderVersions === 0
    ) {
      byType.classic += 1;
    }
    if (
      p.projectType === "instant_premium" &&
      p.instantMode === "story" &&
      p.status === "completed" &&
      p._count.renderVersions === 0
    ) {
      byType.storyMode += 1;
    }
    if (
      p.projectType === "instant_premium" &&
      p.instantMode === "transition" &&
      p.status === "completed" &&
      p._count.renderVersions === 0
    ) {
      byType.transitionMode += 1;
    }
  }

  // Ledger-only classic renders
  const ledgerOnlyCount = Math.max(
    0,
    (usageLedgerAgg._count._all ?? 0) -
      renderVersions.filter((rv) => rv.kind === "initial").length
  );
  if (ledgerOnlyCount > 0) {
    byType.classic += ledgerOnlyCount;
  }

  // --- Video length stats ---
  const videoLengths = allProjectsLite
    .filter((p) => p.status === "completed" || p._count.transitions > 0)
    .map((p) => videoSecondsForProject(p));
  const avgVideoLengthSeconds =
    videoLengths.length > 0 ?
      Math.round(videoLengths.reduce((a, b) => a + b, 0) / videoLengths.length)
    : 0;
  const longestVideoSeconds = videoLengths.length > 0 ? Math.max(...videoLengths) : 0;
  const shortestVideoSeconds =
    videoLengths.length > 0 ? Math.min(...videoLengths.filter((v) => v > 0)) || 0 : 0;

  // --- Render duration (version completedAt - createdAt) ---
  const durationsMs = renderVersions
    .filter((rv) => rv.completedAt)
    .map((rv) => rv.completedAt!.getTime() - rv.createdAt.getTime())
    .filter((ms) => ms > 0);
  const avgRenderDurationMs =
    durationsMs.length > 0 ?
      Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length)
    : null;

  const projectRenderCountMap = new Map<string, number>();
  const userRenderCountMap = new Map<string, number>();
  const userLastRenderMap = new Map<string, Date>();
  const projectVideoSecondsMap = new Map<string, number>();
  const projectExactCreditsMap = new Map<string, number>();
  const projectEstimatedCreditsMap = new Map<string, number>();
  const userExactCreditsMap = new Map<string, number>();
  const userEstimatedCreditsMap = new Map<string, number>();

  let totalViduSeconds = 0;
  for (const tr of transitionsWithProject) {
    const seconds = tr.project.viduDurationSeconds ?? tr.project.instantTransitionSeconds;
    totalViduSeconds += seconds;
    projectRenderCountMap.set(
      tr.projectId,
      (projectRenderCountMap.get(tr.projectId) ?? 0) + 1
    );
    projectVideoSecondsMap.set(
      tr.projectId,
      (projectVideoSecondsMap.get(tr.projectId) ?? 0) + seconds
    );
    const ownerId = allProjectsLite.find((p) => p.id === tr.projectId)?.ownerId;
    if (ownerId) {
      userRenderCountMap.set(ownerId, (userRenderCountMap.get(ownerId) ?? 0) + 1);
      const prev = userLastRenderMap.get(ownerId);
      if (!prev || tr.createdAt > prev) {
        userLastRenderMap.set(ownerId, tr.createdAt);
      }
    }
  }

  for (const row of creditRows) {
    if (row.creditAccuracy === "exact") {
      projectExactCreditsMap.set(
        row.projectId,
        (projectExactCreditsMap.get(row.projectId) ?? 0) + row.creditsUsed
      );
      userExactCreditsMap.set(
        row.userId,
        (userExactCreditsMap.get(row.userId) ?? 0) + row.creditsUsed
      );
    } else if (row.creditAccuracy === "estimated") {
      projectEstimatedCreditsMap.set(
        row.projectId,
        (projectEstimatedCreditsMap.get(row.projectId) ?? 0) + row.creditsUsed
      );
      userEstimatedCreditsMap.set(
        row.userId,
        (userEstimatedCreditsMap.get(row.userId) ?? 0) + row.creditsUsed
      );
    }
    const prev = userLastRenderMap.get(row.userId);
    const at = new Date(row.completedAt ?? row.startedAt ?? row.createdAt);
    if (!prev || at > prev) {
      userLastRenderMap.set(row.userId, at);
    }
  }

  // Storage per project from audit
  const storageByProject = new Map(
    storageSummary.topProjects.map((row) => [row.projectId, row.totalSizeBytes])
  );
  for (const row of storageSummary.topProjects) {
    storageByProject.set(row.projectId, row.totalSizeBytes);
  }

  const storageByUser = new Map<string, number>();
  for (const p of projectsWithMedia) {
    const row = storageSummary.topProjects.find((r) => r.projectId === p.id);
    if (row) {
      storageByUser.set(p.ownerId, (storageByUser.get(p.ownerId) ?? 0) + row.totalSizeBytes);
    }
  }

  const openAiCost = ocrProjectsCount * OPENAI_OCR_ESTIMATE_USD;
  const last30CreditRows = creditRows.filter(
    (r) => new Date(r.completedAt ?? r.startedAt ?? r.createdAt) >= last30
  );
  const last30CostByProvider = creditsByProvider(last30CreditRows);

  const providers: ProviderCostRow[] = [...providerCreditMap.entries()].map(
    ([provider, stats]) => {
      const last30 = last30CostByProvider.get(provider);
      const hasEstimated = stats.estimatedCredits > 0;
      return {
        provider,
        totalCalls: stats.calls,
        successfulCalls: stats.calls - stats.failed - stats.cancelled,
        failedCalls: stats.failed,
        cancelledCalls: stats.cancelled,
        totalCredits: stats.credits,
        exactCredits: stats.exactCredits,
        estimatedCredits: stats.estimatedCredits,
        totalCostUsd: stats.costUsd,
        totalCostUsdLast30Days: last30?.costUsd ?? 0,
        avgCreditsPerCall:
          stats.calls > 0 ? Math.round(stats.credits / stats.calls) : 0,
        avgCostPerCallUsd:
          stats.calls > 0 ?
            Math.round((stats.costUsd / stats.calls) * 10000) / 10000
          : 0,
        isEstimated: hasEstimated,
        basis:
          hasEstimated ?
            `Mix: exact balance delta + estimated (preset×duration) — $${CREDIT_UNIT_COST_USD}/credit`
          : `Exact creditsUsed × $${CREDIT_UNIT_COST_USD}/credit from balance snapshots`,
      };
    }
  );

  if (ocrProjectsCount > 0) {
    providers.push({
      provider: "openai",
      totalCalls: ocrProjectsCount,
      successfulCalls: ocrProjectsCount,
      failedCalls: 0,
      cancelledCalls: 0,
      totalCredits: 0,
      exactCredits: 0,
      estimatedCredits: 0,
      totalCostUsd: openAiCost,
      totalCostUsdLast30Days:
        allProjectsLite.filter(
          (p) => p.instantDetectedTextMetadata != null && p.createdAt >= last30
        ).length * OPENAI_OCR_ESTIMATE_USD,
      avgCreditsPerCall: 0,
      avgCostPerCallUsd: OPENAI_OCR_ESTIMATE_USD,
      isEstimated: true,
      basis: `~$${OPENAI_OCR_ESTIMATE_USD}/OCR project — not credit-based`,
    });
  }

  for (const row of exportProviderGroups) {
    const key = row.provider?.trim() || "internal_merge";
    if (!providers.some((p) => p.provider === key)) {
      providers.push({
        provider: key,
        totalCalls: row._count._all,
        successfulCalls: SUCCESS_STATUSES.has(row.status.toLowerCase()) ?
          row._count._all
        : 0,
        failedCalls: FAILED_STATUSES.has(row.status.toLowerCase()) ? row._count._all : 0,
        cancelledCalls: CANCELLED_STATUSES.has(row.status.toLowerCase()) ? row._count._all : 0,
        totalCredits: 0,
        exactCredits: 0,
        estimatedCredits: 0,
        totalCostUsd: 0,
        totalCostUsdLast30Days: 0,
        avgCreditsPerCall: 0,
        avgCostPerCallUsd: 0,
        isEstimated: false,
        basis: "Internal FFmpeg merge — zero Vidu credits",
      });
    }
  }

  const viduCreditRows = creditRows.filter((r) => r.provider === "vidu");
  const topExpensiveRenders: RenderCreditRow[] = [...viduCreditRows]
    .sort((a, b) => b.creditsUsed - a.creditsUsed)
    .slice(0, 20);
  const topLongestRenders: RenderCreditRow[] = [...viduCreditRows]
    .sort((a, b) => (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0))
    .slice(0, 20);

  const projectUsageRows: ProjectUsageRow[] = allProjectsLite.map((p) => {
    const credits = projectCreditMap.get(p.id);
    const projectDisplay = projectDisplayById.get(p.id) ?? null;
    return {
      projectId: p.id,
      projectTitle: p.title,
      projectDisplay,
      ownerEmail: p.owner.email,
      renderCount: credits?.renderCount ?? projectRenderCountMap.get(p.id) ?? 0,
      versionCount: p._count.renderVersions,
      totalCredits: credits?.credits ?? 0,
      totalCostUsd: credits?.costUsd ?? 0,
      exactCredits: projectExactCreditsMap.get(p.id) ?? 0,
      estimatedCredits: projectEstimatedCreditsMap.get(p.id) ?? 0,
      storageBytes: storageByProject.get(p.id) ?? 0,
      estimatedStorageCostUsd: estimateStorageCostFromBytes(storageByProject.get(p.id) ?? 0),
      totalVideoSeconds: projectVideoSecondsMap.get(p.id) ?? videoSecondsForProject(p),
    };
  });

  const topProjectsByUsage = [...projectUsageRows]
    .sort((a, b) => b.totalCredits - a.totalCredits)
    .slice(0, 20);

  // --- Users ---
  const usersWhoRendered = new Set(
    allProjectsLite
      .filter((p) => p._count.transitions > 0 || p._count.renderVersions > 0)
      .map((p) => p.ownerId)
  );
  const activeLast30 = new Set<string>();
  for (const rv of renderVersions) {
    if (rv.createdAt >= last30) {
      const ownerId = allProjectsLite.find((x) => x.id === rv.projectId)?.ownerId;
      if (ownerId) {
        activeLast30.add(ownerId);
      }
    }
  }
  for (const tr of transitionsWithProject) {
    if (tr.createdAt >= last30) {
      const ownerId = allProjectsLite.find((x) => x.id === tr.projectId)?.ownerId;
      if (ownerId) {
        activeLast30.add(ownerId);
      }
    }
  }
  for (const le of languageExports) {
    if (le.createdAt >= last30) {
      const ownerId = allProjectsLite.find((x) => x.id === le.projectId)?.ownerId;
      if (ownerId) {
        activeLast30.add(ownerId);
      }
    }
  }

  const userRows: UserUsageRow[] = users.map((u) => {
    const credits = userCreditMap.get(u.id);
    return {
      userId: u.id,
      email: u.email,
      renderCount: credits?.renderCount ?? userRenderCountMap.get(u.id) ?? 0,
      totalCredits: credits?.credits ?? 0,
      totalCostUsd: credits?.costUsd ?? 0,
      exactCredits: userExactCreditsMap.get(u.id) ?? 0,
      estimatedCredits: userEstimatedCreditsMap.get(u.id) ?? 0,
      storageBytes: storageByUser.get(u.id) ?? 0,
      estimatedStorageCostUsd: estimateStorageCostFromBytes(storageByUser.get(u.id) ?? 0),
      lastRenderAt: userLastRenderMap.get(u.id)?.toISOString() ?? null,
    };
  });

  const topUsersByCredits = [...userRows]
    .filter((u) => u.totalCredits > 0)
    .sort((a, b) => b.totalCredits - a.totalCredits)
    .slice(0, 50);
  const topByStorage = [...userRows]
    .filter((u) => u.storageBytes > 0)
    .sort((a, b) => b.storageBytes - a.storageBytes)
    .slice(0, 50);

  // --- Project analytics ---
  let completedProjects = 0;
  let draftProjects = 0;
  let failedProjects = 0;
  let conceptProjects = 0;
  for (const row of projectStatusGroups) {
    if (row.status === "completed") {
      completedProjects += row._count._all;
    }
    if (row.status === "draft") {
      draftProjects += row._count._all;
    }
    if (FAILED_STATUSES.has(row.status.toLowerCase())) {
      failedProjects += row._count._all;
    }
  }
  conceptProjects = allProjectsLite.filter((p) => p.sourceProjectId != null).length;

  const totalRenderEvents =
    renderVersions.length + languageExports.length + ledgerOnlyCount;
  const avgRendersPerProject =
    totalProjectCount > 0 ? Math.round((totalRenderEvents / totalProjectCount) * 100) / 100 : 0;
  const totalVersions = renderVersions.length;
  const avgVersionsPerProject =
    totalProjectCount > 0 ? Math.round((totalVersions / totalProjectCount) * 100) / 100 : 0;

  const topByVersions = [...projectUsageRows]
    .sort((a, b) => b.versionCount - a.versionCount)
    .slice(0, 20);
  const topByRenders = [...projectUsageRows]
    .sort((a, b) => b.renderCount - a.renderCount)
    .slice(0, 20);
  const topByCost = [...projectUsageRows]
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
    .slice(0, 20);
  const topProjectsByCredits = [...projectUsageRows]
    .sort((a, b) => b.totalCredits - a.totalCredits)
    .slice(0, 20);
  const topByLongestVideos = [...projectUsageRows]
    .sort((a, b) => b.totalVideoSeconds - a.totalVideoSeconds)
    .slice(0, 20);
  const topProjectsByStorage = [...projectUsageRows]
    .filter((p) => p.storageBytes > 0)
    .sort((a, b) => b.storageBytes - a.storageBytes)
    .slice(0, 20);

  const avgCreditsPerJob =
    creditRows.length > 0 ?
      Math.round(creditAnalytics.allTime.credits / creditRows.length)
    : 0;
  const avgCostPerJob =
    creditRows.length > 0 ?
      Math.round((creditAnalytics.allTime.costUsd / creditRows.length) * 100) / 100
    : 0;

  // --- Export analytics ---
  const exports: ExportTypeAnalytics[] = [
    {
      exportType: "full_rerender",
      count: byType.fullRerender,
      avgVideoLengthSeconds: avgVideoLengthSeconds,
      avgCredits: avgCreditsPerJob,
      avgCostUsd: avgCostPerJob,
      avgStorageBytes: storageSummary.averageBytesPerProject,
    },
    {
      exportType: "text_rerender",
      count: byType.textRerender,
      avgVideoLengthSeconds: avgVideoLengthSeconds,
      avgCredits: 0,
      avgCostUsd: 0,
      avgStorageBytes: storageSummary.extendedMetrics?.averageTextRerenderSizeBytes ?? 0,
    },
    {
      exportType: "language_export",
      count: byType.languageExport,
      avgVideoLengthSeconds:
        languageExports.length > 0 ?
          Math.round(
            languageExports.reduce(
              (sum, le) => sum + (le.project.instantOutputDurationSeconds ?? 0),
              0
            ) / languageExports.length
          )
        : 0,
      avgCredits: 0,
      avgCostUsd: 0,
      avgStorageBytes: storageSummary.extendedMetrics?.averageLanguageVersionSizeBytes ?? 0,
    },
    {
      exportType: "initial_render",
      count: byType.storyMode + byType.transitionMode + byType.classic + byType.conceptRender,
      avgVideoLengthSeconds: avgVideoLengthSeconds,
      avgCredits: avgCreditsPerJob,
      avgCostUsd: avgCostPerJob,
      avgStorageBytes: storageSummary.extendedMetrics?.averageVideoSizeBytes ?? 0,
    },
  ];

  // --- Storage growth by month ---
  const monthBuckets = new Map<string, { bytes: number; projectCount: number }>();
  for (const p of allProjectsLite) {
    const key = startOfMonthKey(p.createdAt);
    const cur = monthBuckets.get(key) ?? { bytes: 0, projectCount: 0 };
    cur.projectCount += 1;
    cur.bytes += storageByProject.get(p.id) ?? 0;
    monthBuckets.set(key, cur);
  }
  const growthByMonth = [...monthBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  const largestFiles = storageSummary.topProjects
    .map((p) => ({
      label: p.projectId,
      bytes: p.totalSizeBytes,
      projectId: p.projectId,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 20);

  const paymentsByStatus: Record<string, number> = {};
  let totalPaymentOrders = 0;
  for (const row of pendingOrderGroups) {
    paymentsByStatus[row.status] = row._count._all;
    totalPaymentOrders += row._count._all;
  }

  const recommendedLoggingFields = [
    "ProviderCostEvent — generic ledger (active: Vidu, OCR, language export, video export, text rerender, storage)",
    "ProviderCostEvent — Studio OpenAI/ElevenLabs instrumentation active (scene images, vision, TTS, STT, clone)",
    "ProviderCreditBalanceSnapshot — daily capture (active on render start/complete)",
    "AnimationUsageLedger — write on instant_premium + full_rerender",
    "BlobAssetInventory — storageKey, sizeBytes, projectId, kind",
    "InstantPremiumPendingOrder.paidAmountEur — Stripe session amount",
  ];

  const storageCostAll = storageSummary.estimatedMonthlyStorageCostUsd;

  const allTimeAiCost = openAiCost;
  const allTimeStorage = storageCostAll;
  const hasEstimatedCredits = creditAnalytics.estimatedRenderCount > 0;

  const financial: FinancialSummary = {
    today: buildPeriodCostSummary({
      renderCostUsd: creditAnalytics.today.costUsd,
      renderCredits: creditAnalytics.today.credits,
      exactCredits: creditAnalytics.today.exactCredits,
      estimatedCredits: creditAnalytics.today.estimatedCredits,
      storageCostUsd: storageCostAll / 30,
      aiCostUsd: allTimeAiCost / 30,
      infrastructureCostUsd: prorateInfraCost(1),
      hasEstimatedCredits,
    }),
    last7Days: buildPeriodCostSummary({
      renderCostUsd: creditAnalytics.last7Days.costUsd,
      renderCredits: creditAnalytics.last7Days.credits,
      exactCredits: creditAnalytics.last7Days.exactCredits,
      estimatedCredits: creditAnalytics.last7Days.estimatedCredits,
      storageCostUsd: (storageCostAll / 30) * 7,
      aiCostUsd: (allTimeAiCost / 30) * 7,
      infrastructureCostUsd: prorateInfraCost(7),
      hasEstimatedCredits,
    }),
    last30Days: buildPeriodCostSummary({
      renderCostUsd: creditAnalytics.last30Days.costUsd,
      renderCredits: creditAnalytics.last30Days.credits,
      exactCredits: creditAnalytics.last30Days.exactCredits,
      estimatedCredits: creditAnalytics.last30Days.estimatedCredits,
      storageCostUsd: storageCostAll,
      aiCostUsd:
        allProjectsLite.filter(
          (p) => p.instantDetectedTextMetadata != null && p.createdAt >= last30
        ).length * OPENAI_OCR_ESTIMATE_USD,
      infrastructureCostUsd: prorateInfraCost(30),
      hasEstimatedCredits,
    }),
    allTime: buildPeriodCostSummary({
      renderCostUsd: creditAnalytics.allTime.costUsd,
      renderCredits: creditAnalytics.allTime.credits,
      exactCredits: creditAnalytics.allTime.exactCredits,
      estimatedCredits: creditAnalytics.allTime.estimatedCredits,
      storageCostUsd: allTimeStorage,
      aiCostUsd: allTimeAiCost,
      infrastructureCostUsd: INFRA_BASELINE_USD_PER_MONTH,
      hasEstimatedCredits,
    }),
    monthlyForecastUsd: Math.round(
      (creditAnalytics.last30Days.costUsd + storageCostAll + prorateInfraCost(30)) * 100
    ) / 100,
    monthlyForecastCredits: creditAnalytics.last30Days.credits,
    monthlyForecastBasis:
      "Last-30-day creditsUsed × $0.005 + audited blob monthly cost + infra baseline.",
  };

  // --- Scale projections ---
  const activeUserCount = Math.max(1, activeLast30.size);
  const avgRendersPerActiveUser =
    renderVersions.filter((rv) => rv.createdAt >= last30).length / activeUserCount;
  const avgCostPerRender =
    creditRows.length > 0 ?
      creditAnalytics.allTime.costUsd / creditRows.length
    : 0;
  const avgCreditsPerRender = creditAnalytics.avgCreditsPerRender;
  const avgStoragePerActiveUser =
    [...storageByUser.values()].reduce((a, b) => a + b, 0) /
    Math.max(1, storageByUser.size);

  const scaleTargets = [100, 500, 1000, 5000, 10000];
  const scaleProjections: ScaleProjection[] = scaleTargets.map((targetUsers) => {
    const monthlyRenders = avgRendersPerActiveUser * targetUsers;
    const renderCost = monthlyRenders * avgCostPerRender;
    const storageBytes = avgStoragePerActiveUser * targetUsers;
    const storageCost = estimateStorageCostFromBytes(storageBytes);
    return {
      targetUsers,
      estimatedMonthlyRenderCostUsd: Math.round(renderCost * 100) / 100,
      estimatedMonthlyCredits: Math.round(avgCreditsPerRender * monthlyRenders),
      estimatedMonthlyStorageCostUsd: Math.round(storageCost * 100) / 100,
      estimatedMonthlyTotalUsd:
        Math.round((renderCost + storageCost + INFRA_BASELINE_USD_PER_MONTH) * 100) / 100,
      basis: `Avg ${avgRendersPerActiveUser.toFixed(1)} renders/user/mo × ${avgCreditsPerRender} credits/render × $${CREDIT_UNIT_COST_USD}; avg ${Math.round(avgStoragePerActiveUser / 1024 / 1024)}MB storage/active user.`,
    };
  });

  const avgCostPerRenderUsd =
    creditRows.length > 0 ?
      Math.round((creditAnalytics.allTime.costUsd / creditRows.length) * 100) / 100
    : 0;

  const dataGaps = [
    "Legacy renders before ProviderUsageLog use preset×duration credit estimates.",
    "Concurrent Vidu jobs may produce zero/negative balance deltas — flagged needsReview.",
    "Instant Premium projects are not written to AnimationUsageLedger.",
    "Storage audit covers latest 250 projects with video URLs (HEAD probes), not full Blob inventory.",
    "Image uploads and Studio assets are excluded from storage totals.",
    "ProviderCostEvent tracks all paid actions; legacy Vidu rows supplement from ProviderUsageLog.",
    "Studio OpenAI/ElevenLabs costs are estimated per call — no provider balance API.",
    "ElevenLabs clone cost uses planning estimate ($1) — actual IVC price not published.",
    "Infrastructure cost uses a $20/mo baseline estimate, not Vercel invoice data.",
    "Text rerenders and language exports have zero Vidu cost by design.",
    "Stripe InstantPremiumPendingOrder rows exist but paid EUR amounts are not stored on the order row.",
    ...(storageAuditFailed ?
      ["Storage HEAD audit failed — storage totals shown as zero for this run."]
    : []),
  ];

  function withProjectDisplay(row: RenderCreditRow): RenderCreditRow {
    return {
      ...row,
      projectDisplay: resolveAdminProjectDisplay(projectDisplayById, {
        projectId: row.projectId,
        projectTitle: row.projectTitle,
        ownerEmail: row.ownerEmail,
        status: row.status,
        renderType: row.renderType,
        createdAt: row.createdAt,
      }),
    };
  }

  const enrichedCreditRows = creditRows.map(withProjectDisplay);
  const enrichedTopExpensiveRenders = topExpensiveRenders.map(withProjectDisplay);
  const enrichedTopLongestRenders = topLongestRenders.map(withProjectDisplay);
  const enrichedVideoCosts = {
    ...videoCosts,
    topExpensiveVideos: videoCosts.topExpensiveVideos.map((v) => ({
      ...v,
      projectDisplay:
        v.projectDisplay ??
        resolveAdminProjectDisplay(projectDisplayById, {
          projectId: v.projectId,
          projectTitle: v.projectTitle,
          ownerEmail: v.ownerEmail,
          status: v.status,
          createdAt: v.completedAt,
        }),
    })),
    topLossMakingVideos: videoCosts.topLossMakingVideos.map((v) => ({
      ...v,
      projectDisplay:
        v.projectDisplay ??
        resolveAdminProjectDisplay(projectDisplayById, {
          projectId: v.projectId,
          projectTitle: v.projectTitle,
          ownerEmail: v.ownerEmail,
          status: v.status,
          createdAt: v.completedAt,
        }),
    })),
    costEvents: videoCosts.costEvents.slice(0, 50).map((e) => ({
      ...e,
      projectDisplay: resolveAdminProjectDisplay(projectDisplayById, {
        projectId: e.projectId,
        projectTitle: e.projectTitle,
        ownerEmail: e.ownerEmail,
        status: e.status,
        renderType: e.actionType,
        createdAt: e.createdAt,
      }),
    })),
  };

  return {
    generatedAt: now.toISOString(),
    dataGaps,
    recommendedLoggingFields,
    payments: {
      totalOrders: totalPaymentOrders,
      byStatus: paymentsByStatus,
      note: "InstantPremiumPendingOrder counts only — Stripe paid amounts not persisted on order rows.",
    },
    credits: creditAnalytics,
    creditRows: enrichedCreditRows,
    balanceSnapshots,
    financial,
    renders: {
      allTime: {
        ...allTime,
        total: creditRows.length || totalRenderEvents + transitionsWithProject.length,
      },
      last7Days,
      last30Days,
      byType,
      avgRenderDurationMs,
      avgVideoLengthSeconds,
      longestVideoSeconds,
      shortestVideoSeconds,
      totalGeneratedVideoSeconds: totalViduSeconds,
      avgCreditsPerRender: creditAnalytics.avgCreditsPerRender,
      avgCostPerRenderUsd,
      instantModeUsage: aggregateInstantModeUsage(creditRows),
    },
    providers,
    vidu: {
      totalJobs: viduCreditRows.length,
      totalVideoSecondsGenerated: totalViduSeconds,
      totalCredits: viduCreditRows.reduce((s, r) => s + r.creditsUsed, 0),
      totalCostUsd: Math.round(
        viduCreditRows.reduce((s, r) => s + r.totalCostUsd, 0) * 100
      ) / 100,
      costPerSecondUsd:
        totalViduSeconds > 0 ?
          Math.round(
            (viduCreditRows.reduce((s, r) => s + r.totalCostUsd, 0) / totalViduSeconds) * 10000
          ) / 10000
        : 0,
      costPerCreditUsd: CREDIT_UNIT_COST_USD,
      topExpensiveRenders: enrichedTopExpensiveRenders,
      topLongestRenders: enrichedTopLongestRenders,
      topProjectsByCredits: topProjectsByUsage,
    },
    storage: {
      totalBytes: storageSummary.totalVideoStorageBytes,
      estimatedMonthlyCostUsd: storageCostAll,
      projectsAudited: storageSummary.projectCount,
      projectsTotal: totalProjectCount,
      auditCoverageNote:
        storageAuditFailed ?
          "Storage audit unavailable for this run — totals may be incomplete."
        : `HEAD audit on ${storageSummary.projectCount} of ${totalProjectCount} projects (most recent with video URLs).`,
      storageAuditFailed,
      topUsers: topByStorage.slice(0, 50),
      topProjects: topProjectsByUsage,
      topProjectsByStorage,
      largestFiles,
      growthByMonth,
    },
    projects: {
      totalProjects: totalProjectCount,
      conceptProjects,
      completedProjects,
      draftProjects,
      failedProjects,
      avgRendersPerProject,
      avgVersionsPerProject,
      topByVersions,
      topByRenders,
      topByCost,
      topByCredits: topProjectsByCredits,
      topByLongestVideos,
    },
    exports,
    users: {
      totalUsers,
      usersWhoRendered: usersWhoRendered.size,
      activeRenderUsersLast30Days: activeLast30.size,
      avgRendersPerUser:
        usersWhoRendered.size > 0 ?
          Math.round((totalRenderEvents / usersWhoRendered.size) * 100) / 100
        : 0,
      avgCreditsPerUser:
        usersWhoRendered.size > 0 ?
          Math.round(creditAnalytics.allTime.credits / usersWhoRendered.size)
        : 0,
      topByCredits: topUsersByCredits,
      topByStorage,
    },
    scaleProjections,
    viduLiveBalance: {
      ok: viduBalance.ok,
      credits: viduBalance.credits,
      checkedAt: viduBalance.checkedAt,
      error: viduBalance.error,
    },
    sqlQueriesUsed: SQL_QUERIES,
    videoCosts: enrichedVideoCosts,
    studioCosts,
    billing,
    customerBillingRows,
    profitability,
  };
}

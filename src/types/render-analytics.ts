/** Admin render / cost analytics — credit-based: totalCostUsd = creditsUsed × 0.005 */

import type { CreditAccuracy } from "@/server/provider-usage/credit-cost";

export type CostEstimateMeta = {
  isEstimated: boolean;
  basis: string;
  currency: "USD" | "EUR";
};

export type PeriodCostSummary = {
  renderCostUsd: number;
  renderCredits: number;
  storageCostUsd: number;
  aiCostUsd: number;
  infrastructureCostUsd: number;
  totalCostUsd: number;
  exactCredits: number;
  estimatedCredits: number;
  meta: CostEstimateMeta;
};

export type CreditPeriodTotals = {
  credits: number;
  costUsd: number;
  exactCredits: number;
  estimatedCredits: number;
  pendingCount: number;
};

export type RenderCreditRow = {
  id: string;
  provider: string;
  providerJobId: string | null;
  projectId: string;
  projectTitle: string | null;
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
};

export type RenderStatusBreakdown = {
  total: number;
  successful: number;
  failed: number;
  cancelled: number;
  inProgress: number;
};

export type RenderTypeBreakdown = {
  storyMode: number;
  transitionMode: number;
  fullRerender: number;
  textRerender: number;
  languageExport: number;
  conceptRender: number;
  draftRender: number;
  classic: number;
};

export type ProviderCostRow = {
  provider: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  cancelledCalls: number;
  totalCredits: number;
  exactCredits: number;
  estimatedCredits: number;
  totalCostUsd: number;
  totalCostUsdLast30Days: number;
  avgCreditsPerCall: number;
  avgCostPerCallUsd: number;
  isEstimated: boolean;
  basis: string;
};

export type ViduAnalytics = {
  totalJobs: number;
  totalVideoSecondsGenerated: number;
  totalCredits: number;
  totalCostUsd: number;
  costPerSecondUsd: number;
  costPerCreditUsd: number;
  topExpensiveRenders: RenderCreditRow[];
  topLongestRenders: RenderCreditRow[];
  topProjectsByCredits: ProjectUsageRow[];
};

export type ProjectUsageRow = {
  projectId: string;
  projectTitle: string | null;
  ownerEmail: string;
  renderCount: number;
  versionCount: number;
  totalCredits: number;
  totalCostUsd: number;
  exactCredits: number;
  estimatedCredits: number;
  storageBytes: number;
  estimatedStorageCostUsd: number;
  totalVideoSeconds: number;
};

export type UserUsageRow = {
  userId: string;
  email: string;
  renderCount: number;
  totalCredits: number;
  totalCostUsd: number;
  exactCredits: number;
  estimatedCredits: number;
  storageBytes: number;
  estimatedStorageCostUsd: number;
  lastRenderAt: string | null;
};

export type StorageAnalytics = {
  totalBytes: number;
  estimatedMonthlyCostUsd: number;
  projectsAudited: number;
  projectsTotal: number;
  auditCoverageNote: string;
  storageAuditFailed: boolean;
  topUsers: UserUsageRow[];
  topProjects: ProjectUsageRow[];
  topProjectsByStorage: ProjectUsageRow[];
  largestFiles: { label: string; bytes: number; projectId: string }[];
  growthByMonth: { month: string; bytes: number; projectCount: number }[];
};

export type PaymentAnalytics = {
  totalOrders: number;
  byStatus: Record<string, number>;
  note: string;
};

export type BalanceSnapshotRow = {
  provider: string;
  balance: number;
  capturedAt: string;
};

export type ProjectAnalytics = {
  totalProjects: number;
  conceptProjects: number;
  completedProjects: number;
  draftProjects: number;
  failedProjects: number;
  avgRendersPerProject: number;
  avgVersionsPerProject: number;
  topByVersions: ProjectUsageRow[];
  topByRenders: ProjectUsageRow[];
  topByCost: ProjectUsageRow[];
  topByCredits: ProjectUsageRow[];
  topByLongestVideos: ProjectUsageRow[];
};

export type ExportTypeAnalytics = {
  exportType: string;
  count: number;
  avgVideoLengthSeconds: number;
  avgCredits: number;
  avgCostUsd: number;
  avgStorageBytes: number;
};

export type UserAnalytics = {
  totalUsers: number;
  usersWhoRendered: number;
  activeRenderUsersLast30Days: number;
  avgRendersPerUser: number;
  avgCreditsPerUser: number;
  topByCredits: UserUsageRow[];
  topByStorage: UserUsageRow[];
};

export type ScaleProjection = {
  targetUsers: number;
  estimatedMonthlyRenderCostUsd: number;
  estimatedMonthlyCredits: number;
  estimatedMonthlyStorageCostUsd: number;
  estimatedMonthlyTotalUsd: number;
  basis: string;
};

export type MarginSimulationRow = {
  salePriceEur: number;
  revenueUsd: number;
  costUsd: number;
  marginUsd: number;
  marginPct: number;
  breakEven: boolean;
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
  costAccuracy: "exact" | "estimated" | "pending";
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type VideoCostAnalytics = {
  completedVideos: number;
  avgNetCostPerVideoUsd: number;
  portfolio: {
    avgNetCostPerVideoUsd: number;
    avgMarginAtReferenceEur: number;
    referenceSalePriceEur: number;
    profitableVideoCount: number;
    lossMakingVideoCount: number;
    breakEvenPriceEur: number;
  };
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

export type FinancialSummary = {
  today: PeriodCostSummary;
  last7Days: PeriodCostSummary;
  last30Days: PeriodCostSummary;
  allTime: PeriodCostSummary;
  monthlyForecastUsd: number;
  monthlyForecastCredits: number;
  monthlyForecastBasis: string;
};

export type RenderAnalyticsReport = {
  generatedAt: string;
  dataGaps: string[];
  recommendedLoggingFields: string[];
  payments: PaymentAnalytics;
  credits: CreditAnalytics;
  creditRows: RenderCreditRow[];
  balanceSnapshots: BalanceSnapshotRow[];
  financial: FinancialSummary;
  renders: {
    allTime: RenderStatusBreakdown;
    last7Days: RenderStatusBreakdown;
    last30Days: RenderStatusBreakdown;
    byType: RenderTypeBreakdown;
    avgRenderDurationMs: number | null;
    avgVideoLengthSeconds: number;
    longestVideoSeconds: number;
    shortestVideoSeconds: number;
    totalGeneratedVideoSeconds: number;
    avgCreditsPerRender: number;
    avgCostPerRenderUsd: number;
  };
  providers: ProviderCostRow[];
  vidu: ViduAnalytics;
  storage: StorageAnalytics;
  projects: ProjectAnalytics;
  exports: ExportTypeAnalytics[];
  users: UserAnalytics;
  scaleProjections: ScaleProjection[];
  viduLiveBalance: {
    ok: boolean;
    credits?: number;
    checkedAt: string;
    error?: string;
  };
  sqlQueriesUsed: string[];
  videoCosts: VideoCostAnalytics;
};

export type RenderAnalyticsCsvSection =
  | "render-costs"
  | "render-jobs"
  | "cost-events"
  | "video-costs"
  | "provider-costs"
  | "project-usage"
  | "user-usage";

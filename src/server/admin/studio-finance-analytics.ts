import { prisma } from "@/lib/prisma";

export type StudioFinanceSummary = {
  generatedAt: string;
  totalUsersWithBalance: number;
  totalCreditsOutstanding: number;
  totalCreditsReserved: number;
  creditsSold: number;
  creditsGranted: number;
  creditsSpent: number;
  creditsRefunded: number;
  providerCostsUsd: number;
  reservedCostsUsd: number;
  marginEstimateUsd: number;
  negativeMarginAlerts: number;
  topCostlyUsers: Array<{
    userId: string;
    email: string;
    creditsSpent: number;
    providerCostUsd: number;
  }>;
  topCostlyProjects: Array<{
    projectId: string;
    creditsSpent: number;
    providerCostUsd: number;
  }>;
  failedGenerationRefunds: number;
};

export async function loadStudioFinanceSummary(): Promise<StudioFinanceSummary> {
  const wallets = await prisma.studioWallet.findMany({
    where: { balance: { gt: 0 } },
    select: { userId: true, balance: true, reservedBalance: true, lifetimePurchased: true, lifetimeGranted: true, lifetimeSpent: true, lifetimeRefunded: true },
  });

  const aggregates = await prisma.studioWallet.aggregate({
    _sum: {
      balance: true,
      reservedBalance: true,
      lifetimePurchased: true,
      lifetimeGranted: true,
      lifetimeSpent: true,
      lifetimeRefunded: true,
    },
    _count: { _all: true },
  });

  const usageEntries = await prisma.studioLedgerEntry.findMany({
    where: {
      actionType: { in: ["usage_capture", "failed_generation_refund"] },
    },
    select: {
      userId: true,
      projectId: true,
      creditsDelta: true,
      providerCostUsd: true,
      reservedCostUsd: true,
      marginEstimate: true,
      actionType: true,
    },
  });

  let providerCostsUsd = 0;
  let reservedCostsUsd = 0;
  let marginEstimateUsd = 0;
  let negativeMarginAlerts = 0;
  let failedGenerationRefunds = 0;

  const userCosts = new Map<string, { creditsSpent: number; providerCostUsd: number }>();
  const projectCosts = new Map<string, { creditsSpent: number; providerCostUsd: number }>();

  for (const entry of usageEntries) {
    if (entry.actionType === "failed_generation_refund") {
      failedGenerationRefunds += 1;
      continue;
    }

    const credits = Math.abs(entry.creditsDelta);
    const providerCost = entry.providerCostUsd ?? 0;
    const reservedCost = entry.reservedCostUsd ?? 0;
    const margin = entry.marginEstimate ?? 0;

    providerCostsUsd += providerCost;
    reservedCostsUsd += reservedCost;
    marginEstimateUsd += margin;
    if (margin < 0) {
      negativeMarginAlerts += 1;
    }

    const userRow = userCosts.get(entry.userId) ?? { creditsSpent: 0, providerCostUsd: 0 };
    userRow.creditsSpent += credits;
    userRow.providerCostUsd += providerCost;
    userCosts.set(entry.userId, userRow);

    if (entry.projectId) {
      const projRow = projectCosts.get(entry.projectId) ?? { creditsSpent: 0, providerCostUsd: 0 };
      projRow.creditsSpent += credits;
      projRow.providerCostUsd += providerCost;
      projectCosts.set(entry.projectId, projRow);
    }
  }

  const topUserIds = [...userCosts.entries()]
    .sort((a, b) => b[1].providerCostUsd - a[1].providerCostUsd)
    .slice(0, 10);

  const userEmails = await prisma.user.findMany({
    where: { id: { in: topUserIds.map(([id]) => id) } },
    select: { id: true, email: true },
  });
  const emailById = new Map(userEmails.map((u) => [u.id, u.email]));

  const topCostlyUsers = topUserIds.map(([userId, stats]) => ({
    userId,
    email: emailById.get(userId) ?? "unknown",
    creditsSpent: stats.creditsSpent,
    providerCostUsd: stats.providerCostUsd,
  }));

  const topCostlyProjects = [...projectCosts.entries()]
    .sort((a, b) => b[1].providerCostUsd - a[1].providerCostUsd)
    .slice(0, 10)
    .map(([projectId, stats]) => ({
      projectId,
      creditsSpent: stats.creditsSpent,
      providerCostUsd: stats.providerCostUsd,
    }));

  return {
    generatedAt: new Date().toISOString(),
    totalUsersWithBalance: wallets.length,
    totalCreditsOutstanding: aggregates._sum.balance ?? 0,
    totalCreditsReserved: aggregates._sum.reservedBalance ?? 0,
    creditsSold: aggregates._sum.lifetimePurchased ?? 0,
    creditsGranted: aggregates._sum.lifetimeGranted ?? 0,
    creditsSpent: aggregates._sum.lifetimeSpent ?? 0,
    creditsRefunded: aggregates._sum.lifetimeRefunded ?? 0,
    providerCostsUsd,
    reservedCostsUsd,
    marginEstimateUsd,
    negativeMarginAlerts,
    topCostlyUsers,
    topCostlyProjects,
    failedGenerationRefunds,
  };
}

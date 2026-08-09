/**
 * S.8E — Read-only wallet ↔ provider reconciliation (mismatches only).
 * Never mutates data.
 */

import { prisma } from "@/lib/prisma";

export type ReconciliationMismatch = {
  code: string;
  severity: "info" | "warning" | "critical";
  summary: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
};

export type WalletProviderReconciliationReport = {
  generatedAt: string;
  scanned: {
    wallets: number;
    recentCaptures: number;
    recentJobs: number;
    recentCostEvents: number;
    recentBillingEvents: number;
  };
  mismatchCount: number;
  mismatches: ReconciliationMismatch[];
};

function metaString(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const v = (meta as Record<string, unknown>)[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function loadWalletProviderReconciliation(): Promise<WalletProviderReconciliationReport> {
  const mismatches: ReconciliationMismatch[] = [];

  const [wallets, captures, jobs, costEvents, billingEvents] = await Promise.all([
    prisma.studioWallet.findMany({
      select: {
        userId: true,
        balance: true,
        reservedBalance: true,
        lifetimePurchased: true,
        lifetimeGranted: true,
        lifetimeSpent: true,
        lifetimeRefunded: true,
        purchasedBalance: true,
        promotionalBalance: true,
      },
      take: 5000,
    }),
    prisma.studioLedgerEntry.findMany({
      where: { actionType: "usage_capture" },
      select: { id: true, userId: true, creditsDelta: true, metadataJson: true, providerCostUsd: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.studioGenerationJob.findMany({
      where: { chargeFinalized: true },
      select: {
        id: true,
        ownerId: true,
        creditReservationId: true,
        creditsCharged: true,
        status: true,
        actionType: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.providerCostEvent.findMany({
      select: {
        id: true,
        userId: true,
        relatedJobId: true,
        status: true,
        internalCostUsd: true,
        totalCostUsd: true,
        metadataJson: true,
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    prisma.customerBillingEvent.findMany({
      select: { id: true, providerCostEventId: true, netPriceEur: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  // Wallet bucket identity: purchased + promotional should equal balance (when no drift).
  for (const w of wallets) {
    const bucketSum = w.purchasedBalance + w.promotionalBalance;
    if (bucketSum !== w.balance) {
      mismatches.push({
        code: "WALLET_BUCKET_BALANCE_MISMATCH",
        severity: "warning",
        summary: `Wallet buckets (${bucketSum}) ≠ balance (${w.balance})`,
        entityType: "StudioWallet",
        entityId: w.userId,
        details: {
          balance: w.balance,
          purchasedBalance: w.purchasedBalance,
          promotionalBalance: w.promotionalBalance,
          reservedBalance: w.reservedBalance,
        },
      });
    }
    if (w.reservedBalance < 0 || w.balance < 0) {
      mismatches.push({
        code: "WALLET_NEGATIVE_BALANCE",
        severity: "critical",
        summary: "Negative wallet balance or reservedBalance",
        entityType: "StudioWallet",
        entityId: w.userId,
        details: { balance: w.balance, reservedBalance: w.reservedBalance },
      });
    }
  }

  const pceIds = new Set(costEvents.map((e) => e.id));
  // Load missing PCE ids referenced by captures
  const capturePceIds = captures
    .map((c) => metaString(c.metadataJson, "providerCostEventId"))
    .filter((id): id is string => Boolean(id));
  const missingFromSample = capturePceIds.filter((id) => !pceIds.has(id));
  if (missingFromSample.length) {
    const existing = await prisma.providerCostEvent.findMany({
      where: { id: { in: missingFromSample.slice(0, 100) } },
      select: { id: true },
    });
    const existingSet = new Set(existing.map((e) => e.id));
    for (const id of missingFromSample.slice(0, 50)) {
      if (existingSet.has(id)) continue;
      const capture = captures.find(
        (c) => metaString(c.metadataJson, "providerCostEventId") === id
      );
      mismatches.push({
        code: "LEDGER_PCE_MISSING",
        severity: "warning",
        summary: "usage_capture references missing ProviderCostEvent",
        entityType: "StudioLedgerEntry",
        entityId: capture?.id ?? id,
        details: { providerCostEventId: id, userId: capture?.userId },
      });
    }
  }

  const reservationToCapture = new Map<string, string>();
  for (const c of captures) {
    const rid = metaString(c.metadataJson, "reservationId");
    if (rid) reservationToCapture.set(rid, c.id);
  }

  const jobsNeedingCaptureCheck = jobs.filter(
    (job) =>
      job.creditsCharged > 0 &&
      job.creditReservationId &&
      !reservationToCapture.has(job.creditReservationId)
  );
  if (jobsNeedingCaptureCheck.length > 0) {
    const extraCaptures = await prisma.studioLedgerEntry.findMany({
      where: {
        userId: { in: [...new Set(jobsNeedingCaptureCheck.map((j) => j.ownerId))] },
        actionType: "usage_capture",
      },
      select: { id: true, metadataJson: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    for (const c of extraCaptures) {
      const rid = metaString(c.metadataJson, "reservationId");
      if (rid) reservationToCapture.set(rid, c.id);
    }
    for (const job of jobsNeedingCaptureCheck) {
      if (job.creditReservationId && !reservationToCapture.has(job.creditReservationId)) {
        mismatches.push({
          code: "JOB_CAPTURE_MISSING",
          severity: "critical",
          summary: "chargeFinalized job has no matching usage_capture ledger row",
          entityType: "StudioGenerationJob",
          entityId: job.id,
          details: {
            creditReservationId: job.creditReservationId,
            creditsCharged: job.creditsCharged,
            status: job.status,
            actionType: job.actionType,
          },
        });
      }
    }
  }

  const cbePceIds = [
    ...new Set(
      billingEvents
        .map((be) => be.providerCostEventId)
        .filter((id): id is string => Boolean(id))
    ),
  ].filter((id) => !pceIds.has(id));
  if (cbePceIds.length > 0) {
    const existingCbePce = await prisma.providerCostEvent.findMany({
      where: { id: { in: cbePceIds.slice(0, 100) } },
      select: { id: true },
    });
    const existingCbeSet = new Set(existingCbePce.map((e) => e.id));
    for (const be of billingEvents) {
      const pid = be.providerCostEventId;
      if (!pid || pceIds.has(pid) || existingCbeSet.has(pid)) continue;
      mismatches.push({
        code: "CBE_PCE_MISSING",
        severity: "warning",
        summary: "CustomerBillingEvent references missing ProviderCostEvent",
        entityType: "CustomerBillingEvent",
        entityId: be.id,
        details: { providerCostEventId: pid, netPriceEur: be.netPriceEur },
      });
    }
  }

  // Cap output
  const capped = mismatches.slice(0, 100);

  return {
    generatedAt: new Date().toISOString(),
    scanned: {
      wallets: wallets.length,
      recentCaptures: captures.length,
      recentJobs: jobs.length,
      recentCostEvents: costEvents.length,
      recentBillingEvents: billingEvents.length,
    },
    mismatchCount: capped.length,
    mismatches: capped,
  };
}

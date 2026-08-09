/**
 * S.8F read-only ops probe — historical amountEur gap + lightweight recon counts.
 * Never mutates. Never backfills.
 *
 * Usage: npx tsx scripts/s8f-financial-ops-probe.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  extractPurchaseMeta,
  sumPackPurchaseRevenueEur,
  type CreditPurchaseRevenueRow,
} from "../src/lib/studio-commercial-revenue";

async function main() {
  const started = Date.now();

  const t0 = Date.now();
  const purchases = await prisma.studioLedgerEntry.findMany({
    where: { actionType: "credit_purchase" },
    select: { id: true, creditsDelta: true, metadataJson: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const purchaseMs = Date.now() - t0;

  const packs = await prisma.studioCreditPack.findMany({
    select: { slug: true, priceEur: true },
  });
  const packPriceBySlug = new Map(packs.map((p) => [p.slug, p.priceEur]));

  let withAmountEur = 0;
  let withoutAmountEur = 0;
  const missingByPack = new Map<string, number>();
  const missingDates: string[] = [];
  const rows: CreditPurchaseRevenueRow[] = [];

  for (const row of purchases) {
    const meta = extractPurchaseMeta(row.metadataJson);
    rows.push({
      purchaseKey: meta.stripeSessionId ?? `ledger:${row.id}`,
      packSlug: meta.packSlug,
      amountEurFromStripe: meta.amountEur,
      creditsDelta: row.creditsDelta,
    });
    if (meta.amountEur != null) {
      withAmountEur += 1;
    } else {
      withoutAmountEur += 1;
      const slug = meta.packSlug ?? "unknown";
      missingByPack.set(slug, (missingByPack.get(slug) ?? 0) + 1);
      missingDates.push(row.createdAt.toISOString().slice(0, 10));
    }
  }

  const revenue = sumPackPurchaseRevenueEur(rows, packPriceBySlug);

  const t1 = Date.now();
  const [
    walletCount,
    jobCount,
    finalizedJobs,
    atuAttempts,
    promoCodes,
    subscriptionPayments,
    captureCount,
    pceCount,
  ] = await Promise.all([
    prisma.studioWallet.count(),
    prisma.studioGenerationJob.count(),
    prisma.studioGenerationJob.count({ where: { chargeFinalized: true } }),
    prisma.studioAutoTopUpAttempt.count(),
    prisma.studioPromoCode.count(),
    prisma.studioLedgerEntry.count({ where: { actionType: "subscription_payment" } }),
    prisma.studioLedgerEntry.count({ where: { actionType: "usage_capture" } }),
    prisma.providerCostEvent.count(),
  ]);
  const countsMs = Date.now() - t1;

  // Sample finalized jobs for orphan capture check (max 25)
  const t2 = Date.now();
  const sampleJobs = await prisma.studioGenerationJob.findMany({
    where: { chargeFinalized: true, creditsCharged: { gt: 0 } },
    select: {
      id: true,
      ownerId: true,
      creditReservationId: true,
      creditsCharged: true,
      status: true,
      actionType: true,
      providerAdapter: true,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  let jobsMissingCapture = 0;
  let jobsWithCapture = 0;
  for (const job of sampleJobs) {
    if (!job.creditReservationId) {
      jobsMissingCapture += 1;
      continue;
    }
    const capture = await prisma.studioLedgerEntry.findFirst({
      where: {
        userId: job.ownerId,
        actionType: "usage_capture",
        AND: [
          {
            metadataJson: {
              path: ["reservationId"],
              equals: job.creditReservationId,
            },
          },
        ],
      },
      select: { id: true },
    });
    if (capture) jobsWithCapture += 1;
    else jobsMissingCapture += 1;
  }
  const jobSampleMs = Date.now() - t2;

  const dateMin = missingDates.length ? missingDates[0] : null;
  const dateMax = missingDates.length ? missingDates[missingDates.length - 1] : null;

  const report = {
    generatedAt: new Date().toISOString(),
    timingMs: {
      total: Date.now() - started,
      loadPurchases: purchaseMs,
      counts: countsMs,
      jobSample: jobSampleMs,
    },
    creditPurchases: {
      total: purchases.length,
      withAmountEur,
      withoutAmountEur,
      missingByPack: Object.fromEntries(missingByPack),
      missingDateRange: { from: dateMin, to: dateMax },
      recoverySource:
        "Stripe Checkout Session amount_total via stripeSessionId in metadata; else pack catalog priceEur",
      backfillFeasibility:
        withoutAmountEur === 0
          ? "n/a"
          : "FEASIBLE — Stripe API retrieve session by stripeSessionId; do NOT backfill in S.8F",
      catalogResolvedPackRevenueEur: revenue.packRevenueEur,
      stripeAmountCount: revenue.stripeAmountCount,
      catalogFallbackCount: revenue.catalogFallbackCount,
      unresolvedCount: revenue.unresolvedCount,
    },
    inventory: {
      wallets: walletCount,
      generationJobs: jobCount,
      chargeFinalizedJobs: finalizedJobs,
      autoTopUpAttempts: atuAttempts,
      promoCodes,
      subscriptionPayments,
      usageCaptures: captureCount,
      providerCostEvents: pceCount,
    },
    jobSample: {
      sampled: sampleJobs.length,
      withCapture: jobsWithCapture,
      missingCaptureOrReservation: jobsMissingCapture,
    },
  };

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

import { prisma } from "@/lib/prisma";

export type GenerationJobFinancialRow = {
  id: string;
  ownerId: string;
  email: string;
  capability: string;
  actionType: string;
  status: string;
  providerAdapter: string;
  providerJobId: string | null;
  creditCost: number;
  creditsReserved: number;
  creditsCharged: number;
  creditReservationId: string | null;
  chargeFinalized: boolean;
  idempotencyKey: string;
  attempt: number;
  outputAssetId: string | null;
  errorCode: string;
  cacheOrReplay: string;
  ledgerCaptureId: string | null;
  ledgerRefundId: string | null;
  providerCostEventId: string | null;
  providerCostUsd: number | null;
  customerBillingEventId: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type GenerationJobFinancialBrowser = {
  generatedAt: string;
  total: number;
  rows: GenerationJobFinancialRow[];
};

function metaFlag(meta: unknown, key: string): boolean {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  return Boolean((meta as Record<string, unknown>)[key]);
}

function metaString(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const v = (meta as Record<string, unknown>)[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function loadGenerationJobFinancialBrowser(input?: {
  limit?: number;
  status?: string;
}): Promise<GenerationJobFinancialBrowser> {
  const limit = Math.min(Math.max(input?.limit ?? 75, 1), 200);
  const where = input?.status ? { status: input.status } : {};

  const [jobs, total] = await Promise.all([
    prisma.studioGenerationJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { owner: { select: { email: true } } },
    }),
    prisma.studioGenerationJob.count({ where }),
  ]);

  const jobIds = jobs.map((j) => j.id);
  const userIds = [...new Set(jobs.map((j) => j.ownerId))];
  const reservationIds = new Set(
    jobs.map((j) => j.creditReservationId).filter((id): id is string => Boolean(id))
  );

  const [ledgerRows, costEvents] = await Promise.all([
    userIds.length
      ? prisma.studioLedgerEntry.findMany({
          where: {
            userId: { in: userIds },
            actionType: {
              in: ["usage_capture", "usage_refund", "failed_generation_refund", "usage_reservation"],
            },
          },
          select: {
            id: true,
            actionType: true,
            providerCostUsd: true,
            metadataJson: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1200,
        })
      : Promise.resolve([]),
    jobIds.length
      ? prisma.providerCostEvent.findMany({
          where: { relatedJobId: { in: jobIds } },
          select: {
            id: true,
            relatedJobId: true,
            internalCostUsd: true,
            totalCostUsd: true,
            billingEvents: { select: { id: true }, take: 1 },
          },
        })
      : Promise.resolve([]),
  ]);

  const ledgerByReservation = new Map<string, typeof ledgerRows>();
  for (const entry of ledgerRows) {
    const rid = metaString(entry.metadataJson, "reservationId");
    if (!rid || !reservationIds.has(rid)) continue;
    const list = ledgerByReservation.get(rid) ?? [];
    list.push(entry);
    ledgerByReservation.set(rid, list);
  }

  const costByJob = new Map(
    costEvents.filter((e) => e.relatedJobId).map((e) => [e.relatedJobId as string, e])
  );

  const rows: GenerationJobFinancialRow[] = jobs.map((job) => {
    const ledger = job.creditReservationId
      ? ledgerByReservation.get(job.creditReservationId) ?? []
      : [];
    const capture = ledger.find((l) => l.actionType === "usage_capture");
    const refund = ledger.find(
      (l) => l.actionType === "usage_refund" || l.actionType === "failed_generation_refund"
    );
    const cost = costByJob.get(job.id);
    const providerCostEventId =
      cost?.id ?? metaString(capture?.metadataJson, "providerCostEventId");
    let cacheOrReplay = "none";
    if (metaFlag(job.metadataJson, "cacheHit")) cacheOrReplay = "cache";
    else if (metaFlag(job.metadataJson, "replay")) cacheOrReplay = "replay";
    else if (job.chargeFinalized && job.attempt > 1) cacheOrReplay = "recover_possible";

    return {
      id: job.id,
      ownerId: job.ownerId,
      email: job.owner.email,
      capability: job.capability,
      actionType: job.actionType,
      status: job.status,
      providerAdapter: job.providerAdapter,
      providerJobId: job.providerJobId,
      creditCost: job.creditCost,
      creditsReserved: job.creditsReserved,
      creditsCharged: job.creditsCharged,
      creditReservationId: job.creditReservationId,
      chargeFinalized: job.chargeFinalized,
      idempotencyKey: job.idempotencyKey,
      attempt: job.attempt,
      outputAssetId: job.outputAssetId,
      errorCode: job.errorCode,
      cacheOrReplay,
      ledgerCaptureId: capture?.id ?? null,
      ledgerRefundId: refund?.id ?? null,
      providerCostEventId,
      providerCostUsd:
        cost?.internalCostUsd ?? cost?.totalCostUsd ?? capture?.providerCostUsd ?? null,
      customerBillingEventId: cost?.billingEvents[0]?.id ?? null,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  });

  return { generatedAt: new Date().toISOString(), total, rows };
}

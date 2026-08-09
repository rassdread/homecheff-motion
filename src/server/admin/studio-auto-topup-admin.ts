import { prisma } from "@/lib/prisma";

export type AutoTopUpAdminAttempt = {
  id: string;
  userId: string;
  email: string;
  idempotencyKey: string;
  packSlug: string;
  status: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  creditsGranted: number;
  ledgerEntryId: string | null;
  failureCode: string | null;
  financialCorrelationId: string | null;
  consentAt: string | null;
  autoTopUpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AutoTopUpAdminSummary = {
  generatedAt: string;
  totalsByStatus: Record<string, number>;
  succeeded: number;
  failed: number;
  pending: number;
  duplicatePrevented: number;
  enabledAccounts: number;
  consentedAccounts: number;
  attempts: AutoTopUpAdminAttempt[];
};

export async function loadAutoTopUpAdminSummary(limit = 100): Promise<AutoTopUpAdminSummary> {
  const [statusGroups, enabledAccounts, consentedAccounts, rows] = await Promise.all([
    prisma.studioAutoTopUpAttempt.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.studioAccount.count({ where: { autoTopUpEnabled: true } }),
    prisma.studioAccount.count({ where: { autoTopUpConsentAt: { not: null } } }),
    prisma.studioAutoTopUpAttempt.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 500),
      include: {
        user: {
          select: {
            email: true,
            studioAccount: {
              select: {
                autoTopUpConsentAt: true,
                autoTopUpEnabled: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalsByStatus: Record<string, number> = {};
  for (const g of statusGroups) {
    totalsByStatus[g.status] = g._count._all;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalsByStatus,
    succeeded: totalsByStatus.succeeded ?? 0,
    failed: totalsByStatus.failed ?? 0,
    pending: totalsByStatus.pending ?? 0,
    duplicatePrevented:
      (totalsByStatus.duplicate_prevented ?? 0) + (totalsByStatus.already_pending ?? 0),
    enabledAccounts,
    consentedAccounts,
    attempts: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      email: row.user.email,
      idempotencyKey: row.idempotencyKey,
      packSlug: row.packSlug,
      status: row.status,
      stripeCheckoutSessionId: row.stripeCheckoutSessionId,
      stripePaymentIntentId: row.stripePaymentIntentId,
      creditsGranted: row.creditsGranted,
      ledgerEntryId: row.ledgerEntryId,
      failureCode: row.failureCode,
      financialCorrelationId: row.financialCorrelationId,
      consentAt: row.user.studioAccount?.autoTopUpConsentAt?.toISOString() ?? null,
      autoTopUpEnabled: row.user.studioAccount?.autoTopUpEnabled ?? false,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { StudioLedgerActionType, StudioLedgerRow } from "@/types/studio-account";

export type AppendLedgerInput = {
  userId: string;
  projectId?: string | null;
  service: string;
  actionType: StudioLedgerActionType;
  creditsDelta: number;
  balanceAfter: number;
  provider?: string | null;
  providerCostUsd?: number | null;
  reservedCostUsd?: number | null;
  marginEstimate?: number | null;
  metadataJson?: Record<string, unknown>;
};

export async function appendStudioLedgerEntry(
  input: AppendLedgerInput,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<{ id: string }> {
  const client = tx ?? prisma;
  const row = await client.studioLedgerEntry.create({
    data: {
      userId: input.userId,
      projectId: input.projectId ?? null,
      service: input.service,
      actionType: input.actionType,
      creditsDelta: input.creditsDelta,
      balanceAfter: input.balanceAfter,
      provider: input.provider ?? null,
      providerCostUsd: input.providerCostUsd ?? null,
      reservedCostUsd: input.reservedCostUsd ?? null,
      marginEstimate: input.marginEstimate ?? null,
      metadataJson: (input.metadataJson ?? {}) as Prisma.InputJsonValue,
    },
  });
  return { id: row.id };
}

export function mapLedgerRow(row: {
  id: string;
  projectId: string | null;
  service: string;
  actionType: string;
  creditsDelta: number;
  balanceAfter: number;
  provider: string | null;
  providerCostUsd: number | null;
  reservedCostUsd: number | null;
  marginEstimate: number | null;
  metadataJson: unknown;
  createdAt: Date;
}): StudioLedgerRow {
  return {
    id: row.id,
    projectId: row.projectId,
    service: row.service,
    actionType: row.actionType as StudioLedgerActionType,
    creditsDelta: row.creditsDelta,
    balanceAfter: row.balanceAfter,
    provider: row.provider,
    providerCostUsd: row.providerCostUsd,
    reservedCostUsd: row.reservedCostUsd,
    marginEstimate: row.marginEstimate,
    metadataJson:
      row.metadataJson && typeof row.metadataJson === "object" && !Array.isArray(row.metadataJson)
        ? (row.metadataJson as Record<string, unknown>)
        : {},
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadRecentLedger(
  userId: string,
  limit = 25
): Promise<StudioLedgerRow[]> {
  const rows = await prisma.studioLedgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(mapLedgerRow);
}

export async function loadLedgerByProject(
  userId: string,
  projectId: string
): Promise<StudioLedgerRow[]> {
  const rows = await prisma.studioLedgerEntry.findMany({
    where: { userId, projectId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapLedgerRow);
}

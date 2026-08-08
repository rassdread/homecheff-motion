/**
 * SERVER_ONLY — Persistence for StudioGenerationJob.
 */

import { prisma } from "@/lib/prisma";
import type { StudioGenerationCapability } from "@/lib/studio-generation-capabilities";
import type { StudioGenerationStatus } from "@/lib/studio-generation-status";
import { isStudioGenerationTerminal } from "@/lib/studio-generation-status";
import type { Prisma } from "@prisma/client";

export type StudioGenerationJobRow = {
  id: string;
  ownerId: string;
  storyboardId: string | null;
  sceneId: string | null;
  capability: string;
  actionType: string;
  status: string;
  executionMode: string;
  providerAdapter: string;
  providerJobId: string | null;
  inputHash: string;
  idempotencyKey: string;
  creditCost: number;
  creditsReserved: number;
  creditsCharged: number;
  creditReservationId: string | null;
  chargeFinalized: boolean;
  attempt: number;
  maxAttempts: number;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;
  errorCode: string;
  errorMessageSafe: string;
  outputAssetId: string | null;
  metadataJson: Prisma.JsonValue | null;
  inputSnapshotJson: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function findGenerationJobByIdempotency(
  ownerId: string,
  idempotencyKey: string
): Promise<StudioGenerationJobRow | null> {
  return prisma.studioGenerationJob.findUnique({
    where: { ownerId_idempotencyKey: { ownerId, idempotencyKey } },
  });
}

export async function getGenerationJobForOwner(
  jobId: string,
  ownerId: string
): Promise<StudioGenerationJobRow | null> {
  return prisma.studioGenerationJob.findFirst({
    where: { id: jobId, ownerId },
  });
}

export async function createGenerationJobRow(input: {
  ownerId: string;
  storyboardId?: string | null;
  sceneId?: string | null;
  capability: StudioGenerationCapability;
  actionType: string;
  executionMode: string;
  providerAdapter: string;
  idempotencyKey: string;
  inputHash: string;
  creditCost: number;
  inputSnapshotJson?: Prisma.InputJsonValue;
  metadataJson?: Prisma.InputJsonValue;
}): Promise<StudioGenerationJobRow> {
  return prisma.studioGenerationJob.create({
    data: {
      ownerId: input.ownerId,
      storyboardId: input.storyboardId ?? null,
      sceneId: input.sceneId ?? null,
      capability: input.capability,
      actionType: input.actionType,
      status: "pending",
      executionMode: input.executionMode,
      providerAdapter: input.providerAdapter,
      idempotencyKey: input.idempotencyKey,
      inputHash: input.inputHash,
      creditCost: input.creditCost,
      inputSnapshotJson: input.inputSnapshotJson,
      metadataJson: input.metadataJson,
    },
  });
}

export async function updateGenerationJobStatus(
  jobId: string,
  patch: {
    status: StudioGenerationStatus;
    providerJobId?: string | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    failedAt?: Date | null;
    cancelledAt?: Date | null;
    errorCode?: string;
    errorMessageSafe?: string;
    outputAssetId?: string | null;
    creditsReserved?: number;
    creditsCharged?: number;
    creditReservationId?: string | null;
    chargeFinalized?: boolean;
    attempt?: number;
    metadataJson?: Prisma.InputJsonValue;
  }
): Promise<StudioGenerationJobRow> {
  return prisma.studioGenerationJob.update({
    where: { id: jobId },
    data: {
      status: patch.status,
      providerJobId: patch.providerJobId,
      startedAt: patch.startedAt,
      completedAt: patch.completedAt,
      failedAt: patch.failedAt,
      cancelledAt: patch.cancelledAt,
      errorCode: patch.errorCode,
      errorMessageSafe: patch.errorMessageSafe,
      outputAssetId: patch.outputAssetId,
      creditsReserved: patch.creditsReserved,
      creditsCharged: patch.creditsCharged,
      creditReservationId: patch.creditReservationId,
      chargeFinalized: patch.chargeFinalized,
      attempt: patch.attempt,
      metadataJson: patch.metadataJson,
    },
  });
}

/** Invariant: never increase creditsCharged once chargeFinalized. */
export async function finalizeGenerationChargeOnce(input: {
  jobId: string;
  creditsCharged: number;
  creditReservationId?: string | null;
}): Promise<{ ok: true; charged: number } | { ok: false; reason: "already_finalized" | "not_found" }> {
  const row = await prisma.studioGenerationJob.findUnique({ where: { id: input.jobId } });
  if (!row) {
    return { ok: false, reason: "not_found" };
  }
  if (row.chargeFinalized) {
    return { ok: false, reason: "already_finalized" };
  }
  await prisma.studioGenerationJob.update({
    where: { id: input.jobId },
    data: {
      creditsCharged: input.creditsCharged,
      creditReservationId: input.creditReservationId ?? row.creditReservationId,
      chargeFinalized: true,
    },
  });
  return { ok: true, charged: input.creditsCharged };
}

export function assertJobMutable(row: StudioGenerationJobRow): boolean {
  return !isStudioGenerationTerminal(row.status);
}

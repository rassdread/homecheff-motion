/**
 * Generic provider cost event tracking.
 * unitsUsed = balanceBefore - balanceAfter (when balance available) or usage from response.
 * totalCostUsd = unitsUsed × unitCostUsd
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getViduCreditBalance } from "@/server/video-providers/vidu-credits";
import { maybeCaptureDailyBalanceSnapshot } from "@/server/provider-usage/provider-usage-log";
import { syncCustomerBillingFromCostEvent } from "@/server/billing/sync-billing-from-cost";
import {
  COST_ACTION,
  COST_UNIT,
  INSTRUMENTATION_ONLY_ACTIONS,
  type CostActionType,
  type CostUnitType,
  unitsToTotalCostUsd,
  UNIT_COST_USD,
} from "@/server/provider-cost/cost-event-types";

async function fetchProviderBalance(provider: string): Promise<number | null> {
  if (provider !== "vidu") {
    return null;
  }
  const result = await getViduCreditBalance({ bypassCache: true });
  return result.ok && result.credits != null ? result.credits : null;
}

export type BeginCostEventInput = {
  provider: string;
  actionType: CostActionType;
  projectId?: string | null;
  userId?: string | null;
  relatedJobId?: string | null;
  relatedExportId?: string | null;
  unitType: CostUnitType;
  unitCostUsd: number;
  metadataJson?: Prisma.InputJsonValue;
};

/** Start tracking — capture balanceBefore when provider supports it. */
export async function beginCostEvent(input: BeginCostEventInput): Promise<string | null> {
  const balanceBefore = await fetchProviderBalance(input.provider);
  if (balanceBefore != null) {
    await maybeCaptureDailyBalanceSnapshot(input.provider, balanceBefore);
  }

  const isEstimated = balanceBefore == null && input.provider === "vidu";

  if (input.relatedJobId?.trim()) {
    const existing = await prisma.providerCostEvent.findFirst({
      where: {
        provider: input.provider,
        actionType: input.actionType,
        relatedJobId: input.relatedJobId.trim(),
        status: "pending",
      },
      select: { id: true },
    });
    if (existing) {
      await prisma.providerCostEvent.update({
        where: { id: existing.id },
        data: {
          balanceBefore: balanceBefore ?? undefined,
          startedAt: new Date(),
          isEstimated: isEstimated ? true : undefined,
          estimateReason: isEstimated ? "balance_before_unavailable" : undefined,
        },
      });
      return existing.id;
    }
  }

  const row = await prisma.providerCostEvent.create({
    data: {
      provider: input.provider,
      actionType: input.actionType,
      projectId: input.projectId ?? null,
      userId: input.userId ?? null,
      relatedJobId: input.relatedJobId?.trim() || null,
      relatedExportId: input.relatedExportId?.trim() || null,
      balanceBefore,
      unitType: input.unitType,
      unitCostUsd: input.unitCostUsd,
      status: "pending",
      isEstimated,
      estimateReason: isEstimated ? "balance_before_unavailable" : null,
      metadataJson: input.metadataJson ?? undefined,
      startedAt: new Date(),
    },
  });
  return row.id;
}

export type CompleteCostEventInput = {
  provider: string;
  actionType: CostActionType;
  relatedJobId?: string | null;
  relatedExportId?: string | null;
  eventId?: string | null;
  status: string;
  /** When balance delta unavailable — use explicit usage from provider response. */
  unitsUsedFromResponse?: number | null;
  unitCostUsd?: number;
  metadataJson?: Prisma.InputJsonValue;
};

function normalizeStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === "canceled") {
    return "cancelled";
  }
  if (s === "generating" || s === "rendering" || s === "queued") {
    return "pending";
  }
  return s;
}

/** Complete event — compute units from balance delta or response usage. */
export async function completeCostEvent(input: CompleteCostEventInput): Promise<void> {
  const terminalStatus = normalizeStatus(input.status);
  if (terminalStatus === "pending") {
    return;
  }

  const existing =
    input.eventId ?
      await prisma.providerCostEvent.findUnique({ where: { id: input.eventId } })
    : input.relatedJobId?.trim() ?
      await prisma.providerCostEvent.findFirst({
        where: {
          provider: input.provider,
          actionType: input.actionType,
          relatedJobId: input.relatedJobId.trim(),
        },
        orderBy: { createdAt: "desc" },
      })
    : input.relatedExportId?.trim() ?
      await prisma.providerCostEvent.findFirst({
        where: {
          provider: input.provider,
          actionType: input.actionType,
          relatedExportId: input.relatedExportId.trim(),
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  if (!existing || existing.completedAt) {
    return;
  }

  const balanceAfter = await fetchProviderBalance(input.provider);
  const unitCost = input.unitCostUsd ?? existing.unitCostUsd;

  let unitsUsed: number | null = null;
  let isEstimated = existing.isEstimated;
  let needsReview = false;
  let estimateReason = existing.estimateReason;

  if (input.unitsUsedFromResponse != null && input.unitsUsedFromResponse >= 0) {
    unitsUsed = input.unitsUsedFromResponse;
    isEstimated = false;
    estimateReason = null;
  } else if (existing.balanceBefore != null && balanceAfter != null) {
    unitsUsed = existing.balanceBefore - balanceAfter;
    isEstimated = false;
    estimateReason = null;
    if (unitsUsed < 0) {
      needsReview = true;
      estimateReason = "negative_balance_delta";
    } else if (unitsUsed === 0 && terminalStatus === "completed") {
      needsReview = true;
      estimateReason = "zero_balance_delta_possible_concurrency";
    }
  } else if (input.unitsUsedFromResponse != null) {
    unitsUsed = input.unitsUsedFromResponse;
    isEstimated = true;
    estimateReason = estimateReason ?? "usage_from_estimate";
  }

  const internalCostUsd =
    unitsUsed != null ? unitsToTotalCostUsd(unitsUsed, unitCost) : null;

  await prisma.providerCostEvent.update({
    where: { id: existing.id },
    data: {
      status: terminalStatus,
      balanceAfter,
      unitsUsed,
      unitCostUsd: unitCost,
      internalCostUsd,
      totalCostUsd: internalCostUsd,
      providerJobId:
        input.provider === "vidu" && input.relatedJobId?.trim() ?
          input.relatedJobId.trim()
        : undefined,
      isEstimated,
      needsReview,
      estimateReason,
      completedAt: new Date(),
      metadataJson: input.metadataJson ?
        ({
          ...(existing.metadataJson as Record<string, unknown> | null),
          ...(input.metadataJson as Record<string, unknown>),
        } as Prisma.InputJsonValue)
      : undefined,
    },
  });

  if (balanceAfter != null) {
    await maybeCaptureDailyBalanceSnapshot(input.provider, balanceAfter);
  }

  await syncCustomerBillingFromCostEvent(existing.id).catch((err) => {
    console.error("[billing] syncCustomerBillingFromCostEvent", err);
  });
}

export type RecordCostEventInput = {
  provider: string;
  actionType: CostActionType;
  projectId?: string | null;
  userId?: string | null;
  relatedJobId?: string | null;
  relatedExportId?: string | null;
  status: string;
  unitType: CostUnitType;
  unitsUsed: number;
  unitCostUsd: number;
  isEstimated?: boolean;
  needsReview?: boolean;
  estimateReason?: string | null;
  metadataJson?: Prisma.InputJsonValue;
  /** Studio instrumentation — do not create CustomerBillingEvent. */
  skipBillingSync?: boolean;
};

/** Wallet-linked cost event — returns id, never syncs legacy CustomerBillingEvent. */
export async function recordCostEventLinked(input: RecordCostEventInput): Promise<string> {
  const internalCostUsd = unitsToTotalCostUsd(input.unitsUsed, input.unitCostUsd);
  const status = normalizeStatus(input.status);

  const row = await prisma.providerCostEvent.create({
    data: {
      provider: input.provider,
      actionType: input.actionType,
      projectId: input.projectId ?? null,
      userId: input.userId ?? null,
      relatedJobId: input.relatedJobId?.trim() || null,
      relatedExportId: input.relatedExportId?.trim() || null,
      providerJobId:
        input.provider === "vidu" && input.relatedJobId?.trim() ?
          input.relatedJobId.trim()
        : null,
      unitsUsed: input.unitsUsed,
      unitType: input.unitType,
      unitCostUsd: input.unitCostUsd,
      internalCostUsd,
      totalCostUsd: internalCostUsd,
      status,
      isEstimated: input.isEstimated ?? true,
      needsReview: input.needsReview ?? false,
      estimateReason: input.estimateReason ?? null,
      metadataJson: {
        ...((input.metadataJson as Record<string, unknown> | undefined) ?? {}),
        studioWalletBilling: true,
      } as Prisma.InputJsonValue,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  return row.id;
}

/** One-shot cost event (no balance delta — e.g. OCR, storage, internal merge). */
export async function recordCostEvent(input: RecordCostEventInput): Promise<void> {
  const internalCostUsd = unitsToTotalCostUsd(input.unitsUsed, input.unitCostUsd);
  const status = normalizeStatus(input.status);

  const row = await prisma.providerCostEvent.create({
    data: {
      provider: input.provider,
      actionType: input.actionType,
      projectId: input.projectId ?? null,
      userId: input.userId ?? null,
      relatedJobId: input.relatedJobId?.trim() || null,
      relatedExportId: input.relatedExportId?.trim() || null,
      providerJobId:
        input.provider === "vidu" && input.relatedJobId?.trim() ?
          input.relatedJobId.trim()
        : null,
      unitsUsed: input.unitsUsed,
      unitType: input.unitType,
      unitCostUsd: input.unitCostUsd,
      internalCostUsd,
      totalCostUsd: internalCostUsd,
      status,
      isEstimated: input.isEstimated ?? true,
      needsReview: input.needsReview ?? false,
      estimateReason: input.estimateReason ?? null,
      metadataJson: input.metadataJson ?? undefined,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  if (!input.skipBillingSync && !INSTRUMENTATION_ONLY_ACTIONS.has(input.actionType)) {
    await syncCustomerBillingFromCostEvent(row.id).catch((err) => {
      console.error("[billing] syncCustomerBillingFromCostEvent", err);
    });
  }
}

/** Vidu render — begin cost event alongside usage log. */
export async function beginViduRenderCostEvent(input: {
  providerJobId: string;
  projectId: string;
  userId: string;
  renderType: string;
  durationSeconds: number;
  instantMode?: string;
  renderVersionId?: string | null;
  renderVersionNumber?: number | null;
}): Promise<void> {
  await beginCostEvent({
    provider: "vidu",
    actionType: COST_ACTION.VIDU_RENDER,
    projectId: input.projectId,
    userId: input.userId,
    relatedJobId: input.providerJobId,
    unitType: COST_UNIT.CREDITS,
    unitCostUsd: UNIT_COST_USD.vidu_credit,
    metadataJson: {
      renderType: input.renderType,
      durationSeconds: input.durationSeconds,
      instantMode: input.instantMode,
      renderVersionId: input.renderVersionId ?? undefined,
      renderVersionNumber: input.renderVersionNumber ?? undefined,
    },
  });
}

export async function completeViduRenderCostEvent(input: {
  providerJobId: string;
  status: string;
  creditsUsed?: number | null;
  metadataJson?: Prisma.InputJsonValue;
}): Promise<void> {
  await completeCostEvent({
    provider: "vidu",
    actionType: COST_ACTION.VIDU_RENDER,
    relatedJobId: input.providerJobId,
    status: input.status,
    unitsUsedFromResponse: input.creditsUsed ?? null,
    unitCostUsd: UNIT_COST_USD.vidu_credit,
    metadataJson: input.metadataJson,
  });
}

export async function recordOpenAiOcrCostEvent(input: {
  projectId: string;
  userId: string;
  imageId: string;
  scanRequestId: string;
  mode: string;
  status: "completed" | "failed";
  blockCount?: number;
}): Promise<void> {
  await recordCostEvent({
    provider: "openai",
    actionType: COST_ACTION.OPENAI_OCR,
    projectId: input.projectId,
    userId: input.userId,
    relatedJobId: input.scanRequestId,
    status: input.status,
    unitType: COST_UNIT.REQUEST,
    unitsUsed: 1,
    unitCostUsd: UNIT_COST_USD.openai_ocr_call,
    isEstimated: true,
    estimateReason: "openai_no_balance_endpoint",
    metadataJson: {
      imageId: input.imageId,
      mode: input.mode,
      blockCount: input.blockCount ?? 0,
    },
  });
}

export async function recordLanguageExportCostEvent(input: {
  exportId: string;
  projectId: string;
  userId: string;
  languageCode: string;
  status: "completed" | "failed";
  outputBytes?: number;
}): Promise<void> {
  await recordCostEvent({
    provider: "internal",
    actionType: COST_ACTION.LANGUAGE_EXPORT,
    projectId: input.projectId,
    userId: input.userId,
    relatedExportId: input.exportId,
    status: input.status,
    unitType: COST_UNIT.USD,
    unitsUsed: 1,
    unitCostUsd: UNIT_COST_USD.language_export,
    isEstimated: true,
    estimateReason: "zero_direct_provider_cost",
    metadataJson: {
      languageCode: input.languageCode,
      outputBytes: input.outputBytes ?? 0,
      directCostUsd: 0,
    },
  });

  if (input.outputBytes && input.outputBytes > 0 && input.status === "completed") {
    await recordStorageUploadCostEvent({
      projectId: input.projectId,
      userId: input.userId,
      bytes: input.outputBytes,
      pathname: `language-export/${input.exportId}`,
      relatedExportId: input.exportId,
    }).catch(() => undefined);
  }
}

export async function recordStorageUploadCostEvent(input: {
  projectId: string;
  userId: string;
  bytes: number;
  pathname: string;
  relatedExportId?: string;
  relatedJobId?: string;
}): Promise<void> {
  if (!Number.isFinite(input.bytes) || input.bytes <= 0) {
    return;
  }
  await recordCostEvent({
    provider: "vercel_blob",
    actionType: COST_ACTION.STORAGE_UPLOAD,
    projectId: input.projectId,
    userId: input.userId,
    relatedExportId: input.relatedExportId,
    relatedJobId: input.relatedJobId,
    status: "completed",
    unitType: COST_UNIT.BYTES,
    unitsUsed: input.bytes,
    unitCostUsd: UNIT_COST_USD.storage_byte_day,
    isEstimated: true,
    estimateReason: "blob_storage_daily_prorate",
    metadataJson: { pathname: input.pathname },
  });
}

export async function recordVideoExportCostEvent(input: {
  exportId: string;
  projectId: string;
  userId: string;
  status: "completed" | "failed";
  provider?: string;
}): Promise<void> {
  await recordCostEvent({
    provider: input.provider ?? "internal",
    actionType: COST_ACTION.VIDEO_EXPORT,
    projectId: input.projectId,
    userId: input.userId,
    relatedExportId: input.exportId,
    status: input.status,
    unitType: COST_UNIT.USD,
    unitsUsed: 1,
    unitCostUsd: UNIT_COST_USD.internal_merge,
    isEstimated: true,
    estimateReason: "internal_merge_compute_estimate",
  });
}

export async function recordTextRerenderCostEvent(input: {
  projectId: string;
  userId: string;
  renderVersionId?: string;
  status: "completed" | "failed";
}): Promise<void> {
  await recordCostEvent({
    provider: "internal",
    actionType: COST_ACTION.TEXT_RERENDER,
    projectId: input.projectId,
    userId: input.userId,
    relatedJobId: input.renderVersionId,
    status: input.status,
    unitType: COST_UNIT.USD,
    unitsUsed: 1,
    unitCostUsd: UNIT_COST_USD.text_rerender,
    isEstimated: true,
    estimateReason: "zero_direct_provider_cost",
  });
}

/**
 * Per-render provider credit tracking via balance snapshots.
 * creditsUsed = creditsBefore - creditsAfter; totalCostUsd = creditsUsed × 0.005
 */

import { prisma } from "@/lib/prisma";
import { getViduCreditBalance } from "@/server/video-providers/vidu-credits";
import {
  CREDIT_UNIT_COST_USD,
  creditsToTotalCostUsd,
} from "@/server/provider-usage/credit-cost";
import { estimateCreditsForTransition } from "@/server/provider-usage/estimate-transition-credits";
import {
  beginViduRenderCostEvent,
  completeViduRenderCostEvent,
} from "@/server/provider-cost/provider-cost-event";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function fetchProviderBalance(provider: string): Promise<number | null> {
  if (provider !== "vidu") {
    return null;
  }
  const result = await getViduCreditBalance({ bypassCache: true });
  return result.ok && result.credits != null ? result.credits : null;
}

/** At most one snapshot per provider per UTC day. */
export async function maybeCaptureDailyBalanceSnapshot(
  provider: string,
  balance: number
): Promise<void> {
  const dayStart = startOfUtcDay(new Date());
  const existing = await prisma.providerCreditBalanceSnapshot.findFirst({
    where: { provider, capturedAt: { gte: dayStart } },
    select: { id: true },
  });
  if (existing) {
    return;
  }
  await prisma.providerCreditBalanceSnapshot.create({
    data: { provider, balance },
  });
}

export function resolveRenderTypeForProject(project: {
  projectType: string;
  instantMode: string;
  sourceProjectId: string | null;
}): string {
  if (project.sourceProjectId) {
    return "concept_render";
  }
  if (project.projectType === "classic") {
    return "classic";
  }
  if (project.instantMode === "story") {
    return "story_mode";
  }
  return "transition_mode";
}

export type BeginProviderUsageLogInput = {
  provider: string;
  providerJobId: string;
  projectId: string;
  userId: string;
  renderType: string;
  durationSeconds: number;
};

/** Record creditsBefore when a provider job starts. */
export async function beginProviderUsageLog(
  input: BeginProviderUsageLogInput
): Promise<void> {
  if (!input.providerJobId.trim()) {
    return;
  }

  const creditsBefore = await fetchProviderBalance(input.provider);
  if (creditsBefore != null) {
    await maybeCaptureDailyBalanceSnapshot(input.provider, creditsBefore);
  }

  const isEstimated = creditsBefore == null;
  await prisma.providerUsageLog.upsert({
    where: {
      provider_providerJobId: {
        provider: input.provider,
        providerJobId: input.providerJobId,
      },
    },
    create: {
      provider: input.provider,
      providerJobId: input.providerJobId,
      projectId: input.projectId,
      userId: input.userId,
      renderType: input.renderType,
      status: "generating",
      durationSeconds: input.durationSeconds,
      creditsBefore,
      creditUnitCostUsd: CREDIT_UNIT_COST_USD,
      isEstimated,
      estimateReason: isEstimated ? "credits_before_unavailable" : null,
      startedAt: new Date(),
    },
    update: {
      status: "generating",
      durationSeconds: input.durationSeconds,
      creditsBefore: creditsBefore ?? undefined,
      startedAt: new Date(),
      isEstimated: isEstimated ? true : undefined,
      estimateReason: isEstimated ? "credits_before_unavailable" : undefined,
    },
  });

  if (input.provider === "vidu") {
    await beginViduRenderCostEvent({
      providerJobId: input.providerJobId,
      projectId: input.projectId,
      userId: input.userId,
      renderType: input.renderType,
      durationSeconds: input.durationSeconds,
    }).catch((err) => {
      console.error("[provider-cost] beginViduRenderCostEvent", err);
    });
  }
}

export type CompleteProviderUsageLogInput = {
  provider: string;
  providerJobId: string;
  status: string;
  durationSeconds?: number;
  presetId?: string;
  viduDurationSeconds?: number | null;
  instantTransitionSeconds?: number;
  estimatedCredits?: number | null;
  transitionCount?: number;
};

function normalizeTerminalStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === "canceled") {
    return "cancelled";
  }
  if (s === "completed" || s === "failed" || s === "cancelled") {
    return s;
  }
  return status;
}

/** Record creditsAfter and compute creditsUsed when a job reaches a terminal state. */
export async function completeProviderUsageLog(
  input: CompleteProviderUsageLogInput
): Promise<void> {
  if (!input.providerJobId.trim()) {
    return;
  }

  const existing = await prisma.providerUsageLog.findUnique({
    where: {
      provider_providerJobId: {
        provider: input.provider,
        providerJobId: input.providerJobId,
      },
    },
  });

  if (!existing || existing.completedAt) {
    return;
  }

  const terminalStatus = normalizeTerminalStatus(input.status);
  const creditsAfter = await fetchProviderBalance(input.provider);

  let creditsUsed: number | null = null;
  let isEstimated = existing.isEstimated;
  let needsReview = false;
  let estimateReason = existing.estimateReason;

  if (existing.creditsBefore != null && creditsAfter != null) {
    creditsUsed = existing.creditsBefore - creditsAfter;
    isEstimated = false;
    estimateReason = null;
    if (creditsUsed < 0) {
      needsReview = true;
      estimateReason = "negative_credit_delta";
    } else if (creditsUsed === 0 && terminalStatus === "completed") {
      needsReview = true;
      estimateReason = "zero_credit_delta_possible_concurrency";
    }
  } else {
    isEstimated = true;
    const duration =
      input.durationSeconds ??
      existing.durationSeconds ??
      input.viduDurationSeconds ??
      input.instantTransitionSeconds ??
      5;
    creditsUsed = estimateCreditsForTransition({
      presetId: input.presetId ?? "standard",
      viduDurationSeconds: input.viduDurationSeconds ?? duration,
      instantTransitionSeconds: input.instantTransitionSeconds ?? duration,
      estimatedCredits: input.estimatedCredits ?? null,
      transitionCount: Math.max(1, input.transitionCount ?? 1),
    });
    if (existing.creditsBefore == null && creditsAfter == null) {
      estimateReason = "credits_before_and_after_unavailable";
    } else if (creditsAfter == null) {
      estimateReason = "credits_after_unavailable";
    } else {
      estimateReason = "credits_before_unavailable";
    }
  }

  const totalCostUsd = creditsToTotalCostUsd(creditsUsed ?? 0);

  await prisma.providerUsageLog.update({
    where: { id: existing.id },
    data: {
      status: terminalStatus,
      creditsAfter,
      creditsUsed,
      totalCostUsd,
      isEstimated,
      needsReview,
      estimateReason,
      completedAt: new Date(),
      durationSeconds: input.durationSeconds ?? existing.durationSeconds,
    },
  });

  if (creditsAfter != null) {
    await maybeCaptureDailyBalanceSnapshot(input.provider, creditsAfter);
  }

  if (input.provider === "vidu") {
    await completeViduRenderCostEvent({
      providerJobId: input.providerJobId,
      status: terminalStatus,
      creditsUsed,
    }).catch((err) => {
      console.error("[provider-cost] completeViduRenderCostEvent", err);
    });
  }
}

/** Log a failed job start (no providerJobId) with estimated credits. */
export async function logFailedProviderStart(input: {
  provider: string;
  projectId: string;
  userId: string;
  renderType: string;
  durationSeconds: number;
  presetId: string;
  estimatedCredits?: number | null;
  transitionCount?: number;
  viduDurationSeconds?: number | null;
  instantTransitionSeconds?: number;
  errorMessage?: string;
}): Promise<void> {
  const creditsUsed = estimateCreditsForTransition({
    presetId: input.presetId,
    viduDurationSeconds: input.viduDurationSeconds ?? input.durationSeconds,
    instantTransitionSeconds: input.instantTransitionSeconds ?? input.durationSeconds,
    estimatedCredits: input.estimatedCredits ?? null,
    transitionCount: Math.max(1, input.transitionCount ?? 1),
  });

  await prisma.providerUsageLog.create({
    data: {
      provider: input.provider,
      providerJobId: null,
      projectId: input.projectId,
      userId: input.userId,
      renderType: input.renderType,
      status: "failed",
      durationSeconds: input.durationSeconds,
      creditsUsed,
      creditUnitCostUsd: CREDIT_UNIT_COST_USD,
      totalCostUsd: creditsToTotalCostUsd(creditsUsed),
      isEstimated: true,
      needsReview: true,
      estimateReason: input.errorMessage ?? "provider_start_failed",
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
}

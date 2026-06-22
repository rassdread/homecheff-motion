import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildEditorPremiumProviderCallId } from "@/lib/editor-premium-vision-credits";
import {
  COST_ACTION,
  COST_UNIT,
  UNIT_COST_USD,
} from "@/server/provider-cost/cost-event-types";
import { recordCostEvent } from "@/server/provider-cost/provider-cost-event";
import type { OpenAiVisionUsageMetrics } from "@/server/openai/openai-vision-usage";

export type EditorPremiumProviderCostInput = {
  userId: string;
  route: "style_dna" | "vision_parts";
  analysisRunId?: string | null;
  analysisId?: string | null;
  sessionId?: string | null;
  projectId?: string | null;
  assetId?: string | null;
  status: "completed" | "failed";
  metrics: OpenAiVisionUsageMetrics;
  errorCode?: string | null;
  derivationJobId?: string | null;
};

function buildPremiumProviderMetadata(
  input: EditorPremiumProviderCostInput,
  providerCallId: string
): Prisma.InputJsonValue {
  return {
    analysisType: "premium",
    provider: "openai",
    route: input.route,
    model: input.metrics.model,
    userId: input.userId,
    projectId: input.projectId ?? null,
    assetId: input.assetId ?? null,
    analysisRunId: input.analysisRunId ?? null,
    analysisId: input.analysisId ?? null,
    providerCallId,
    inputTokens: input.metrics.inputTokens ?? null,
    outputTokens: input.metrics.outputTokens ?? null,
    totalTokens: input.metrics.totalTokens ?? null,
    imageCount: input.metrics.imageCount,
    estimatedCostUsd: input.metrics.estimatedCostUsd,
    actualCostUsd: input.metrics.actualCostUsd ?? null,
    durationMs: input.metrics.durationMs,
    status: input.status,
    errorCode: input.errorCode ?? null,
    costSource: input.metrics.costSource,
    derivationJobId: input.derivationJobId ?? null,
  };
}

/** Max one completed ProviderCostEvent per providerCallId (analysisRunId + route). */
export async function recordEditorPremiumProviderCost(
  input: EditorPremiumProviderCostInput
): Promise<string | null> {
  const providerCallId = buildEditorPremiumProviderCallId({
    analysisRunId: input.analysisRunId,
    sessionId: input.sessionId,
    analysisId: input.analysisId,
    route: input.route,
  });

  const existing = await prisma.providerCostEvent.findFirst({
    where: {
      relatedJobId: providerCallId,
      actionType: COST_ACTION.OPENAI_VISION,
      provider: "openai",
      status: "completed",
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (existing && input.status === "completed") {
    return existing.id;
  }

  const unitsUsed = input.metrics.imageCount > 0 ? input.metrics.imageCount : 1;
  const isEstimated = input.metrics.costSource === "flat_estimate";

  await recordCostEvent({
    provider: "openai",
    actionType: COST_ACTION.OPENAI_VISION,
    userId: input.userId,
    projectId: input.projectId ?? null,
    relatedJobId: providerCallId,
    unitsUsed,
    unitType: COST_UNIT.REQUEST,
    unitCostUsd: UNIT_COST_USD.openai_vision_call,
    status: input.status,
    isEstimated,
    estimateReason: isEstimated ? "flat_estimate" : null,
    skipBillingSync: true,
    metadataJson: buildPremiumProviderMetadata(input, providerCallId),
  });

  const row = await prisma.providerCostEvent.findFirst({
    where: {
      relatedJobId: providerCallId,
      actionType: COST_ACTION.OPENAI_VISION,
      provider: "openai",
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return row?.id ?? null;
}

export async function sumEditorPremiumProviderCostUsd(input: {
  analysisRunId?: string | null;
  sessionId?: string | null;
  analysisId?: string | null;
}): Promise<{ estimateUsd: number; actualUsd: number }> {
  const runKey =
    input.analysisRunId?.trim() ||
    [input.sessionId?.trim(), input.analysisId?.trim()].filter(Boolean).join("::");
  if (!runKey) {
    return { estimateUsd: 0, actualUsd: 0 };
  }

  const rows = await prisma.providerCostEvent.findMany({
    where: {
      relatedJobId: { startsWith: `${runKey}::` },
      actionType: COST_ACTION.OPENAI_VISION,
      provider: "openai",
    },
    select: {
      totalCostUsd: true,
      metadataJson: true,
    },
  });

  let estimateUsd = 0;
  let actualUsd = 0;
  for (const row of rows) {
    estimateUsd += row.totalCostUsd ?? 0;
    const meta = row.metadataJson as { actualCostUsd?: number | null } | null;
    if (typeof meta?.actualCostUsd === "number") {
      actualUsd += meta.actualCostUsd;
    } else {
      actualUsd += row.totalCostUsd ?? 0;
    }
  }
  return { estimateUsd, actualUsd };
}

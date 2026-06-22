import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  COST_ACTION,
  COST_UNIT,
  UNIT_COST_USD,
} from "@/server/provider-cost/cost-event-types";
import { recordCostEvent } from "@/server/provider-cost/provider-cost-event";
import type { FusionWorkflowCostLog } from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import { fusionProfitMarginWarning } from "@/lib/editor-fusion-workflow-credits";

export type EditorFusionProviderCostInput = {
  userId: string;
  sessionId: string;
  workflowType: EditorFusionIntent;
  blueprintId?: string | null;
  status: "completed" | "failed";
  costLog: FusionWorkflowCostLog;
  provider?: string;
  model?: string;
  referenceCount?: number;
  providerSupportsMultiReference?: boolean;
  errorCode?: string | null;
};

function buildFusionRunId(input: EditorFusionProviderCostInput): string {
  const stamp = input.costLog.timestamp || new Date().toISOString();
  return `fusion_render::${input.sessionId}::${input.workflowType}::${stamp}`;
}

function buildFusionProviderMetadata(
  input: EditorFusionProviderCostInput,
  fusionRunId: string
): Prisma.InputJsonValue {
  return {
    fusionRunId,
    workflowType: input.workflowType,
    blueprintId: input.blueprintId ?? null,
    analysisCostUsd: input.costLog.analysisCostUsd,
    blueprintCostUsd: input.costLog.blueprintCostUsd,
    renderCostUsd: input.costLog.renderCostUsd,
    totalCostUsd: input.costLog.totalCostUsd,
    creditsCharged: input.costLog.creditsCharged,
    estimatedProfitUsd: input.costLog.estimatedProfitUsd,
    marginPercent: input.costLog.profitMarginPercent,
    marginStatus: fusionProfitMarginWarning(input.costLog),
    provider: input.provider ?? input.costLog.provider ?? "openai",
    model: input.model ?? input.costLog.model ?? null,
    imageCount: input.costLog.imageCount,
    referenceCount: input.referenceCount ?? input.costLog.referenceCount ?? 0,
    durationMs: input.costLog.durationMs ?? null,
    providerSupportsMultiReference: input.providerSupportsMultiReference ?? false,
    status: input.status,
    errorCode: input.errorCode ?? input.costLog.errorCode ?? null,
  };
}

export async function recordEditorFusionProviderCost(
  input: EditorFusionProviderCostInput
): Promise<string | null> {
  const fusionRunId = buildFusionRunId(input);
  const unitsUsed = Math.max(1, input.costLog.imageCount);

  await recordCostEvent({
    provider: input.provider ?? "openai",
    actionType: COST_ACTION.OPENAI_SCENE_IMAGE,
    userId: input.userId,
    projectId: input.sessionId,
    relatedJobId: fusionRunId,
    unitsUsed,
    unitType: COST_UNIT.REQUEST,
    unitCostUsd: UNIT_COST_USD.openai_scene_image,
    status: input.status,
    isEstimated: true,
    estimateReason: "fusion_render",
    skipBillingSync: true,
    metadataJson: buildFusionProviderMetadata(input, fusionRunId),
  });

  const row = await prisma.providerCostEvent.findFirst({
    where: {
      relatedJobId: fusionRunId,
      actionType: COST_ACTION.OPENAI_SCENE_IMAGE,
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  const marginStatus = fusionProfitMarginWarning(input.costLog);
  if (marginStatus === "loss" && typeof process !== "undefined") {
    // eslint-disable-next-line no-console
    console.error("[editor.fusion.cost] negative margin", input.costLog);
  } else if (marginStatus === "low" && typeof process !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn("[editor.fusion.cost] low margin", input.costLog);
  }

  return row?.id ?? null;
}

export function buildFusionWorkflowCostLog(input: {
  workflowType: EditorFusionIntent;
  creditsCharged: number;
  renderCostUsd: number;
  analysisCostUsd?: number;
  referenceCount?: number;
  imageCount?: number;
  durationMs?: number;
  status?: "completed" | "failed";
  errorCode?: string | null;
  provider?: string;
  model?: string;
}): FusionWorkflowCostLog {
  const analysisCostUsd = input.analysisCostUsd ?? 0;
  const blueprintCostUsd = 0.001;
  const totalCostUsd = input.renderCostUsd + analysisCostUsd + blueprintCostUsd;
  const revenueUsd = input.creditsCharged * 0.005;
  const estimatedProfitUsd = revenueUsd - totalCostUsd;
  const profitMarginPercent =
    revenueUsd > 0 ? Math.round((estimatedProfitUsd / revenueUsd) * 100) : 0;

  return {
    workflowType: input.workflowType,
    analysisCostUsd,
    blueprintCostUsd,
    renderCostUsd: input.renderCostUsd,
    totalCostUsd,
    creditsCharged: input.creditsCharged,
    estimatedProfitUsd,
    profitMarginPercent,
    provider: input.provider,
    model: input.model,
    imageCount: input.imageCount ?? 1,
    referenceCount: input.referenceCount,
    durationMs: input.durationMs,
    status: input.status ?? "completed",
    errorCode: input.errorCode ?? null,
    timestamp: new Date().toISOString(),
  };
}

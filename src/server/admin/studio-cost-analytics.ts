/**
 * Studio cost analytics for admin dashboards — extends existing render analytics patterns.
 */

import {
  aggregateFeatureCostSummary,
  aggregateUserCostSummary,
  buildPreviewDuplicationReport,
  startOfPeriod,
  type FeatureCostSummaryRow,
  type PreviewDuplicationReport,
  type ProviderCostBucket,
  type UserCostSummaryRow,
} from "@/server/provider-cost/studio-cost-aggregation";
import { prisma } from "@/lib/prisma";
import { COST_ACTION } from "@/server/provider-cost/cost-event-types";

export type StudioCostAnalytics = {
  last30Days: ProviderCostBucket;
  studioOpenAiUsd: number;
  studioElevenLabsUsd: number;
  featureBreakdown: FeatureCostSummaryRow[];
  previewDuplication: PreviewDuplicationReport;
  topUsersByStudioCost: UserCostSummaryRow[];
};

const STUDIO_ACTIONS = new Set([
  COST_ACTION.OPENAI_SCENE_IMAGE,
  COST_ACTION.OPENAI_VISION,
  COST_ACTION.OPENAI_CHARACTER_ANALYSIS,
  COST_ACTION.OPENAI_TRANSLATION,
  COST_ACTION.ELEVENLABS_TTS,
  COST_ACTION.ELEVENLABS_STT,
  COST_ACTION.ELEVENLABS_CLONE,
]);

function eventCost(row: { internalCostUsd: number | null; totalCostUsd: number | null }): number {
  return row.internalCostUsd ?? row.totalCostUsd ?? 0;
}

export async function buildStudioCostAnalytics(): Promise<StudioCostAnalytics> {
  const since30 = startOfPeriod(30);

  const events = await prisma.providerCostEvent.findMany({
    where: {
      createdAt: { gte: since30 },
      actionType: { in: [...STUDIO_ACTIONS] },
    },
    select: {
      actionType: true,
      internalCostUsd: true,
      totalCostUsd: true,
      userId: true,
    },
  });

  let studioOpenAiUsd = 0;
  let studioElevenLabsUsd = 0;
  const userTotals = new Map<string, number>();

  for (const e of events) {
    const cost = eventCost(e);
    if (
      e.actionType === COST_ACTION.ELEVENLABS_TTS ||
      e.actionType === COST_ACTION.ELEVENLABS_STT ||
      e.actionType === COST_ACTION.ELEVENLABS_CLONE
    ) {
      studioElevenLabsUsd += cost;
    } else {
      studioOpenAiUsd += cost;
    }
    if (e.userId) {
      userTotals.set(e.userId, (userTotals.get(e.userId) ?? 0) + cost);
    }
  }

  const [featureBreakdown, previewDuplication] = await Promise.all([
    aggregateFeatureCostSummary({ since: since30, limit: 30 }),
    buildPreviewDuplicationReport({ since: since30 }),
  ]);

  const topUserIds = [...userTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const topUsersByStudioCost = await Promise.all(
    topUserIds.map((userId) => aggregateUserCostSummary({ userId, since: since30 }))
  );

  const last30Days: ProviderCostBucket = {
    openaiUsd: Math.round(studioOpenAiUsd * 10000) / 10000,
    elevenlabsUsd: Math.round(studioElevenLabsUsd * 10000) / 10000,
    viduUsd: 0,
    storageUsd: 0,
    unknownUsd: 0,
    totalUsd: Math.round((studioOpenAiUsd + studioElevenLabsUsd) * 10000) / 10000,
    eventCount: events.length,
  };

  return {
    last30Days,
    studioOpenAiUsd: last30Days.openaiUsd,
    studioElevenLabsUsd: last30Days.elevenlabsUsd,
    featureBreakdown,
    previewDuplication,
    topUsersByStudioCost,
  };
}

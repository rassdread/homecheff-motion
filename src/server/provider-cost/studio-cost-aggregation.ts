/**
 * Studio cost aggregation from ProviderCostEvent — admin/audit only.
 */

import { prisma } from "@/lib/prisma";
import { COST_ACTION } from "@/server/provider-cost/cost-event-types";

const OPENAI_ACTIONS = new Set<string>([
  COST_ACTION.OPENAI_OCR,
  COST_ACTION.OPENAI_SCENE_IMAGE,
  COST_ACTION.OPENAI_VISION,
  COST_ACTION.OPENAI_CHARACTER_ANALYSIS,
  COST_ACTION.OPENAI_TRANSLATION,
]);

const ELEVENLABS_ACTIONS = new Set<string>([
  COST_ACTION.ELEVENLABS_TTS,
  COST_ACTION.ELEVENLABS_STT,
  COST_ACTION.ELEVENLABS_CLONE,
]);

const VIDU_ACTIONS = new Set<string>([COST_ACTION.VIDU_RENDER]);

const STORAGE_PROVIDERS = new Set(["vercel_blob"]);

export type ProviderCostBucket = {
  openaiUsd: number;
  elevenlabsUsd: number;
  viduUsd: number;
  storageUsd: number;
  unknownUsd: number;
  totalUsd: number;
  eventCount: number;
};

export type ProjectCostSummaryRow = ProviderCostBucket & {
  projectId: string | null;
  storyboardId: string | null;
};

export type UserCostSummaryRow = ProviderCostBucket & {
  userId: string;
  email: string | null;
};

export type FeatureCostSummaryRow = {
  feature: string;
  provider: string;
  actionType: string;
  callCount: number;
  totalCostUsd: number;
  avgCostUsd: number;
  topUserIds: string[];
};

export type PreviewDuplicationReport = {
  totalPreviewEvents: number;
  uniqueHashes: number;
  duplicateEvents: number;
  estimatedWasteUsd: number;
  cacheHitEvents: number;
  cacheMissEvents: number;
  cacheHitRate: number;
  estimatedCacheSavingsUsd: number;
  topDuplicates: Array<{
    previewDedupHash: string;
    repeatCount: number;
    estimatedWasteUsd: number;
    voiceId?: string;
  }>;
  topPreviewUsers: Array<{ userId: string; previewCount: number; cacheHits: number }>;
  topPreviewVoices: Array<{ voiceId: string; previewCount: number; cacheHits: number }>;
  topPreviewTexts: Array<{ previewDedupHash: string; previewCount: number; voiceId?: string }>;
};

function eventCostUsd(row: { internalCostUsd: number | null; totalCostUsd: number | null }): number {
  return row.internalCostUsd ?? row.totalCostUsd ?? 0;
}

function emptyBucket(): ProviderCostBucket {
  return {
    openaiUsd: 0,
    elevenlabsUsd: 0,
    viduUsd: 0,
    storageUsd: 0,
    unknownUsd: 0,
    totalUsd: 0,
    eventCount: 0,
  };
}

function addEventToBucket(bucket: ProviderCostBucket, row: {
  provider: string;
  actionType: string;
  internalCostUsd: number | null;
  totalCostUsd: number | null;
}): void {
  const cost = eventCostUsd(row);
  bucket.eventCount += 1;
  bucket.totalUsd += cost;
  if (OPENAI_ACTIONS.has(row.actionType)) {
    bucket.openaiUsd += cost;
  } else if (ELEVENLABS_ACTIONS.has(row.actionType)) {
    bucket.elevenlabsUsd += cost;
  } else if (VIDU_ACTIONS.has(row.actionType)) {
    bucket.viduUsd += cost;
  } else if (STORAGE_PROVIDERS.has(row.provider) || row.actionType === COST_ACTION.STORAGE_UPLOAD) {
    bucket.storageUsd += cost;
  } else if (row.provider === "internal" && row.actionType !== COST_ACTION.VIDEO_EXPORT) {
    bucket.unknownUsd += cost;
  } else {
    bucket.unknownUsd += cost;
  }
}

function roundUsd(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function finalizeBucket(bucket: ProviderCostBucket): ProviderCostBucket {
  return {
    openaiUsd: roundUsd(bucket.openaiUsd),
    elevenlabsUsd: roundUsd(bucket.elevenlabsUsd),
    viduUsd: roundUsd(bucket.viduUsd),
    storageUsd: roundUsd(bucket.storageUsd),
    unknownUsd: roundUsd(bucket.unknownUsd),
    totalUsd: roundUsd(bucket.totalUsd),
    eventCount: bucket.eventCount,
  };
}

function metaStoryboardId(metadataJson: unknown): string | null {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }
  const id = (metadataJson as Record<string, unknown>).storyboardId;
  return typeof id === "string" ? id : null;
}

function metaFeature(metadataJson: unknown): string | null {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }
  const f = (metadataJson as Record<string, unknown>).feature;
  return typeof f === "string" ? f : null;
}

function metaPreviewHash(metadataJson: unknown): string | null {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }
  const h = (metadataJson as Record<string, unknown>).previewDedupHash;
  return typeof h === "string" ? h : null;
}

export async function aggregateProjectCostSummary(params: {
  projectId?: string;
  storyboardId?: string;
}): Promise<ProjectCostSummaryRow> {
  const where =
    params.projectId
      ? { projectId: params.projectId }
      : params.storyboardId
        ? {
            OR: [
              { metadataJson: { path: ["storyboardId"], equals: params.storyboardId } },
            ],
          }
        : {};

  const events = await prisma.providerCostEvent.findMany({
    where,
    select: {
      provider: true,
      actionType: true,
      internalCostUsd: true,
      totalCostUsd: true,
      projectId: true,
      metadataJson: true,
    },
  });

  const bucket = emptyBucket();
  for (const e of events) {
    addEventToBucket(bucket, e);
  }

  return {
    ...finalizeBucket(bucket),
    projectId: params.projectId ?? events[0]?.projectId ?? null,
    storyboardId: params.storyboardId ?? metaStoryboardId(events[0]?.metadataJson) ?? null,
  };
}

export async function aggregateUserCostSummary(params: {
  userId: string;
  since?: Date;
}): Promise<UserCostSummaryRow> {
  const events = await prisma.providerCostEvent.findMany({
    where: {
      userId: params.userId,
      ...(params.since ? { createdAt: { gte: params.since } } : {}),
    },
    select: {
      provider: true,
      actionType: true,
      internalCostUsd: true,
      totalCostUsd: true,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true },
  });

  const bucket = emptyBucket();
  for (const e of events) {
    addEventToBucket(bucket, e);
  }

  return {
    ...finalizeBucket(bucket),
    userId: params.userId,
    email: user?.email ?? null,
  };
}

export async function aggregateFeatureCostSummary(params?: {
  since?: Date;
  limit?: number;
}): Promise<FeatureCostSummaryRow[]> {
  const events = await prisma.providerCostEvent.findMany({
    where: params?.since ? { createdAt: { gte: params.since } } : undefined,
    select: {
      provider: true,
      actionType: true,
      userId: true,
      internalCostUsd: true,
      totalCostUsd: true,
      metadataJson: true,
    },
  });

  const map = new Map<
    string,
    {
      feature: string;
      provider: string;
      actionType: string;
      callCount: number;
      totalCostUsd: number;
      userCounts: Map<string, number>;
    }
  >();

  for (const e of events) {
    const feature = metaFeature(e.metadataJson) ?? e.actionType;
    const key = `${e.provider}:${e.actionType}:${feature}`;
    const cur = map.get(key) ?? {
      feature,
      provider: e.provider,
      actionType: e.actionType,
      callCount: 0,
      totalCostUsd: 0,
      userCounts: new Map<string, number>(),
    };
    cur.callCount += 1;
    cur.totalCostUsd += eventCostUsd(e);
    if (e.userId) {
      cur.userCounts.set(e.userId, (cur.userCounts.get(e.userId) ?? 0) + 1);
    }
    map.set(key, cur);
  }

  const limit = params?.limit ?? 50;
  return [...map.values()]
    .map((row) => ({
      feature: row.feature,
      provider: row.provider,
      actionType: row.actionType,
      callCount: row.callCount,
      totalCostUsd: roundUsd(row.totalCostUsd),
      avgCostUsd: row.callCount > 0 ? roundUsd(row.totalCostUsd / row.callCount) : 0,
      topUserIds: [...row.userCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id),
    }))
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
    .slice(0, limit);
}

function metaVoiceId(metadataJson: unknown): string | undefined {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return undefined;
  }
  const voiceId = (metadataJson as Record<string, unknown>).voiceId;
  return typeof voiceId === "string" && voiceId.trim() ? voiceId : undefined;
}

function metaEstimatedSavings(metadataJson: unknown): number {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return 0;
  }
  const v = (metadataJson as Record<string, unknown>).estimatedCostSavedUsd;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export async function buildPreviewDuplicationReport(params?: {
  since?: Date;
}): Promise<PreviewDuplicationReport> {
  const sinceFilter = params?.since ? { createdAt: { gte: params.since } } : {};

  const [ttsEvents, cacheHitEvents] = await Promise.all([
    prisma.providerCostEvent.findMany({
      where: {
        actionType: COST_ACTION.ELEVENLABS_TTS,
        ...sinceFilter,
      },
      select: {
        userId: true,
        internalCostUsd: true,
        totalCostUsd: true,
        metadataJson: true,
      },
    }),
    prisma.providerCostEvent.findMany({
      where: {
        actionType: COST_ACTION.VOICE_PREVIEW_CACHE_HIT,
        ...sinceFilter,
      },
      select: {
        userId: true,
        metadataJson: true,
      },
    }),
  ]);

  const previewFeatures = new Set([
    "voice_preview_character",
    "voice_preview_draft",
    "voice_preview_persona",
  ]);

  const byHash = new Map<
    string,
    { count: number; costUsd: number; voiceId?: string }
  >();
  const byUser = new Map<string, { previewCount: number; cacheHits: number }>();
  const byVoice = new Map<string, { previewCount: number; cacheHits: number }>();

  let totalPreviewEvents = 0;
  let cacheMissEvents = 0;

  for (const e of ttsEvents) {
    const feature = metaFeature(e.metadataJson);
    if (!feature || !previewFeatures.has(feature)) {
      continue;
    }
    const hash = metaPreviewHash(e.metadataJson);
    if (!hash) {
      continue;
    }
    totalPreviewEvents += 1;
    cacheMissEvents += 1;
    const cost = eventCostUsd(e);
    const voiceId = metaVoiceId(e.metadataJson);
    const cur = byHash.get(hash) ?? { count: 0, costUsd: 0, voiceId };
    cur.count += 1;
    cur.costUsd += cost;
    if (voiceId) {
      cur.voiceId = voiceId;
    }
    byHash.set(hash, cur);

    if (e.userId) {
      const userRow = byUser.get(e.userId) ?? { previewCount: 0, cacheHits: 0 };
      userRow.previewCount += 1;
      byUser.set(e.userId, userRow);
    }
    if (voiceId) {
      const voiceRow = byVoice.get(voiceId) ?? { previewCount: 0, cacheHits: 0 };
      voiceRow.previewCount += 1;
      byVoice.set(voiceId, voiceRow);
    }
  }

  let estimatedCacheSavingsUsd = 0;
  for (const e of cacheHitEvents) {
    const feature = metaFeature(e.metadataJson);
    if (feature !== "voice_preview_cache_hit") {
      continue;
    }
    totalPreviewEvents += 1;
    estimatedCacheSavingsUsd += metaEstimatedSavings(e.metadataJson);
    const hash = metaPreviewHash(e.metadataJson);
    const voiceId = metaVoiceId(e.metadataJson);
    if (hash) {
      const cur = byHash.get(hash) ?? { count: 0, costUsd: 0, voiceId };
      cur.count += 1;
      if (voiceId) {
        cur.voiceId = voiceId;
      }
      byHash.set(hash, cur);
    }
    if (e.userId) {
      const userRow = byUser.get(e.userId) ?? { previewCount: 0, cacheHits: 0 };
      userRow.previewCount += 1;
      userRow.cacheHits += 1;
      byUser.set(e.userId, userRow);
    }
    if (voiceId) {
      const voiceRow = byVoice.get(voiceId) ?? { previewCount: 0, cacheHits: 0 };
      voiceRow.previewCount += 1;
      voiceRow.cacheHits += 1;
      byVoice.set(voiceId, voiceRow);
    }
  }

  let duplicateEvents = 0;
  let estimatedWasteUsd = 0;
  const topDuplicates: PreviewDuplicationReport["topDuplicates"] = [];
  const topPreviewTexts: PreviewDuplicationReport["topPreviewTexts"] = [];

  for (const [hash, data] of byHash.entries()) {
    topPreviewTexts.push({
      previewDedupHash: hash,
      previewCount: data.count,
      voiceId: data.voiceId,
    });
    if (data.count > 1) {
      duplicateEvents += data.count - 1;
      const waste = (data.costUsd / data.count) * (data.count - 1);
      estimatedWasteUsd += waste;
      topDuplicates.push({
        previewDedupHash: hash,
        repeatCount: data.count,
        estimatedWasteUsd: roundUsd(waste),
        voiceId: data.voiceId,
      });
    }
  }

  topDuplicates.sort((a, b) => b.estimatedWasteUsd - a.estimatedWasteUsd);
  topPreviewTexts.sort((a, b) => b.previewCount - a.previewCount);

  const cacheHitCount = cacheHitEvents.filter(
    (e) => metaFeature(e.metadataJson) === "voice_preview_cache_hit"
  ).length;
  const cacheHitRate =
    totalPreviewEvents > 0 ? Math.round((cacheHitCount / totalPreviewEvents) * 1000) / 1000 : 0;

  const topPreviewUsers = [...byUser.entries()]
    .map(([userId, row]) => ({ userId, ...row }))
    .sort((a, b) => b.previewCount - a.previewCount)
    .slice(0, 10);

  const topPreviewVoices = [...byVoice.entries()]
    .map(([voiceId, row]) => ({ voiceId, ...row }))
    .sort((a, b) => b.previewCount - a.previewCount)
    .slice(0, 10);

  return {
    totalPreviewEvents,
    uniqueHashes: byHash.size,
    duplicateEvents,
    estimatedWasteUsd: roundUsd(estimatedWasteUsd),
    cacheHitEvents: cacheHitCount,
    cacheMissEvents,
    cacheHitRate,
    estimatedCacheSavingsUsd: roundUsd(estimatedCacheSavingsUsd),
    topDuplicates: topDuplicates.slice(0, 20),
    topPreviewUsers,
    topPreviewVoices,
    topPreviewTexts: topPreviewTexts.slice(0, 20),
  };
}

export function startOfPeriod(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

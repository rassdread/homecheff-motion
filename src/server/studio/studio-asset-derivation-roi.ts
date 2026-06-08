/**
 * ROI aggregation for reference-derived assets — reads ProviderCostEvent metadata only.
 */

import { prisma } from "@/lib/prisma";
import { DERIVATION_TIME_SAVED_MINUTES } from "@/lib/studio-asset-style-dna";
import type { AssetDerivationRoiSummary } from "@/types/studio-asset-derivation";

function metaField(metadataJson: unknown, key: string): string | null {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }
  const v = (metadataJson as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

function metaBool(metadataJson: unknown, key: string): boolean {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return false;
  }
  return (metadataJson as Record<string, unknown>)[key] === true;
}

export async function buildAssetDerivationRoiSummary(): Promise<AssetDerivationRoiSummary> {
  const events = await prisma.providerCostEvent.findMany({
    where: {
      metadataJson: {
        path: ["feature"],
        equals: "asset_derivation",
      },
    },
    select: {
      internalCostUsd: true,
      totalCostUsd: true,
      metadataJson: true,
    },
  });

  let visionCallCount = 0;
  let generationCallCount = 0;
  let acceptedCount = 0;
  let totalCostUsd = 0;
  const bySourceKind: Record<string, number> = {};
  const byTargetKind: Record<string, number> = {};
  const sourceCounts = new Map<string, { name: string; kind: string; count: number }>();

  const derivationJobs = new Set<string>();

  for (const e of events) {
    const cost = e.internalCostUsd ?? e.totalCostUsd ?? 0;
    totalCostUsd += cost;
    const phase = metaField(e.metadataJson, "derivationPhase");
    if (phase === "vision") {
      visionCallCount += 1;
    } else if (phase === "generate") {
      generationCallCount += 1;
    }
    if (metaBool(e.metadataJson, "derivationAccepted")) {
      acceptedCount += 1;
    }

    const jobId = metaField(e.metadataJson, "derivationJobId");
    if (jobId) {
      derivationJobs.add(jobId);
    }

    const sourceKind = metaField(e.metadataJson, "sourceKind");
    if (sourceKind) {
      bySourceKind[sourceKind] = (bySourceKind[sourceKind] ?? 0) + 1;
    }
    const targetKind = metaField(e.metadataJson, "targetKind");
    if (targetKind) {
      byTargetKind[targetKind] = (byTargetKind[targetKind] ?? 0) + 1;
    }

    const sourceAssetId = metaField(e.metadataJson, "sourceAssetId");
    const sourceName = metaField(e.metadataJson, "sourceAssetName");
    if (sourceAssetId && sourceName && sourceKind) {
      const cur = sourceCounts.get(sourceAssetId) ?? { name: sourceName, kind: sourceKind, count: 0 };
      cur.count += 1;
      sourceCounts.set(sourceAssetId, cur);
    }
  }

  const derivedAssetCount = derivationJobs.size;
  const totalCalls = visionCallCount + generationCallCount;
  const acceptanceRatePercent =
    generationCallCount > 0 ? Math.round((acceptedCount / generationCallCount) * 1000) / 10 : 0;

  const topSourceAssets = [...sourceCounts.entries()]
    .map(([assetId, row]) => ({
      assetId,
      name: row.name,
      kind: row.kind,
      derivationCount: row.count,
    }))
    .sort((a, b) => b.derivationCount - a.derivationCount)
    .slice(0, 10);

  return {
    derivedAssetCount,
    visionCallCount,
    generationCallCount,
    acceptedCount,
    acceptanceRatePercent,
    avgCostUsd: totalCalls > 0 ? Math.round((totalCostUsd / totalCalls) * 10000) / 10000 : 0,
    avgTimeSavedMinutes: DERIVATION_TIME_SAVED_MINUTES,
    bySourceKind,
    byTargetKind,
    topSourceAssets,
  };
}

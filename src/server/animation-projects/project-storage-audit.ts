/**
 * Per-project video blob storage audit — HEAD probes, totals, retention guidance.
 */

import { estimateMonthlyStorageCostUsd, estimateTransferCostUsd } from "@/lib/blob-storage-pricing";
import { sumNullableBytes } from "@/lib/format-storage-bytes";
import {
  buildProjectVideoVersionCatalog,
  normalizeLanguageExportRows,
  type ProjectVideoVersionItem,
} from "@/lib/project-video-versions";
import { rawExportUrlForDownload } from "@/server/instant-premium/playback-debug";
import { probeProviderBlobMetadata } from "@/server/instant-premium/canonical-provider-video";
import type { AnimationProjectWithMedia } from "@/server/animation-projects/queries";
import type {
  AdminProjectStorageRow,
  AdminStorageAuditSummary,
  ProjectStorageAsset,
  ProjectStorageAssetKind,
  ProjectStorageAudit,
  ProjectStorageBreakdown,
  StorageRetentionRecommendationId,
} from "@/types/storage-audit";

export type {
  AdminProjectStorageRow,
  AdminStorageAuditSummary,
  ProjectStorageAsset,
  ProjectStorageAssetKind,
  ProjectStorageAudit,
  ProjectStorageBreakdown,
  StorageRetentionRecommendationId,
} from "@/types/storage-audit";
export { buildSizeByUrlMap } from "@/types/storage-audit";

export type ProbeBlobMetadataFn = (
  url: string
) => Promise<{ blobExists: boolean; contentLength: number | null; mimeType: string | null }>;

type UrlEntry = {
  id: string;
  kind: ProjectStorageAssetKind;
  label: string;
  languageCode?: string;
  url: string;
  createdAt?: string | null;
  status?: string;
};

function uniqueUrlEntries(entries: UrlEntry[]): UrlEntry[] {
  const seen = new Set<string>();
  const result: UrlEntry[] = [];
  for (const entry of entries) {
    const key = entry.url.trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }
  return result;
}

export function collectProjectStorageUrlEntries(project: AnimationProjectWithMedia): UrlEntry[] {
  const entries: UrlEntry[] = [];
  const exportWithUrl = project.exports.find((row) => row.outputVideoUrl?.trim());
  const originalUrl = rawExportUrlForDownload(project, exportWithUrl);
  if (originalUrl?.trim()) {
    entries.push({
      id: "original",
      kind: "original",
      label: "Original final video",
      url: originalUrl.trim(),
      createdAt: exportWithUrl?.createdAt?.toISOString() ?? null,
      status: exportWithUrl?.status ?? "completed",
    });
  }

  const cleanUrl = project.instantCleanFinalVideoUrl?.trim();
  if (cleanUrl) {
    entries.push({
      id: "clean",
      kind: "clean",
      label: "Clean video",
      url: cleanUrl,
      createdAt: project.updatedAt.toISOString(),
      status: "completed",
    });
  }

  const previousUrl = project.instantPreviousFinalVideoUrl?.trim();
  if (previousUrl) {
    entries.push({
      id: "previous-final",
      kind: "previous_final",
      label: "Previous final video",
      url: previousUrl,
      createdAt: project.instantFinalRebuiltAt?.toISOString() ?? null,
      status: "archived",
    });
  }

  for (const row of project.languageExports) {
    const url = row.outputVideoUrl?.trim();
    if (!url || row.status !== "completed") {
      continue;
    }
    entries.push({
      id: `language-${row.languageCode}-v${row.version}`,
      kind: "language",
      label: row.languageLabel || row.languageCode,
      languageCode: row.languageCode,
      url,
      createdAt: row.createdAt.toISOString(),
      status: row.status,
    });
  }

  for (const transition of project.transitions) {
    const url = transition.outputVideoUrl?.trim();
    if (!url || transition.status !== "completed") {
      continue;
    }
    entries.push({
      id: `segment-${transition.order}`,
      kind: "segment",
      label: `Segment ${transition.order + 1}`,
      url,
      createdAt: transition.updatedAt?.toISOString() ?? null,
      status: transition.status,
    });
  }

  return uniqueUrlEntries(entries);
}

export function buildStorageRetentionRecommendationIds(
  project: AnimationProjectWithMedia
): StorageRetentionRecommendationId[] {
  const recommendations: StorageRetentionRecommendationId[] = [
    "keep_clean_video",
    "keep_original_final",
    "keep_completed_language_versions",
    "never_delete_completed_without_action",
  ];

  const hasFailedSegment = project.transitions.some((row) => row.status === "failed");
  const hasDraftLanguage = project.languageExports.some((row) => row.status === "draft");

  if (hasFailedSegment) {
    recommendations.push("optional_delete_failed_segments");
  }
  if (hasDraftLanguage) {
    recommendations.push("optional_delete_language_drafts");
  }

  return recommendations;
}

function computeVersionStorageMetrics(
  project: AnimationProjectWithMedia,
  assets: ProjectStorageAsset[]
): {
  currentVersionCount: number;
  archivedVersionCount: number;
  activeStorageBytes: number;
  archivedStorageBytes: number;
} {
  const exportWithUrl = project.exports.find((row) => row.outputVideoUrl?.trim());
  const originalUrl = rawExportUrlForDownload(project, exportWithUrl)?.trim() ?? null;
  const catalog = buildProjectVideoVersionCatalog({
    projectId: project.id,
    originalVideoUrl: originalUrl,
    cleanVideoUrl: project.instantCleanFinalVideoUrl?.trim() ?? null,
    languageExports: normalizeLanguageExportRows(
      project.languageExports.map((row) => ({
        id: row.id,
        languageCode: row.languageCode,
        languageLabel: row.languageLabel,
        status: row.status,
        outputVideoUrl: row.outputVideoUrl,
        sourceFinalVideoUrl: row.sourceFinalVideoUrl,
        textLayerJson: row.textLayerJson,
        translationProvider: row.translationProvider,
        errorMessage: row.errorMessage,
        createdAt: row.createdAt.toISOString(),
        completedAt: row.completedAt?.toISOString() ?? null,
        version: row.version,
        isDefault: row.isDefault,
      }))
    ),
    previousFinalVideoUrl: project.instantPreviousFinalVideoUrl,
    rebuildCount: project.instantFinalRebuildCount,
    rebuiltAt: project.instantFinalRebuiltAt?.toISOString() ?? null,
  });

  const sizeByUrl = new Map<string, number | null>();
  for (const asset of assets) {
    if (asset.url) {
      sizeByUrl.set(asset.url, asset.sizeBytes);
    }
  }

  const sizeForItem = (item: ProjectVideoVersionItem): number => {
    const url = item.outputVideoUrl?.trim();
    if (!url) {
      return 0;
    }
    return sizeByUrl.get(url) ?? 0;
  };

  const currentItems = catalog.all.filter((item) => item.lifecycle === "current");
  const archivedItems = catalog.all.filter((item) => item.lifecycle === "archived");

  return {
    currentVersionCount: currentItems.length,
    archivedVersionCount: archivedItems.length,
    activeStorageBytes: sumNullableBytes(currentItems.map(sizeForItem)),
    archivedStorageBytes: sumNullableBytes(archivedItems.map(sizeForItem)),
  };
}

export function aggregateProjectStorageBreakdown(
  assets: ProjectStorageAsset[]
): ProjectStorageBreakdown {
  const sumKind = (kind: ProjectStorageAssetKind) =>
    sumNullableBytes(
      assets.filter((asset) => asset.kind === kind).map((asset) => asset.sizeBytes)
    );

  return {
    originalBytes: sumKind("original"),
    cleanBytes: sumKind("clean"),
    languageBytes: sumKind("language"),
    segmentBytes: sumKind("segment"),
    previousFinalBytes: sumKind("previous_final"),
  };
}

export async function auditProjectStorage(params: {
  project: AnimationProjectWithMedia;
  probe?: ProbeBlobMetadataFn;
}): Promise<ProjectStorageAudit> {
  const probe = params.probe ?? probeProviderBlobMetadata;
  const urlEntries = collectProjectStorageUrlEntries(params.project);
  const metaByUrl = new Map<string, { blobExists: boolean; sizeBytes: number | null }>();

  await Promise.all(
    urlEntries.map(async (entry) => {
      const meta = await probe(entry.url);
      metaByUrl.set(entry.url, {
        blobExists: meta.blobExists,
        sizeBytes: meta.contentLength,
      });
    })
  );

  const assets: ProjectStorageAsset[] = urlEntries.map((entry) => {
    const meta = metaByUrl.get(entry.url);
    return {
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      languageCode: entry.languageCode,
      url: entry.url,
      blobExists: meta?.blobExists ?? false,
      sizeBytes: meta?.sizeBytes ?? null,
      createdAt: entry.createdAt ?? null,
      status: entry.status,
    };
  });

  const totalSizeBytes = sumNullableBytes(assets.map((asset) => asset.sizeBytes));
  const breakdown = aggregateProjectStorageBreakdown(assets);
  const versionMetrics = computeVersionStorageMetrics(params.project, assets);

  return {
    projectId: params.project.id,
    assets,
    blobCount: assets.filter((asset) => asset.blobExists).length,
    totalSizeBytes,
    breakdown,
    ...versionMetrics,
    estimatedMonthlyStorageCostUsd: estimateMonthlyStorageCostUsd(totalSizeBytes),
    estimatedTransferCostUsd: estimateTransferCostUsd(totalSizeBytes),
    retentionRecommendationIds: buildStorageRetentionRecommendationIds(params.project),
    probedAt: new Date().toISOString(),
  };
}

export function projectStorageRowFromAudit(audit: ProjectStorageAudit): AdminProjectStorageRow {
  return {
    projectId: audit.projectId,
    totalSizeBytes: audit.totalSizeBytes,
    blobCount: audit.blobCount,
    originalBytes: audit.breakdown.originalBytes,
    cleanBytes: audit.breakdown.cleanBytes,
    languageBytes: audit.breakdown.languageBytes,
    languageVersionCount: audit.assets.filter((asset) => asset.kind === "language").length,
    currentVersionCount: audit.currentVersionCount,
    archivedVersionCount: audit.archivedVersionCount,
    activeStorageBytes: audit.activeStorageBytes,
    archivedStorageBytes: audit.archivedStorageBytes,
  };
}

export function aggregateAdminStorageAudit(
  rows: AdminProjectStorageRow[]
): AdminStorageAuditSummary {
  const totalVideoStorageBytes = sumNullableBytes(rows.map((row) => row.totalSizeBytes));
  const totalActiveStorageBytes = sumNullableBytes(rows.map((row) => row.activeStorageBytes));
  const totalArchivedStorageBytes = sumNullableBytes(rows.map((row) => row.archivedStorageBytes));
  const totalCleanVideoBytes = sumNullableBytes(rows.map((row) => row.cleanBytes));
  const totalLanguageVersionBytes = sumNullableBytes(rows.map((row) => row.languageBytes));
  const totalLanguageVersionCount = rows.reduce(
    (sum, row) => sum + row.languageVersionCount,
    0
  );
  const projectCount = rows.length;
  const averageBytesPerProject =
    projectCount > 0 ? Math.round(totalVideoStorageBytes / projectCount) : 0;

  const topProjects = [...rows]
    .sort((a, b) => b.totalSizeBytes - a.totalSizeBytes)
    .slice(0, 10);

  return {
    projectCount,
    totalVideoStorageBytes,
    totalActiveStorageBytes,
    totalArchivedStorageBytes,
    totalCleanVideoBytes,
    totalLanguageVersionBytes,
    totalLanguageVersionCount,
    averageBytesPerProject,
    estimatedMonthlyStorageCostUsd: estimateMonthlyStorageCostUsd(totalVideoStorageBytes),
    estimatedTransferCostUsd: estimateTransferCostUsd(totalVideoStorageBytes),
    topProjects,
    probedAt: new Date().toISOString(),
  };
}

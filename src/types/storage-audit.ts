export type ProjectStorageAssetKind =
  | "original"
  | "clean"
  | "language"
  | "segment"
  | "previous_final";

export type ProjectStorageAsset = {
  id: string;
  kind: ProjectStorageAssetKind;
  label: string;
  languageCode?: string;
  url: string | null;
  blobExists: boolean;
  sizeBytes: number | null;
  createdAt: string | null;
  status?: string;
};

export type ProjectStorageBreakdown = {
  originalBytes: number;
  cleanBytes: number;
  languageBytes: number;
  segmentBytes: number;
  previousFinalBytes: number;
};

export type StorageRetentionRecommendationId =
  | "keep_clean_video"
  | "keep_original_final"
  | "keep_completed_language_versions"
  | "optional_delete_failed_segments"
  | "optional_delete_language_drafts"
  | "never_delete_completed_without_action";

export type ProjectStorageAudit = {
  projectId: string;
  assets: ProjectStorageAsset[];
  blobCount: number;
  totalSizeBytes: number;
  breakdown: ProjectStorageBreakdown;
  currentVersionCount: number;
  archivedVersionCount: number;
  activeStorageBytes: number;
  archivedStorageBytes: number;
  estimatedMonthlyStorageCostUsd: number;
  estimatedTransferCostUsd: number;
  retentionRecommendationIds: StorageRetentionRecommendationId[];
  probedAt: string;
};

export type AdminProjectStorageRow = {
  projectId: string;
  totalSizeBytes: number;
  blobCount: number;
  originalBytes: number;
  cleanBytes: number;
  languageBytes: number;
  languageVersionCount: number;
  currentVersionCount: number;
  archivedVersionCount: number;
  activeStorageBytes: number;
  archivedStorageBytes: number;
};

import type { ExtendedStorageAuditMetrics } from "@/lib/storage-audit-extended";

export type AdminStorageAuditSummary = {
  projectCount: number;
  totalVideoStorageBytes: number;
  totalActiveStorageBytes: number;
  totalArchivedStorageBytes: number;
  totalCleanVideoBytes: number;
  totalLanguageVersionBytes: number;
  totalLanguageVersionCount: number;
  averageBytesPerProject: number;
  estimatedMonthlyStorageCostUsd: number;
  estimatedTransferCostUsd: number;
  topProjects: AdminProjectStorageRow[];
  probedAt: string;
  extendedMetrics?: ExtendedStorageAuditMetrics;
};

export function buildSizeByUrlMap(audit: ProjectStorageAudit): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  for (const asset of audit.assets) {
    if (asset.url) {
      map[asset.url] = asset.sizeBytes;
    }
  }
  return map;
}

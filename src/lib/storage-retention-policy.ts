/**
 * Storage retention policy — constants and dry-run cleanup selection (no deletes).
 */

import {
  isVideoUrlReferencedByVersionHistory,
  type VersionHistoryUrlSource,
} from "@/lib/video-version-retention";
import type { ProjectStorageAsset } from "@/types/storage-audit";

export const STORAGE_RETENTION_POLICY = {
  keepCurrentOriginal: true,
  keepCleanVideo: true,
  keepCurrentPerLanguage: true,
  maxArchivedVersionsPerLanguage: 1,
  failedOutputRetentionDays: 7,
  orphanSegmentRetentionDays: 14,
  neverDeleteCurrentUserVisible: true,
} as const;

export type CleanupCandidateReason =
  | "failed_output_expired"
  | "orphan_segment"
  | "excess_archived_language"
  | "excess_archived_text";

export type CleanupDryRunCandidate = {
  assetId: string;
  url: string | null;
  kind: ProjectStorageAsset["kind"];
  label: string;
  sizeBytes: number | null;
  reason: CleanupCandidateReason;
  languageCode?: string;
  versionNumber?: number;
};

export type CleanupDryRunResult = {
  dryRun: true;
  deleted: false;
  candidateCount: number;
  bytesRecoverable: number;
  candidates: CleanupDryRunCandidate[];
  policy: typeof STORAGE_RETENTION_POLICY;
};

export function selectCleanupDryRunCandidates(params: {
  assets: ProjectStorageAsset[];
  nowMs?: number;
  versionHistory?: VersionHistoryUrlSource;
  languageVersions?: Array<{
    languageCode: string;
    version: number;
    lifecycle: "current" | "archived" | "pending" | "failed";
    url: string | null;
  }>;
}): CleanupDryRunResult {
  const versionHistory = params.versionHistory;
  const now = params.nowMs ?? Date.now();
  const failedCutoff = now - STORAGE_RETENTION_POLICY.failedOutputRetentionDays * 86_400_000;
  const segmentCutoff = now - STORAGE_RETENTION_POLICY.orphanSegmentRetentionDays * 86_400_000;
  const candidates: CleanupDryRunCandidate[] = [];

  for (const asset of params.assets) {
    if (asset.kind === "original" || asset.kind === "clean" || asset.kind === "previous_final") {
      continue;
    }

    if (
      versionHistory &&
      asset.url &&
      isVideoUrlReferencedByVersionHistory(asset.url, versionHistory)
    ) {
      continue;
    }

    const createdMs = asset.createdAt ? Date.parse(asset.createdAt) : NaN;

    if (
      (asset.status === "failed" || asset.status === "rendering" || asset.status === "queued") &&
      Number.isFinite(createdMs) &&
      createdMs < failedCutoff
    ) {
      candidates.push({
        assetId: asset.id,
        url: asset.url,
        kind: asset.kind,
        label: asset.label,
        sizeBytes: asset.sizeBytes,
        reason: "failed_output_expired",
        languageCode: asset.languageCode,
      });
      continue;
    }

    if (asset.kind === "segment" && Number.isFinite(createdMs) && createdMs < segmentCutoff) {
      candidates.push({
        assetId: asset.id,
        url: asset.url,
        kind: asset.kind,
        label: asset.label,
        sizeBytes: asset.sizeBytes,
        reason: "orphan_segment",
      });
    }
  }

  if (params.languageVersions?.length) {
    const byLang = new Map<string, typeof params.languageVersions>();
    for (const row of params.languageVersions) {
      if (row.lifecycle !== "archived") {
        continue;
      }
      const list = byLang.get(row.languageCode) ?? [];
      list.push(row);
      byLang.set(row.languageCode, list);
    }

    for (const [languageCode, archived] of byLang) {
      const sorted = [...archived].sort((a, b) => b.version - a.version);
      const excess = sorted.slice(STORAGE_RETENTION_POLICY.maxArchivedVersionsPerLanguage);
      for (const row of excess) {
        candidates.push({
          assetId: `lang-archive-${languageCode}-v${row.version}`,
          url: row.url,
          kind: "language",
          label: `${languageCode} v${row.version}`,
          sizeBytes: null,
          reason: "excess_archived_language",
          languageCode,
          versionNumber: row.version,
        });
      }
    }
  }

  const bytesRecoverable = candidates.reduce(
    (sum, row) => sum + (row.sizeBytes ?? 0),
    0
  );

  return {
    dryRun: true,
    deleted: false,
    candidateCount: candidates.length,
    bytesRecoverable,
    candidates,
    policy: STORAGE_RETENTION_POLICY,
  };
}

/**
 * Extended storage audit metrics — averages and projections (audit only, no deletes).
 */

import { estimateMonthlyStorageCostUsd } from "@/lib/blob-storage-pricing";
import type { AdminProjectStorageRow, ProjectStorageAudit } from "@/types/storage-audit";

export type ExtendedStorageAuditMetrics = {
  averageVideoSizeBytes: number;
  averageCleanVideoSizeBytes: number;
  averageLanguageVersionSizeBytes: number;
  averageTextRerenderSizeBytes: number;
  expectedStorageBytesPer1000Projects: number;
  estimatedBlobMonthlyCostUsd: number;
  projectCount: number;
};

export function computeExtendedStorageAuditMetrics(params: {
  audits: ProjectStorageAudit[];
  adminRows?: AdminProjectStorageRow[];
}): ExtendedStorageAuditMetrics {
  const projectCount = params.audits.length;
  if (projectCount === 0) {
    return {
      averageVideoSizeBytes: 0,
      averageCleanVideoSizeBytes: 0,
      averageLanguageVersionSizeBytes: 0,
      averageTextRerenderSizeBytes: 0,
      expectedStorageBytesPer1000Projects: 0,
      estimatedBlobMonthlyCostUsd: 0,
      projectCount: 0,
    };
  }

  let originalTotal = 0;
  let originalCount = 0;
  let cleanTotal = 0;
  let cleanCount = 0;
  let languageTotal = 0;
  let languageCount = 0;
  let textRerenderTotal = 0;
  let textRerenderCount = 0;
  let projectBytesTotal = 0;

  for (const audit of params.audits) {
    projectBytesTotal += audit.totalSizeBytes;
    for (const asset of audit.assets) {
      const size = asset.sizeBytes ?? 0;
      if (size <= 0) {
        continue;
      }
      if (asset.kind === "original") {
        originalTotal += size;
        originalCount += 1;
      } else if (asset.kind === "clean") {
        cleanTotal += size;
        cleanCount += 1;
      } else if (asset.kind === "language") {
        languageTotal += size;
        languageCount += 1;
      } else if (asset.kind === "previous_final") {
        textRerenderTotal += size;
        textRerenderCount += 1;
      }
    }
  }

  const average = (total: number, count: number) =>
    count > 0 ? Math.round(total / count) : 0;

  const averageProjectBytes = Math.round(projectBytesTotal / projectCount);
  const expectedStorageBytesPer1000Projects = averageProjectBytes * 1000;

  return {
    averageVideoSizeBytes: average(originalTotal, originalCount),
    averageCleanVideoSizeBytes: average(cleanTotal, cleanCount),
    averageLanguageVersionSizeBytes: average(languageTotal, languageCount),
    averageTextRerenderSizeBytes: average(textRerenderTotal, textRerenderCount),
    expectedStorageBytesPer1000Projects,
    estimatedBlobMonthlyCostUsd: estimateMonthlyStorageCostUsd(expectedStorageBytesPer1000Projects),
    projectCount,
  };
}

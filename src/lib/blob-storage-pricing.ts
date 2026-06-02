/**
 * Vercel Blob storage cost estimates (USD).
 * Override with BLOB_STORAGE_USD_PER_GB_MONTH env for your plan.
 */

export const BLOB_STORAGE_USD_PER_GB_MONTH_DEFAULT = 0.15;
export const BLOB_EGRESS_USD_PER_GB_DEFAULT = 0.15;

export function resolveBlobStorageUsdPerGbMonth(): number {
  const raw = process.env.BLOB_STORAGE_USD_PER_GB_MONTH?.trim();
  if (!raw) {
    return BLOB_STORAGE_USD_PER_GB_MONTH_DEFAULT;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : BLOB_STORAGE_USD_PER_GB_MONTH_DEFAULT;
}

export function resolveBlobEgressUsdPerGb(): number {
  const raw = process.env.BLOB_EGRESS_USD_PER_GB?.trim();
  if (!raw) {
    return BLOB_EGRESS_USD_PER_GB_DEFAULT;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : BLOB_EGRESS_USD_PER_GB_DEFAULT;
}

export function estimateMonthlyStorageCostUsd(totalBytes: number): number {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return 0;
  }
  const gb = totalBytes / 1024 ** 3;
  return Math.round(gb * resolveBlobStorageUsdPerGbMonth() * 100) / 100;
}

export function estimateTransferCostUsd(totalBytes: number): number {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return 0;
  }
  const gb = totalBytes / 1024 ** 3;
  return Math.round(gb * resolveBlobEgressUsdPerGb() * 100) / 100;
}

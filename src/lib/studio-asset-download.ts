/** Download and copy helpers for studio asset images. */

export function assetDownloadFilename(name: string, url: string): string {
  const base = name.trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 60) || "studio-asset";
  const ext = url.includes(".png") ? "png" : url.includes(".webp") ? "webp" : "jpg";
  return `${base}.${ext}`;
}

export function buildAssetDownloadHref(url: string, filename: string): string {
  const params = new URLSearchParams({ url, filename });
  return `/api/studio/asset-library/download?${params.toString()}`;
}

export async function copyAssetLinkToClipboard(url: string): Promise<boolean> {
  if (!url.trim()) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function hasDownloadableImage(asset: { previewUrl?: string | null; downloadUrl?: string | null }): boolean {
  return Boolean(asset.downloadUrl?.trim() || asset.previewUrl?.trim());
}

export function resolveAssetDownloadUrl(asset: {
  previewUrl?: string | null;
  downloadUrl?: string | null;
}): string | null {
  return asset.downloadUrl?.trim() || asset.previewUrl?.trim() || null;
}

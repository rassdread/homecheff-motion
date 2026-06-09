/** Download and copy helpers for studio asset images. */

export function assetDownloadFilename(name: string, url: string): string {
  const base = name.trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 60) || "studio-asset";
  const ext = url.includes(".png") ? "png" : url.includes(".webp") ? "webp" : "jpg";
  return `${base}.${ext}`;
}

export function buildAssetDownloadHref(
  url: string,
  filename: string,
  storageKey?: string | null
): string {
  const params = new URLSearchParams({ url, filename });
  if (storageKey?.trim()) {
    params.set("storageKey", storageKey.trim());
  }
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

export function hasDownloadableAsset(asset: {
  previewUrl?: string | null;
  downloadUrl?: string | null;
  category?: string;
}): boolean {
  const url = asset.downloadUrl?.trim() || asset.previewUrl?.trim();
  if (!url) {
    return false;
  }
  if (asset.category === "voice" && asset.downloadUrl?.includes("elevenlabs")) {
    return false;
  }
  return true;
}

/** @deprecated Use hasDownloadableAsset */
export function hasDownloadableImage(asset: { previewUrl?: string | null; downloadUrl?: string | null }): boolean {
  return hasDownloadableAsset(asset);
}

export function resolveAssetDownloadUrl(asset: {
  previewUrl?: string | null;
  downloadUrl?: string | null;
}): string | null {
  return asset.downloadUrl?.trim() || asset.previewUrl?.trim() || null;
}

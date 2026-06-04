/**
 * Wizard image preview URL resolution — memory-backed blob URLs only.
 * Never render stale blob: URLs after reload, revoke, or Safari IDB loss.
 */

import {
  deleteWizardBlobMemoryCache,
  getWizardBlobMemoryCache,
  setWizardBlobMemoryCache,
  type WizardBlobPair,
} from "@/lib/instant-wizard-blob-memory-cache";
import {
  hasWizardImageBlobPayload,
  type InstantWizardLocalImage,
} from "@/lib/instant-wizard-image-model";
import {
  isBlockedPreviewLiteral,
  isValidDataImageUrl,
  isValidHttpUrl,
  resolveRemoteImageSrc,
} from "@/lib/is-valid-http-url";

export type WizardPreviewImageInput = {
  id: string;
  remoteWorkingUrl?: string;
  remoteThumbnailUrl?: string;
  previewUnavailable?: boolean;
};

type PreviewUrlEntry = {
  workingPreviewUrl: string;
  thumbnailPreviewUrl: string;
};

const previewUrlsByImageId = new Map<string, PreviewUrlEntry>();
const blobUrlOwnerByUrl = new Map<string, string>();

export function toWizardPreviewInput(
  image: InstantWizardLocalImage | WizardPreviewImageInput
): WizardPreviewImageInput {
  return {
    id: image.id,
    remoteWorkingUrl: image.remoteWorkingUrl,
    remoteThumbnailUrl: image.remoteThumbnailUrl,
    previewUnavailable: image.previewUnavailable,
  };
}

export function isValidBlobUrl(value: unknown, imageId?: string): boolean {
  if (typeof value !== "string" || isBlockedPreviewLiteral(value)) {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("blob:")) {
    return false;
  }
  const ownerId = blobUrlOwnerByUrl.get(trimmed);
  if (!ownerId) {
    return false;
  }
  if (imageId && ownerId !== imageId) {
    return false;
  }
  if (!getWizardBlobMemoryCache(ownerId)) {
    return false;
  }
  const urls = previewUrlsByImageId.get(ownerId);
  if (!urls) {
    return false;
  }
  return urls.workingPreviewUrl === trimmed || urls.thumbnailPreviewUrl === trimmed;
}

export function hasMemoryBlobForPreview(imageId: string): boolean {
  return getWizardBlobMemoryCache(imageId) !== null;
}

function trackPreviewUrls(imageId: string, urls: PreviewUrlEntry): void {
  previewUrlsByImageId.set(imageId, urls);
  blobUrlOwnerByUrl.set(urls.workingPreviewUrl, imageId);
  blobUrlOwnerByUrl.set(urls.thumbnailPreviewUrl, imageId);
}

function untrackPreviewUrls(imageId: string): void {
  const existing = previewUrlsByImageId.get(imageId);
  if (!existing) {
    return;
  }
  blobUrlOwnerByUrl.delete(existing.workingPreviewUrl);
  blobUrlOwnerByUrl.delete(existing.thumbnailPreviewUrl);
  previewUrlsByImageId.delete(imageId);
}

function safeRevokeObjectUrl(url: string | undefined): void {
  if (!url || !url.startsWith("blob:")) {
    return;
  }
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

/** Revoke preview object URLs for one image; keeps blobs in memory for re-registration. */
export function revokeWizardImagePreviewUrls(imageId: string): void {
  const existing = previewUrlsByImageId.get(imageId);
  if (existing) {
    safeRevokeObjectUrl(existing.workingPreviewUrl);
    safeRevokeObjectUrl(existing.thumbnailPreviewUrl);
    untrackPreviewUrls(imageId);
  }
}

/** Store blobs in memory and create fresh object URLs for preview. */
export function registerWizardImageBlobs(
  imageId: string,
  optimized: Blob,
  thumbnail: Blob
): PreviewUrlEntry | null {
  if (optimized.size <= 0 || thumbnail.size <= 0) {
    revokeWizardImagePreviewUrls(imageId);
    deleteWizardBlobMemoryCache(imageId);
    return null;
  }
  revokeWizardImagePreviewUrls(imageId);
  setWizardBlobMemoryCache(imageId, optimized, thumbnail);
  const urls: PreviewUrlEntry = {
    workingPreviewUrl: URL.createObjectURL(optimized),
    thumbnailPreviewUrl: URL.createObjectURL(thumbnail),
  };
  trackPreviewUrls(imageId, urls);
  return urls;
}

export function getRegisteredWizardPreviewUrls(imageId: string): PreviewUrlEntry | null {
  if (!hasMemoryBlobForPreview(imageId)) {
    return null;
  }
  return previewUrlsByImageId.get(imageId) ?? null;
}

export function attachWizardImageFromMemory(
  imageId: string,
  blobs: WizardBlobPair
): PreviewUrlEntry | null {
  return registerWizardImageBlobs(imageId, blobs.optimized, blobs.thumbnail);
}

/** Create preview URLs when blobs exist but URLs are missing or stale. */
export function ensureWizardPreviewUrls(imageId: string): PreviewUrlEntry | null {
  const blobs = getWizardBlobMemoryCache(imageId);
  if (!blobs) {
    return null;
  }
  const existing = previewUrlsByImageId.get(imageId);
  if (
    existing &&
    isValidBlobUrl(existing.workingPreviewUrl, imageId) &&
    isValidBlobUrl(existing.thumbnailPreviewUrl, imageId)
  ) {
    return existing;
  }
  return registerWizardImageBlobs(imageId, blobs.optimized, blobs.thumbnail);
}

export function purgeWizardImagePreview(imageId: string): void {
  revokeWizardImagePreviewUrls(imageId);
  deleteWizardBlobMemoryCache(imageId);
}

export function clearAllWizardImagePreviews(): void {
  for (const imageId of [...previewUrlsByImageId.keys()]) {
    revokeWizardImagePreviewUrls(imageId);
  }
  previewUrlsByImageId.clear();
  blobUrlOwnerByUrl.clear();
}

export function resolvePreviewSrc(
  image: WizardPreviewImageInput,
  prefer: "working" | "thumbnail" = "working"
): string | null {
  if (image.previewUnavailable) {
    return null;
  }

  const ensured = ensureWizardPreviewUrls(image.id);
  if (ensured) {
    const blobUrl =
      prefer === "thumbnail" ? ensured.thumbnailPreviewUrl : ensured.workingPreviewUrl;
    if (isValidBlobUrl(blobUrl, image.id)) {
      return blobUrl;
    }
  }

  const remote = resolveRemoteImageSrc(
    prefer === "thumbnail" ? image.remoteThumbnailUrl : image.remoteWorkingUrl,
    image.remoteWorkingUrl,
    image.remoteThumbnailUrl
  );
  if (remote) {
    return remote;
  }

  return null;
}

export function hasValidWizardImageSource(image: WizardPreviewImageInput): boolean {
  if (image.previewUnavailable) {
    return false;
  }
  const preview = resolvePreviewSrc(image);
  if (!preview) {
    return false;
  }
  return hasMemoryBlobForPreview(image.id);
}

export function hasValidWizardImageSourceFromLocal(image: InstantWizardLocalImage): boolean {
  if (image.previewUnavailable) {
    return false;
  }
  const remote = image.remoteWorkingUrl ?? image.remoteThumbnailUrl;
  if (isValidHttpUrl(remote)) {
    return true;
  }
  if (!hasWizardImageBlobPayload(image)) {
    return false;
  }
  if (!hasMemoryBlobForPreview(image.id)) {
    return false;
  }
  return resolvePreviewSrc(toWizardPreviewInput(image)) !== null;
}

export function allWizardImagesHaveValidSource(images: InstantWizardLocalImage[]): boolean {
  return images.length > 0 && images.every((image) => hasValidWizardImageSourceFromLocal(image));
}

export function resolvePreviewSrcFromUnknown(value: unknown): string | null {
  if (typeof value !== "string" || isBlockedPreviewLiteral(value)) {
    return null;
  }
  const trimmed = value.trim();
  if (isValidHttpUrl(trimmed)) {
    return trimmed;
  }
  if (isValidDataImageUrl(trimmed)) {
    return trimmed;
  }
  if (isValidBlobUrl(trimmed)) {
    return trimmed;
  }
  return null;
}

/** Test helper. */
export function resetWizardPreviewRegistryForTests(): void {
  clearAllWizardImagePreviews();
}

/** Test helper — memory preview survives IndexedDB write failure. */
export function simulateSafariIndexedDbWriteFailure(imageId: string): boolean {
  return hasMemoryBlobForPreview(imageId);
}

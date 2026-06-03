/**
 * In-memory fallback when IndexedDB is unavailable (Safari private mode, quota, etc.).
 * Keeps upload previews and wizard persistence working for the current tab session.
 */

export type WizardBlobPair = {
  optimized: Blob;
  thumbnail: Blob;
};

const memoryByImageId = new Map<string, WizardBlobPair>();

export function setWizardBlobMemoryCache(
  imageId: string,
  optimized: Blob,
  thumbnail: Blob
): void {
  if (!imageId.trim()) {
    return;
  }
  memoryByImageId.set(imageId, { optimized, thumbnail });
}

export function getWizardBlobMemoryCache(imageId: string): WizardBlobPair | null {
  return memoryByImageId.get(imageId) ?? null;
}

export function deleteWizardBlobMemoryCache(imageId: string): void {
  memoryByImageId.delete(imageId);
}

export function listWizardBlobMemoryCacheIds(): string[] {
  return [...memoryByImageId.keys()];
}

export function clearWizardBlobMemoryCache(): void {
  memoryByImageId.clear();
}

/** Test helper. */
export function wizardBlobMemoryCacheSize(): number {
  return memoryByImageId.size;
}

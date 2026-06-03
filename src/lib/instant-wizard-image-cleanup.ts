import { purgeWizardImagePreview } from "@/lib/instant-wizard-preview-src";
import {
  clearPersistedWizardState,
  deleteWizardImageBlobs,
  pruneOrphanedWizardBlobs,
  clearAllWizardImageBlobs,
  writePersistedWizardState,
  type PersistedWizardState,
} from "@/lib/instant-premium-wizard-storage";

export type WizardImageCleanupTarget = {
  id: string;
  workingPreviewUrl?: string;
  thumbnailPreviewUrl?: string;
  bakedText?: { contentHash?: string };
};

/** Remove persisted blobs, OCR cache, and preview URLs for one wizard image. */
export async function purgeInstantWizardImagePersistence(
  image: WizardImageCleanupTarget
): Promise<void> {
  const { removeCachedBakedTextOcr } = await import("@/lib/baked-text-ocr-client-cache");
  removeCachedBakedTextOcr(image.bakedText?.contentHash);
  await deleteWizardImageBlobs(image.id);
}

/** @deprecated Use purgeWizardImagePreview(imageId) from preview-src. */
export function revokeWizardImagePreviewUrls(image: WizardImageCleanupTarget): void {
  purgeWizardImagePreview(image.id);
}

/** Clear all wizard upload persistence (localStorage draft + IndexedDB blobs + OCR cache). */
export async function purgeAllInstantWizardUploadPersistence(): Promise<void> {
  const { clearBakedTextOcrCacheCompletely } = await import("@/lib/baked-text-ocr-client-cache");
  await clearBakedTextOcrCacheCompletely();
  await clearAllWizardImageBlobs();
  clearPersistedWizardState();
}

export async function syncInstantWizardPersistedImages(
  state: Omit<PersistedWizardState, "version" | "savedAt"> & { images: PersistedWizardState["images"] }
): Promise<void> {
  const keepIds = state.images.map((img) => img.id);
  await pruneOrphanedWizardBlobs(keepIds);
  if (keepIds.length === 0) {
    clearPersistedWizardState();
    return;
  }
  writePersistedWizardState({
    version: 1,
    savedAt: new Date().toISOString(),
    ...state,
  });
}

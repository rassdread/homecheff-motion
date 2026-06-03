import { purgeWizardImagePreview } from "@/lib/instant-wizard-preview-src";
import {
  clearPersistedWizardState,
  createWizardDraftId,
  deleteWizardImageBlobs,
  pruneOrphanedWizardBlobs,
  clearAllWizardImageBlobs,
  readPersistedWizardState,
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

/** True when localStorage should retain wizard state (text-only drafts included). */
export function shouldPersistWizardDraftState(
  state: Pick<
    PersistedWizardState,
    "images" | "sceneSlots" | "sceneTexts" | "step" | "motionText" | "chips" | "lockedTextLayers"
  >
): boolean {
  return (
    state.images.length > 0 ||
    (state.sceneSlots?.length ?? 0) > 0 ||
    (state.sceneTexts?.length ?? 0) > 0 ||
    state.motionText.trim().length > 0 ||
    state.chips.length > 0 ||
    state.lockedTextLayers.length > 0 ||
    state.step > 1
  );
}

export async function syncInstantWizardPersistedImages(
  state: Omit<PersistedWizardState, "version" | "savedAt" | "draftId"> & {
    images: PersistedWizardState["images"];
  }
): Promise<void> {
  const keepIds = state.images.map((img) => img.id);
  await pruneOrphanedWizardBlobs(keepIds);

  if (!shouldPersistWizardDraftState(state)) {
    clearPersistedWizardState();
    return;
  }

  const existingDraftId = readPersistedWizardState()?.draftId?.trim();
  writePersistedWizardState({
    version: 1,
    savedAt: new Date().toISOString(),
    draftId: existingDraftId || createWizardDraftId(),
    ...state,
  });
}

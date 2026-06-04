"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import type { LockedTextLayerDraft } from "@/components/instant/locked-text-layers-editor";
import type {
  InstantMode,
  InstantTransitionSeconds,
} from "@/lib/instant-premium-mode-types";
import {
  isInstantMode,
  isInstantTransitionSeconds,
  normalizeInstantTransitionSeconds,
  parseInstantMode,
} from "@/lib/instant-premium-mode-types";
import type { InstantPremiumContinuityStrength, InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import type { InstantPremiumChipId } from "@/lib/instant-premium-prompt";
import type { TextImplyingChipId } from "@/lib/locked-text-layer";
import { warnIndexedDbCacheFailed } from "@/lib/instant-cache-diagnostics";
import { isValidHttpUrl, logInvalidImageUrl } from "@/lib/is-valid-http-url";
import { syncInstantWizardPersistedImages } from "@/lib/instant-wizard-image-cleanup";
import {
  CREATOR_WIZARD_FLOW_VERSION,
  normalizeCreatorWizardStep,
} from "@/lib/creator-wizard-steps";
import {
  loadWizardImageBlobs,
  normalizeBakedTextAfterRestore,
  pruneOrphanedWizardBlobs,
  readPersistedWizardState,
  safeIndexedDbSet,
  type PersistedWizardImage,
  type PersistedWizardState,
} from "@/lib/instant-premium-wizard-storage";
import { EMPTY_WIZARD_IMAGE_BLOB } from "@/lib/instant-wizard-image-model";
import type { InstantWizardLocalImage } from "@/lib/instant-wizard-image-model";
import { attachWizardImageFromMemory } from "@/lib/instant-wizard-preview-src";
import { resolveInstantPremiumOutputPlan } from "@/lib/instant-premium-output-plan";
import {
  listAttachedImages,
  mergePersistedSceneSlotsWithImages,
  serializeSceneSlotsForPersist,
  type WizardSceneSlot,
} from "@/lib/instant-wizard-scene-slots";

export type PersistableLocalImage = InstantWizardLocalImage;

const WIZARD_AUTOSAVE_MS = 800;

function serializeBakedText(bt: BakedTextProtectionDraft): PersistedWizardImage["bakedText"] {
  return { ...bt };
}

async function blobFromUrl(url: string): Promise<Blob | null> {
  if (!isValidHttpUrl(url)) {
    logInvalidImageUrl("wizardPersist.blobFromUrl", { url: url.slice(0, 80) });
    return null;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    return res.blob();
  } catch {
    return null;
  }
}

function hydratePersistedImageMeta(pi: PersistedWizardImage): InstantWizardLocalImage | null {
  const baked = normalizeBakedTextAfterRestore(
    serializeBakedText(pi.bakedText as BakedTextProtectionDraft)
  ) as BakedTextProtectionDraft;
  const remoteUrl = pi.remoteWorkingUrl ?? pi.bakedText.remoteWorkingUrl;
  return {
    id: pi.id,
    originalFileName: pi.originalFileName,
    mimeType: pi.mimeType,
    sizeBytes: pi.sizeBytes,
    optimizedBlob: EMPTY_WIZARD_IMAGE_BLOB,
    thumbnailBlob: EMPTY_WIZARD_IMAGE_BLOB,
    remoteWorkingUrl: isValidHttpUrl(remoteUrl) ? remoteUrl : undefined,
    remoteThumbnailUrl: isValidHttpUrl(pi.remoteThumbnailUrl) ? pi.remoteThumbnailUrl : undefined,
    remoteStorageKey: pi.remoteStorageKey,
    imageSource: pi.imageSource,
    studioSceneImageId: pi.studioSceneImageId,
    studioImageReference: pi.studioImageReference,
    bakedText: baked,
    previewUnavailable: false,
  };
}

async function hydratePersistedImageWithBlobs(
  pi: PersistedWizardImage
): Promise<InstantWizardLocalImage | null> {
  const baked = normalizeBakedTextAfterRestore(
    serializeBakedText(pi.bakedText as BakedTextProtectionDraft)
  ) as BakedTextProtectionDraft;
  let blobs = await loadWizardImageBlobs(pi.id);
  const remoteUrl = pi.remoteWorkingUrl ?? pi.bakedText.remoteWorkingUrl;

  if (!blobs && remoteUrl) {
    const fetched = await blobFromUrl(remoteUrl);
    if (fetched) {
      blobs = { optimized: fetched, thumbnail: fetched };
      void safeIndexedDbSet(pi.id, fetched, fetched);
    }
  }

  if (!blobs && isValidHttpUrl(remoteUrl)) {
    return {
      id: pi.id,
      originalFileName: pi.originalFileName,
      mimeType: pi.mimeType,
      sizeBytes: pi.sizeBytes,
      optimizedBlob: EMPTY_WIZARD_IMAGE_BLOB,
      thumbnailBlob: EMPTY_WIZARD_IMAGE_BLOB,
      remoteWorkingUrl: remoteUrl,
      remoteThumbnailUrl: isValidHttpUrl(pi.remoteThumbnailUrl) ? pi.remoteThumbnailUrl : undefined,
      remoteStorageKey: pi.remoteStorageKey,
      imageSource: pi.imageSource,
      studioSceneImageId: pi.studioSceneImageId,
      studioImageReference: pi.studioImageReference,
      bakedText: baked,
      previewUnavailable: false,
    };
  }

  if (!blobs) {
    return {
      id: pi.id,
      originalFileName: pi.originalFileName,
      mimeType: pi.mimeType,
      sizeBytes: pi.sizeBytes,
      optimizedBlob: EMPTY_WIZARD_IMAGE_BLOB,
      thumbnailBlob: EMPTY_WIZARD_IMAGE_BLOB,
      remoteWorkingUrl: isValidHttpUrl(remoteUrl) ? remoteUrl : undefined,
      remoteThumbnailUrl: isValidHttpUrl(pi.remoteThumbnailUrl) ? pi.remoteThumbnailUrl : undefined,
      remoteStorageKey: pi.remoteStorageKey,
      imageSource: pi.imageSource,
      studioSceneImageId: pi.studioSceneImageId,
      studioImageReference: pi.studioImageReference,
      bakedText: baked,
      previewUnavailable: true,
    };
  }

  const previewRegistered = attachWizardImageFromMemory(pi.id, blobs);
  return {
    id: pi.id,
    originalFileName: pi.originalFileName,
    mimeType: pi.mimeType,
    sizeBytes: pi.sizeBytes,
    optimizedBlob: blobs.optimized,
    thumbnailBlob: blobs.thumbnail,
    remoteWorkingUrl: isValidHttpUrl(remoteUrl) ? remoteUrl : undefined,
    remoteThumbnailUrl: isValidHttpUrl(pi.remoteThumbnailUrl) ? pi.remoteThumbnailUrl : undefined,
    remoteStorageKey: pi.remoteStorageKey,
    imageSource: pi.imageSource,
    studioSceneImageId: pi.studioSceneImageId,
    studioImageReference: pi.studioImageReference,
    bakedText: baked,
    previewUnavailable: previewRegistered === null,
  };
}

export function useInstantWizardPersist(params: {
  ready: boolean;
  step: number;
  sceneSlots: WizardSceneSlot[];
  stylePreset: InstantPremiumStylePreset;
  durationSec: number;
  motionText: string;
  continuityStrength: InstantPremiumContinuityStrength;
  chips: (InstantPremiumChipId | TextImplyingChipId)[];
  lockedTextMode: boolean;
  lockedTextLayers: LockedTextLayerDraft[];
  chipTextBySlot: Partial<Record<TextImplyingChipId, string>>;
  aspectRatio: "9:16" | "16:9";
  fastRenderMode: boolean;
  instantMode: InstantMode;
  transitionSeconds: InstantTransitionSeconds;
  onHydrated?: () => void;
  onRestore: (state: {
    step: number;
    sceneSlots: WizardSceneSlot[];
    stylePreset: InstantPremiumStylePreset;
    durationSec: number;
    motionText: string;
    continuityStrength: InstantPremiumContinuityStrength;
    chips: (InstantPremiumChipId | TextImplyingChipId)[];
    lockedTextMode: boolean;
    lockedTextLayers: LockedTextLayerDraft[];
    chipTextBySlot: Partial<Record<TextImplyingChipId, string>>;
    aspectRatio: "9:16" | "16:9";
    fastRenderMode: boolean;
    instantMode: InstantMode;
    transitionSeconds: InstantTransitionSeconds;
  }) => void;
}) {
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }
    hydratedRef.current = true;
    void (async () => {
      try {
        const saved = readPersistedWizardState();
        if (!saved) {
          await pruneOrphanedWizardBlobs([]);
          params.onHydrated?.();
          return;
        }

        const hasStoryboard =
          (saved.sceneSlots?.length ?? 0) > 0 ||
          (saved.sceneTexts?.length ?? 0) > 0 ||
          saved.images.length > 0;

        if (!hasStoryboard) {
          await pruneOrphanedWizardBlobs([]);
          params.onHydrated?.();
          return;
        }

        const transitionSeconds = isInstantTransitionSeconds(saved.transitionSeconds)
          ? saved.transitionSeconds
          : normalizeInstantTransitionSeconds(saved.transitionSeconds);
        const instantMode = isInstantMode(saved.instantMode)
          ? saved.instantMode
          : parseInstantMode(saved.instantMode);

        const allowedIds = new Set(saved.images.map((pi) => pi.id));
        for (const slot of saved.sceneSlots ?? []) {
          if (slot.image?.id) {
            allowedIds.add(slot.image.id);
          }
        }
        await pruneOrphanedWizardBlobs(allowedIds);

        const restoredSlots = mergePersistedSceneSlotsWithImages(
          saved.sceneSlots,
          saved.images,
          saved.sceneTexts,
          transitionSeconds,
          (meta) => hydratePersistedImageMeta(meta)
        );

        const hydratedSlots: WizardSceneSlot[] = [];
        for (const slot of restoredSlots) {
          if (!slot.image) {
            hydratedSlots.push(slot);
            continue;
          }
          const meta =
            saved.sceneSlots?.find((s) => s.image?.id === slot.image?.id)?.image ??
            saved.images.find((img) => img.id === slot.image?.id);
          if (!meta) {
            hydratedSlots.push({ ...slot, image: null });
            continue;
          }
          const hydrated = await hydratePersistedImageWithBlobs(meta);
          hydratedSlots.push({
            ...slot,
            image: hydrated,
          });
        }

        await pruneOrphanedWizardBlobs(
          new Set(
            listAttachedImages(hydratedSlots)
              .map((img) => img.id)
              .filter(Boolean)
          )
        );

        params.onRestore({
          step: normalizeCreatorWizardStep(saved.step, saved.wizardFlowVersion),
          sceneSlots: hydratedSlots,
          stylePreset: saved.stylePreset,
          durationSec:
            saved.durationSec ??
            resolveInstantPremiumOutputPlan(
              Math.max(1, listAttachedImages(hydratedSlots).length)
            ).totalDurationSeconds,
          motionText: saved.motionText,
          continuityStrength: saved.continuityStrength,
          chips: saved.chips,
          lockedTextMode: saved.lockedTextMode,
          lockedTextLayers: saved.lockedTextLayers,
          chipTextBySlot: saved.chipTextBySlot,
          aspectRatio: saved.aspectRatio,
          fastRenderMode: saved.fastRenderMode,
          instantMode,
          transitionSeconds,
        });
      } catch (error) {
        warnIndexedDbCacheFailed("hydrate", {
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        params.onHydrated?.();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, []);

  const buildPersistedState = useCallback((): Omit<PersistedWizardState, "version" | "savedAt"> => {
    const serializedSlots = serializeSceneSlotsForPersist(params.sceneSlots);
    const existing = readPersistedWizardState();
    return {
      wizardFlowVersion: CREATOR_WIZARD_FLOW_VERSION,
      step: params.step,
      stylePreset: params.stylePreset,
      durationSec: params.durationSec,
      motionText: params.motionText,
      continuityStrength: params.continuityStrength,
      chips: params.chips,
      lockedTextMode: params.lockedTextMode,
      lockedTextLayers: params.lockedTextLayers,
      chipTextBySlot: params.chipTextBySlot,
      aspectRatio: params.aspectRatio,
      fastRenderMode: params.fastRenderMode,
      instantMode: params.instantMode,
      transitionSeconds: params.transitionSeconds,
      sceneSlots: serializedSlots,
      sceneTexts: serializedSlots.map((slot) => slot.text),
      images: [],
      ...(existing?.studioHandoff ? { studioHandoff: existing.studioHandoff } : {}),
    };
  }, [params]);

  const persistNow = useCallback(async () => {
    if (!params.ready) {
      return;
    }

    try {
      const attached = listAttachedImages(params.sceneSlots);
      const persistedImages: PersistedWizardImage[] = [];

      for (const img of attached) {
        if (img.optimizedBlob.size > 0 && img.thumbnailBlob.size > 0) {
          await safeIndexedDbSet(img.id, img.optimizedBlob, img.thumbnailBlob);
        }
        const remoteWorking = img.remoteWorkingUrl ?? img.bakedText.remoteWorkingUrl;
        persistedImages.push({
          id: img.id,
          originalFileName: img.originalFileName,
          mimeType: img.mimeType,
          sizeBytes: img.sizeBytes,
          remoteWorkingUrl: isValidHttpUrl(remoteWorking) ? remoteWorking : undefined,
          remoteThumbnailUrl: isValidHttpUrl(img.remoteThumbnailUrl)
            ? img.remoteThumbnailUrl
            : undefined,
          remoteStorageKey: img.remoteStorageKey,
          imageSource: img.imageSource,
          studioSceneImageId: img.studioSceneImageId,
          studioImageReference: img.studioImageReference,
          bakedText: serializeBakedText(img.bakedText),
        });
      }

      await syncInstantWizardPersistedImages({
        ...buildPersistedState(),
        images: persistedImages,
      });
    } catch (error) {
      warnIndexedDbCacheFailed("persist", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [buildPersistedState, params]);

  useEffect(() => {
    if (!params.ready) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void persistNow();
    }, WIZARD_AUTOSAVE_MS);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    params.ready,
    persistNow,
    params.sceneSlots,
    params.step,
    params.fastRenderMode,
    params.instantMode,
    params.transitionSeconds,
    params.motionText,
    params.stylePreset,
    params.chips,
    params.lockedTextMode,
    params.lockedTextLayers,
    params.chipTextBySlot,
    params.aspectRatio,
    params.continuityStrength,
    params.durationSec,
  ]);

  return { persistNow };
}

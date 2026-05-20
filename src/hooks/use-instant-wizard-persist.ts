"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import type { LockedTextLayerDraft } from "@/components/instant/locked-text-layers-editor";
import type { InstantPremiumContinuityStrength, InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import type { InstantPremiumChipId } from "@/lib/instant-premium-prompt";
import type { TextImplyingChipId } from "@/lib/locked-text-layer";
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
  saveWizardImageBlobs,
  type PersistedWizardImage,
  type PersistedWizardState,
} from "@/lib/instant-premium-wizard-storage";

export type PersistableLocalImage = {
  id: string;
  originalFileName: string;
  workingPreviewUrl: string;
  thumbnailPreviewUrl: string;
  mimeType: string;
  sizeBytes: number;
  optimizedBlob: Blob;
  thumbnailBlob: Blob;
  bakedText: BakedTextProtectionDraft;
  remoteWorkingUrl?: string;
  remoteThumbnailUrl?: string;
  remoteStorageKey?: string;
};

function serializeBakedText(bt: BakedTextProtectionDraft): PersistedWizardImage["bakedText"] {
  return { ...bt };
}

async function blobFromUrl(url: string): Promise<Blob | null> {
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

export function useInstantWizardPersist(params: {
  ready: boolean;
  step: number;
  images: PersistableLocalImage[];
  stylePreset: InstantPremiumStylePreset;
  durationSec: 8 | 15;
  motionText: string;
  continuityStrength: InstantPremiumContinuityStrength;
  chips: (InstantPremiumChipId | TextImplyingChipId)[];
  lockedTextMode: boolean;
  lockedTextLayers: LockedTextLayerDraft[];
  chipTextBySlot: Partial<Record<TextImplyingChipId, string>>;
  aspectRatio: "9:16" | "16:9";
  fastRenderMode: boolean;
  onHydrated?: () => void;
  onRestore: (state: {
    step: number;
    images: PersistableLocalImage[];
    stylePreset: InstantPremiumStylePreset;
    durationSec: 8 | 15;
    motionText: string;
    continuityStrength: InstantPremiumContinuityStrength;
    chips: (InstantPremiumChipId | TextImplyingChipId)[];
    lockedTextMode: boolean;
    lockedTextLayers: LockedTextLayerDraft[];
    chipTextBySlot: Partial<Record<TextImplyingChipId, string>>;
    aspectRatio: "9:16" | "16:9";
    fastRenderMode: boolean;
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
      const saved = readPersistedWizardState();
      if (!saved || saved.images.length === 0) {
        await pruneOrphanedWizardBlobs([]);
        params.onHydrated?.();
        return;
      }
      const allowedIds = new Set(saved.images.map((pi) => pi.id));
      await pruneOrphanedWizardBlobs(allowedIds);

      const restored: PersistableLocalImage[] = [];
      for (const pi of saved.images) {
        const baked = normalizeBakedTextAfterRestore(serializeBakedText(pi.bakedText as BakedTextProtectionDraft));
        let blobs = await loadWizardImageBlobs(pi.id);
        if (!blobs && pi.remoteWorkingUrl) {
          const fetched = await blobFromUrl(pi.remoteWorkingUrl);
          if (fetched) {
            blobs = { optimized: fetched, thumbnail: fetched };
          }
        }
        if (!blobs) {
          continue;
        }
        restored.push({
          id: pi.id,
          originalFileName: pi.originalFileName,
          mimeType: pi.mimeType,
          sizeBytes: pi.sizeBytes,
          optimizedBlob: blobs.optimized,
          thumbnailBlob: blobs.thumbnail,
          workingPreviewUrl: URL.createObjectURL(blobs.optimized),
          thumbnailPreviewUrl: URL.createObjectURL(blobs.thumbnail),
          remoteWorkingUrl: pi.remoteWorkingUrl ?? pi.bakedText.remoteWorkingUrl,
          remoteThumbnailUrl: pi.remoteThumbnailUrl,
          remoteStorageKey: pi.remoteStorageKey,
          bakedText: baked as BakedTextProtectionDraft,
        });
      }

      await pruneOrphanedWizardBlobs(new Set(restored.map((img) => img.id)));

      if (restored.length === 0) {
        params.onHydrated?.();
        return;
      }
      params.onRestore({
        step: normalizeCreatorWizardStep(saved.step, saved.wizardFlowVersion),
        images: restored,
        stylePreset: saved.stylePreset,
        durationSec: saved.durationSec,
        motionText: saved.motionText,
        continuityStrength: saved.continuityStrength,
        chips: saved.chips,
        lockedTextMode: saved.lockedTextMode,
        lockedTextLayers: saved.lockedTextLayers,
        chipTextBySlot: saved.chipTextBySlot,
        aspectRatio: saved.aspectRatio,
        fastRenderMode: saved.fastRenderMode,
      });
      params.onHydrated?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, []);

  const buildPersistedState = useCallback((): Omit<PersistedWizardState, "version" | "savedAt"> => {
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
      images: [],
    };
  }, [params]);

  const persistNow = useCallback(async () => {
    if (!params.ready) {
      return;
    }

    if (params.images.length === 0) {
      await syncInstantWizardPersistedImages({
        ...buildPersistedState(),
        images: [],
      });
      return;
    }

    const persistedImages: PersistedWizardImage[] = [];
    for (const img of params.images) {
      await saveWizardImageBlobs(img.id, img.optimizedBlob, img.thumbnailBlob);
      persistedImages.push({
        id: img.id,
        originalFileName: img.originalFileName,
        mimeType: img.mimeType,
        sizeBytes: img.sizeBytes,
        remoteWorkingUrl: img.remoteWorkingUrl ?? img.bakedText.remoteWorkingUrl,
        remoteThumbnailUrl: img.remoteThumbnailUrl,
        remoteStorageKey: img.remoteStorageKey,
        bakedText: serializeBakedText(img.bakedText),
      });
    }

    await syncInstantWizardPersistedImages({
      ...buildPersistedState(),
      images: persistedImages,
    });
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
    }, 600);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [params.ready, persistNow, params.images, params.step, params.fastRenderMode]);

  return { persistNow };
}

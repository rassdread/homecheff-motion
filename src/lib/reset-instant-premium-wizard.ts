import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";
import type { LockedTextLayerDraft } from "@/components/instant/locked-text-layers-editor";
import {
  DEFAULT_OVERLAY_STYLE,
  DEFAULT_TEXT_RENDER_MODE,
  type OverlayStyle,
  type TextRenderMode,
} from "@/lib/hybrid-motion-overlay";
import {
  DEFAULT_POSTER_MOTION_SETTINGS,
  type PosterMotionSettings,
} from "@/lib/poster-motion-preserve";
import {
  purgeAllInstantWizardUploadPersistence,
  revokeWizardImagePreviewUrls,
  type WizardImageCleanupTarget,
} from "@/lib/instant-wizard-image-cleanup";
import {
  clearActiveInstantWizardSession,
  readActiveInstantProjectId,
  readCachedInstantProgressSnapshot,
} from "@/lib/instant-premium-progress-cache";
import type {
  InstantPremiumContinuityStrength,
  InstantPremiumStylePreset,
} from "@/lib/instant-premium-prompt";
import type { InstantPremiumChipId } from "@/lib/instant-premium-prompt";
import type { TextImplyingChipId } from "@/lib/locked-text-layer";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

export const INSTANT_WIZARD_DEFAULT_BAKED_TEXT: BakedTextProtectionDraft = {
  enabled: false,
  status: "none",
  blocks: [],
  exactText: "",
  positionY: 0.12,
  manualMode: false,
  autoScanState: "idle",
  autoScanComplete: false,
  needsReview: false,
  reviewOpen: false,
};

export type InstantWizardFormDefaults = {
  step: number;
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
  textRenderMode: TextRenderMode;
  hybridOverlayStyle: OverlayStyle;
  posterMotionSettings: PosterMotionSettings;
};

export function getInstantWizardFormDefaults(): InstantWizardFormDefaults {
  return {
    step: 1,
    stylePreset: "food_promo",
    durationSec: 8,
    motionText: "",
    continuityStrength: "balanced",
    chips: [],
    lockedTextMode: true,
    lockedTextLayers: [],
    chipTextBySlot: {},
    aspectRatio: "9:16",
    fastRenderMode: false,
    textRenderMode: DEFAULT_TEXT_RENDER_MODE,
    hybridOverlayStyle: DEFAULT_OVERLAY_STYLE,
    posterMotionSettings: { ...DEFAULT_POSTER_MOTION_SETTINGS },
  };
}

export type ResetInstantPremiumWizardOptions = {
  images: WizardImageCleanupTarget[];
  cancelOcrScanForImage: (imageId: string) => void;
  cancelAllOcrScans?: () => void;
};

/** Clears wizard localStorage draft, IndexedDB blobs, and OCR client cache. */
export async function resetInstantPremiumWizardStorage(): Promise<void> {
  await purgeAllInstantWizardUploadPersistence();
  clearActiveInstantWizardSession();
}

/**
 * Full wizard session reset: abort OCR, revoke blob URLs, clear persisted draft.
 * Does not delete AnimationProject rows in the database (gallery stays intact).
 */
export async function resetInstantPremiumWizard(
  options: ResetInstantPremiumWizardOptions
): Promise<void> {
  options.cancelAllOcrScans?.();
  for (const image of options.images) {
    options.cancelOcrScanForImage(image.id);
    revokeWizardImagePreviewUrls(image);
  }
  await resetInstantPremiumWizardStorage();
}

export function readActiveWizardProjectSnapshot(): InstantPremiumStatusResponse | null {
  const projectId = readActiveInstantProjectId();
  if (!projectId) {
    return null;
  }
  return readCachedInstantProgressSnapshot(projectId)?.snapshot ?? null;
}

/** True when checkout is busy or a cached active project is still processing video. */
export function isInstantWizardVideoProcessingActive(params: {
  checkoutBusy: boolean;
  projectSnapshot?: InstantPremiumStatusResponse | null;
}): boolean {
  if (params.checkoutBusy) {
    return true;
  }
  const snapshot = params.projectSnapshot;
  if (!snapshot) {
    return false;
  }
  if (snapshot.status === "queued" || snapshot.status === "running" || snapshot.status === "finalizing") {
    return true;
  }
  const worker = snapshot.workerJobStatus?.trim();
  return worker === "queued" || worker === "running";
}

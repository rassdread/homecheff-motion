/**
 * Motion V22.3 — single source of truth for bundle card version selection.
 */

import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import {
  findMotionVersionSlot,
  MOTION_PRIMARY_LANGUAGE_CODE,
  type MotionVersionCatalog,
  type MotionVersionSlot,
} from "@/lib/motion-version-catalog";
import {
  isProjectPlayablyComplete,
  resolveProjectDisplayStatus,
} from "@/lib/project-display-status";

export type SelectedBundleVersion = {
  selectionKey: string;
  slot: MotionVersionSlot;
  projectId: string;
  languageCode: string;
  languageLabel: string;
  versionLabel: string;
  versionNumber: number;
  thumbnailUrl: string | null;
  finalVideoUrl: string | null;
  durationSeconds: number | null;
  status: string;
  playable: boolean;
  playKey: string;
  downloadUrl: string;
  openHref: string;
};

export function resolveBundleSlot(
  catalog: MotionVersionCatalog,
  languageCode: string,
  selectionKey: string | null
): MotionVersionSlot | null {
  const slots = catalog.slotsByLanguage[languageCode] ?? [];
  if (!slots.length) {
    return null;
  }
  if (selectionKey) {
    const found = findMotionVersionSlot(catalog, selectionKey);
    if (found && found.languageCode === languageCode) {
      return found;
    }
  }
  const fallback =
    slots.find((s) => s.status === "completed" && s.finalVideoUrl) ??
    slots[slots.length - 1] ??
    null;
  return fallback;
}

export function buildBundleSlotOpenHref(slot: MotionVersionSlot): string {
  const params = new URLSearchParams();
  params.set("lang", slot.languageCode);
  params.set("ver", `v${slot.versionNumber}`);
  return `/videos/${encodeURIComponent(slot.projectId)}?${params.toString()}`;
}

export function buildBundleSlotDownloadUrl(slot: MotionVersionSlot): string {
  const isPrimaryLang = slot.languageCode === MOTION_PRIMARY_LANGUAGE_CODE;
  return animationProjectDownloadUrl(slot.projectId, {
    languageCode: isPrimaryLang ? undefined : slot.languageCode,
    languageExportId:
      slot.kind === "language_export" ? slot.languageExportId : undefined,
  });
}

export function buildBundlePlayKey(bundleKey: string, selectionKey: string): string {
  return `${bundleKey}:${selectionKey}`;
}

export function resolveThumbnailForSlot(
  slot: MotionVersionSlot | null,
  fallbackBundleThumbnail: string | null
): string | null {
  if (!slot) {
    return fallbackBundleThumbnail;
  }
  return (
    slot.thumbnailUrl?.trim() ||
    slot.thumbnailFallbackUrl?.trim() ||
    fallbackBundleThumbnail
  );
}

/**
 * Unified selection for gallery bundle cards — thumbnail, play, download, and open
 * all derive from the same catalog slot (never the bundle lead / latest member).
 */
export function resolveSelectedBundleVersion(params: {
  bundleKey: string;
  catalog: MotionVersionCatalog;
  languageCode: string;
  selectionKey: string | null;
  fallbackBundleThumbnail?: string | null;
}): SelectedBundleVersion | null {
  const slot = resolveBundleSlot(
    params.catalog,
    params.languageCode,
    params.selectionKey
  );
  if (!slot) {
    return null;
  }

  const finalUrl = slot.finalVideoUrl?.trim() ?? null;
  const displayStatus = resolveProjectDisplayStatus({
    projectStatus: slot.status,
    exportStatus: slot.status,
    outputVideoUrl: finalUrl,
  });
  const playable = isProjectPlayablyComplete({
    projectStatus: displayStatus,
    exportStatus: displayStatus,
    outputVideoUrl: finalUrl,
  });

  return {
    selectionKey: slot.selectionKey,
    slot,
    projectId: slot.projectId,
    languageCode: slot.languageCode,
    languageLabel: slot.languageLabel,
    versionLabel: slot.displayLabel,
    versionNumber: slot.versionNumber,
    thumbnailUrl: resolveThumbnailForSlot(slot, params.fallbackBundleThumbnail ?? null),
    finalVideoUrl: finalUrl,
    durationSeconds: slot.durationSeconds,
    status: displayStatus,
    playable,
    playKey: buildBundlePlayKey(params.bundleKey, slot.selectionKey),
    downloadUrl: buildBundleSlotDownloadUrl(slot),
    openHref: buildBundleSlotOpenHref(slot),
  };
}

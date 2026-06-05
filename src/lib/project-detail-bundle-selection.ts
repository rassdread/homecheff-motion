/**
 * Motion V22.7 — detail page bundle catalog selection (client + tests).
 */

import { buildBundleSlotOpenHref, buildBundleSlotDownloadUrl } from "@/lib/bundle-selected-version";
import { isBundleSlotPlayable } from "@/lib/bundle-slot-actions";
import {
  findMotionVersionSlot,
  isExplicitMotionUrlSelectionInvalid,
  resolveMotionSelectionFromUrl,
  type MotionVersionCatalog,
  type MotionVersionSlot,
} from "@/lib/motion-version-catalog";

export type DetailCatalogSelection = {
  invalidDeepLink: boolean;
  selectedCatalogSlot: MotionVersionSlot | null;
  selectedLanguageCode: string;
  selectionKey: string | null;
};

export function resolveDetailCatalogSelection(params: {
  catalog: MotionVersionCatalog;
  langFromUrl: string | null | undefined;
  versionFromUrl: string | null | undefined;
  selFromUrl: string | null | undefined;
}): DetailCatalogSelection {
  const invalidDeepLink = isExplicitMotionUrlSelectionInvalid(
    params.catalog,
    params.langFromUrl,
    params.versionFromUrl,
    params.selFromUrl
  );
  if (invalidDeepLink) {
    return {
      invalidDeepLink: true,
      selectedCatalogSlot: null,
      selectedLanguageCode: params.catalog.defaultLanguageCode,
      selectionKey: null,
    };
  }
  const resolved = resolveMotionSelectionFromUrl(
    params.catalog,
    params.langFromUrl,
    params.versionFromUrl,
    params.selFromUrl
  );
  return {
    invalidDeepLink: false,
    selectedCatalogSlot: resolved?.slot ?? null,
    selectedLanguageCode: resolved?.languageCode ?? params.catalog.defaultLanguageCode,
    selectionKey: resolved?.selectionKey ?? null,
  };
}

/** Navigate to the source project with stable sel= render/lang deep link. */
export function buildDetailVersionNavigationHref(slot: MotionVersionSlot): string {
  return buildBundleSlotOpenHref(slot);
}

export function applyDetailVersionSelection(
  slot: MotionVersionSlot,
  routerReplace: (href: string) => void
): void {
  routerReplace(buildDetailVersionNavigationHref(slot));
}

export function resolveDetailSlotCleanVideoUrl(
  slot: MotionVersionSlot | null
): string | null {
  return slot?.cleanVideoUrl?.trim() ?? null;
}

export function resolveDetailSlotFinalVideoUrl(
  slot: MotionVersionSlot | null,
  fallbackUrl: string | null
): string | null {
  if (!slot) {
    return fallbackUrl;
  }
  return slot.finalVideoUrl?.trim() ?? fallbackUrl;
}

export function isFailedParentWithCompletedRender(params: {
  parentProjectStatus: string;
  selectedSlot: MotionVersionSlot | null;
}): boolean {
  if (params.parentProjectStatus !== "failed" || !params.selectedSlot) {
    return false;
  }
  return (
    params.selectedSlot.status === "completed" && isBundleSlotPlayable(params.selectedSlot)
  );
}

export function resolveDetailSlotDownloadUrl(slot: MotionVersionSlot | null): string | null {
  if (!slot || !isBundleSlotPlayable(slot)) {
    return null;
  }
  return buildBundleSlotDownloadUrl(slot);
}

export function findDetailCatalogSlot(
  catalog: MotionVersionCatalog,
  selectionKey: string
): MotionVersionSlot | null {
  return findMotionVersionSlot(catalog, selectionKey);
}

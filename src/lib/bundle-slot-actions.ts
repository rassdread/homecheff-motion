import {
  buildBundleSlotDownloadUrl,
  buildBundleSlotOpenHref,
  type SelectedBundleVersion,
} from "@/lib/bundle-selected-version";
import type { MotionVersionSlot } from "@/lib/motion-version-catalog";
import { hasPlayableOutputVideoUrl } from "@/lib/project-display-status";

/** Slot is playable when it has a final video URL (independent of parent project export status). */
export function isBundleSlotPlayable(slot: MotionVersionSlot): boolean {
  return hasPlayableOutputVideoUrl(slot.finalVideoUrl);
}

/** Dev/test guard — thumbnail, play, download, and open must target the same catalog slot. */
export function assertBundleSlotActionConsistency(selected: SelectedBundleVersion): void {
  const slot = selected.selectedCatalogSlot;
  const openHref = buildBundleSlotOpenHref(slot);
  const downloadUrl = buildBundleSlotDownloadUrl(slot);
  const finalUrl = slot.finalVideoUrl?.trim() ?? null;

  if (selected.openHref !== openHref) {
    throw new Error(`openHref mismatch: ${selected.openHref} !== ${openHref}`);
  }
  if (selected.downloadUrl !== downloadUrl) {
    throw new Error(`downloadUrl mismatch: ${selected.downloadUrl} !== ${downloadUrl}`);
  }
  if (selected.finalVideoUrl !== finalUrl) {
    throw new Error(`finalVideoUrl mismatch: ${selected.finalVideoUrl} !== ${finalUrl}`);
  }
  if (selected.projectId !== slot.sourceProjectId) {
    throw new Error(`projectId mismatch: ${selected.projectId} !== ${slot.sourceProjectId}`);
  }
}

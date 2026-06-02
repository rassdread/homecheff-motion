/**
 * User-facing recovery vs text-rerender action visibility for Instant Premium.
 */

import type { InstantPremiumStatusResponse } from "@/types/animation-api";

export type InstantRecoveryActionVisibility = {
  /** Broken or incomplete final video — repair/merge/overlay recovery. */
  showVideoRepair: boolean;
  /** Completed final — re-apply storyboard / overlay text without new AI video. */
  showTextRerender: boolean;
  /** Admin-only full rebuild from existing segment files. */
  showAdminForceRebuild: boolean;
};

export type InstantRecoveryActionSnapshot = Pick<
  InstantPremiumStatusResponse,
  | "canRepairFinalVideo"
  | "canRebuildFinalVideo"
  | "canRetryOverlay"
  | "canRetryMerge"
  | "segmentsMergeFailed"
  | "finalVideoUrl"
  | "overlayFailed"
  | "status"
>;

export function resolveInstantRecoveryActionVisibility(
  snapshot: InstantRecoveryActionSnapshot | null | undefined
): InstantRecoveryActionVisibility {
  if (!snapshot) {
    return {
      showVideoRepair: false,
      showTextRerender: false,
      showAdminForceRebuild: false,
    };
  }

  const showVideoRepair =
    Boolean(snapshot.canRepairFinalVideo) ||
    Boolean(snapshot.canRetryOverlay) ||
    Boolean(snapshot.canRetryMerge) ||
    Boolean(snapshot.segmentsMergeFailed);

  const hasPlayableFinal = Boolean(snapshot.finalVideoUrl?.trim());

  const showTextRerender =
    Boolean(snapshot.canRebuildFinalVideo) &&
    hasPlayableFinal &&
    !Boolean(snapshot.canRetryOverlay) &&
    !Boolean(snapshot.canRepairFinalVideo);

  const showAdminForceRebuild =
    Boolean(snapshot.canRebuildFinalVideo) &&
    (showVideoRepair || !hasPlayableFinal);

  return {
    showVideoRepair,
    showTextRerender,
    showAdminForceRebuild,
  };
}

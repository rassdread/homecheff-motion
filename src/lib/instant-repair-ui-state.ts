import { resolveInstantRecoveryActionVisibility } from "@/lib/instant-recovery-actions";
import type { InstantRecoveryActionSnapshot } from "@/lib/instant-recovery-actions";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

export type InstantRepairUiView = "completed" | "repair_running" | "repair_action" | "none";

export type InstantRepairUiInput = {
  snapshot: InstantRecoveryActionSnapshot | null | undefined;
  hasPlayableFinal?: boolean;
  repairStarting?: boolean;
};

export function resolveInstantRepairUiView(input: InstantRepairUiInput): InstantRepairUiView {
  const snapshot = input.snapshot;
  if (!snapshot) {
    return input.repairStarting ? "repair_running" : "none";
  }

  const hasFinal = Boolean(snapshot.finalVideoUrl?.trim()) || Boolean(input.hasPlayableFinal);
  if (hasFinal && snapshot.status === "completed") {
    return "completed";
  }

  const repairRunning =
    Boolean(input.repairStarting) ||
    snapshot.videoRepairStatus === "running" ||
    Boolean(snapshot.isRestoringFinalVideo);

  if (repairRunning) {
    return "repair_running";
  }

  const visibility = resolveInstantRecoveryActionVisibility(snapshot);
  if (visibility.showVideoRepair) {
    return "repair_action";
  }

  return "none";
}

export function shouldShowUnifiedVideoRepairCard(view: InstantRepairUiView): boolean {
  return view === "repair_action" || view === "repair_running";
}

export function repairSnapshotFromStatus(
  status: InstantPremiumStatusResponse | null | undefined
): InstantRecoveryActionSnapshot | null {
  if (!status) {
    return null;
  }
  return {
    canRepairFinalVideo: status.canRepairFinalVideo,
    canRebuildFinalVideo: status.canRebuildFinalVideo,
    canRetryOverlay: status.canRetryOverlay,
    canRetryMerge: status.canRetryMerge,
    segmentsMergeFailed: status.segmentsMergeFailed,
    finalVideoUrl: status.finalVideoUrl,
    overlayFailed: status.overlayFailed,
    status: status.status,
    videoRepairStatus: status.videoRepairStatus,
    isRestoringFinalVideo: status.isRestoringFinalVideo,
  };
}

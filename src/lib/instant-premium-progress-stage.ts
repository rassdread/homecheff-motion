import {
  inferFailedExportDisplayProgress,
  inferFailedExportStage,
  type ExportFailureDiagnostics,
} from "@/lib/instant-premium-export-failure";
import { normalizeTextRenderMode, usesPosterBaseComposite } from "@/lib/hybrid-motion-overlay";
import type { InstantPremiumFailureReason } from "@/types/animation-api";

export const INSTANT_EXPORT_STUCK_MS = 90_000;
export const REBUILD_PROGRESS_FLOOR = 70;

export type InstantPremiumProgressStage =
  | "segment_rendering"
  | "foreground_segmentation"
  | "merge_clips"
  | "poster_compositing"
  | "export_video"
  | "upload_storage"
  | "finalize"
  | "completed"
  | "failed";

export type InstantPremiumActiveOperation =
  | "segment_rendering"
  | "repair"
  | "rebuild"
  | "merge_export"
  | "upload"
  | "idle";

export type InstantPremiumProgressView = {
  stage: InstantPremiumProgressStage;
  activeOperation: InstantPremiumActiveOperation;
  displayPercent: number;
};

export type InstantPremiumProgressInput = {
  status: string;
  phase: string;
  progressPercent: number;
  isRebuildingFinalVideo?: boolean;
  isRestoringFinalVideo?: boolean;
  instantTextRenderMode?: string | null;
  overlayFailed?: boolean;
  exportFailure?: ExportFailureDiagnostics | null;
  failureReason?: InstantPremiumFailureReason | null;
  exportProgress?: number | null;
  exportStatus?: string | null;
};

export function resolveInstantPremiumProgress(
  input: InstantPremiumProgressInput
): InstantPremiumProgressView {
  const progress = Math.max(0, Math.min(100, Math.round(input.progressPercent)));
  const posterMode = usesPosterBaseComposite(normalizeTextRenderMode(input.instantTextRenderMode));

  if (input.isRebuildingFinalVideo) {
    return resolveFinalizingProgress(
      Math.max(REBUILD_PROGRESS_FLOOR, progress),
      posterMode,
      "rebuild"
    );
  }

  const exportFailed =
    input.exportFailure?.isExportFailure ||
    input.exportFailure?.finalRebuildFailed ||
    input.status === "failed" ||
    input.phase === "failed" ||
    input.overlayFailed;

  if (exportFailed) {
    const diagnostics = input.exportFailure;
    const displayPercent =
      diagnostics?.displayProgress ??
      inferFailedExportDisplayProgress({
        failureReason: input.failureReason ?? diagnostics?.exportFailureReason ?? null,
        exportProgress: input.exportProgress ?? null,
        exportStatus: input.exportStatus ?? null,
      });
    const failedAtStage =
      diagnostics?.failedAtStage ??
      inferFailedExportStage({
        failureReason: input.failureReason ?? diagnostics?.exportFailureReason ?? null,
        displayProgress: displayPercent,
        exportStatus: input.exportStatus ?? null,
      });
    const activeOperation: InstantPremiumActiveOperation = diagnostics?.finalRebuildFailed
      ? "rebuild"
      : "idle";
    return {
      stage: failedAtStage,
      activeOperation,
      displayPercent,
    };
  }

  if (input.status === "completed" || input.phase === "completed") {
    return { stage: "completed", activeOperation: "idle", displayPercent: 100 };
  }

  if (input.isRestoringFinalVideo) {
    return resolveFinalizingProgress(progress, posterMode, "repair");
  }

  if (input.phase === "uploading_final" || progress >= 85) {
    if (progress >= 95) {
      return { stage: "finalize", activeOperation: "upload", displayPercent: progress };
    }
    return { stage: "upload_storage", activeOperation: "upload", displayPercent: progress };
  }

  if (input.phase === "merging_clips" || input.status === "finalizing" || input.status === "rendering") {
    return resolveFinalizingProgress(progress, posterMode, "merge_export");
  }

  if (input.phase === "generating_clips" || input.status === "running" || input.status === "queued") {
    const segmentPct = Math.max(5, Math.min(70, progress > 0 ? progress : 8));
    if (posterMode && progress > 0 && progress < 12) {
      return {
        stage: "foreground_segmentation",
        activeOperation: "segment_rendering",
        displayPercent: Math.max(4, segmentPct),
      };
    }
    return {
      stage: "segment_rendering",
      activeOperation: "segment_rendering",
      displayPercent: segmentPct,
    };
  }

  return {
    stage: "segment_rendering",
    activeOperation: "segment_rendering",
    displayPercent: Math.max(5, progress),
  };
}

function resolveFinalizingProgress(
  progress: number,
  posterMode: boolean,
  operation: "rebuild" | "repair" | "merge_export"
): InstantPremiumProgressView {
  const activeOperation: InstantPremiumActiveOperation =
    operation === "rebuild" ? "rebuild" : operation === "repair" ? "repair" : "merge_export";

  if (progress >= 95) {
    return { stage: "finalize", activeOperation: "upload", displayPercent: progress };
  }
  if (progress >= 85) {
    return { stage: "upload_storage", activeOperation: "upload", displayPercent: progress };
  }
  if (progress >= 80) {
    return { stage: "export_video", activeOperation, displayPercent: progress };
  }
  if (posterMode && progress >= 72) {
    return { stage: "poster_compositing", activeOperation, displayPercent: progress };
  }
  if (progress >= 70) {
    return { stage: "merge_clips", activeOperation, displayPercent: progress };
  }
  return { stage: "merge_clips", activeOperation, displayPercent: Math.max(70, progress) };
}

export function isInstantExportProgressStuck(params: {
  isActive: boolean;
  lastProgressChangeAtMs: number | null;
  nowMs?: number;
  /** When true, repair/rebuild is in flight — do not show "stuck" heuristics. */
  repairInProgress?: boolean;
}): boolean {
  if (params.repairInProgress) {
    return false;
  }
  if (!params.isActive || params.lastProgressChangeAtMs == null) {
    return false;
  }
  const now = params.nowMs ?? Date.now();
  return now - params.lastProgressChangeAtMs >= INSTANT_EXPORT_STUCK_MS;
}

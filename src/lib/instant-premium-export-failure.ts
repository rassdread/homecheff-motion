import type {
  InstantPremiumFailureReason,
  InstantPremiumProgressStage,
} from "@/types/animation-api";

export type FinalExportFailureLog = {
  projectId: string;
  exportId: string | null;
  provider: string | null;
  stage: InstantPremiumProgressStage | string;
  failureReason: InstantPremiumFailureReason | null;
  failureMessage: string | null;
  workerError: string | null;
};

export type ExportFailureDiagnosticsInput = {
  projectId: string;
  projectStatus: string;
  failureReason: InstantPremiumFailureReason | null;
  overlayFailed: boolean;
  instantFinalRebuildStatus: string | null;
  instantWorkerJobStatus: string | null;
  lastOverlayError: string | null;
  export: {
    id: string;
    status: string;
    progress: number | null;
    errorMessage: string | null;
    provider: string | null;
  } | null;
};

export type ExportFailureDiagnostics = {
  exportId: string | null;
  exportStatus: string | null;
  exportFailureReason: InstantPremiumFailureReason | null;
  exportLastError: string | null;
  workerError: string | null;
  failedAtStage: InstantPremiumProgressStage;
  displayProgress: number;
  isExportFailure: boolean;
  finalRebuildFailed: boolean;
};

const FAILURE_REASONS: ReadonlySet<InstantPremiumFailureReason> = new Set([
  "overlay_failed",
  "merge_failed",
  "export_upload_auth_failed",
]);

export function isInstantPremiumFailureReason(
  value: string | null | undefined
): value is InstantPremiumFailureReason {
  return value != null && FAILURE_REASONS.has(value as InstantPremiumFailureReason);
}

export function inferFailedExportDisplayProgress(params: {
  failureReason: InstantPremiumFailureReason | null;
  exportProgress: number | null;
  exportStatus: string | null;
}): number {
  const raw = params.exportProgress ?? 0;
  if (raw > 0) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  if (params.exportStatus === "failed_overlay" || params.failureReason === "overlay_failed") {
    return 75;
  }
  if (params.failureReason === "export_upload_auth_failed") {
    return 85;
  }
  if (params.exportStatus === "failed") {
    return 70;
  }
  return 70;
}

export function inferFailedExportStage(params: {
  failureReason: InstantPremiumFailureReason | null;
  displayProgress: number;
  exportStatus: string | null;
}): InstantPremiumProgressStage {
  const progress = params.displayProgress;
  if (params.exportStatus === "failed_overlay" || params.failureReason === "overlay_failed") {
    return progress >= 80 ? "export_video" : "poster_compositing";
  }
  if (params.failureReason === "export_upload_auth_failed" || progress >= 85) {
    return "upload_storage";
  }
  if (progress >= 80) {
    return "export_video";
  }
  if (progress >= 72) {
    return "poster_compositing";
  }
  return "merge_clips";
}

export function resolveExportFailureDiagnostics(
  input: ExportFailureDiagnosticsInput
): ExportFailureDiagnostics | null {
  const exportRow = input.export;
  const exportStatus = exportRow?.status ?? null;
  const exportFailed =
    exportStatus === "failed" ||
    exportStatus === "failed_overlay" ||
    input.projectStatus === "failed" ||
    input.projectStatus === "failed_overlay" ||
    input.overlayFailed;
  const rebuildFailed = input.instantFinalRebuildStatus === "failed";
  const rebuildError =
    rebuildFailed && exportRow?.errorMessage?.trim() ? exportRow.errorMessage.trim() : null;

  if (!exportFailed && !rebuildFailed) {
    return null;
  }

  const exportFailureReason: InstantPremiumFailureReason | null = isInstantPremiumFailureReason(
    input.failureReason ?? undefined
  )
    ? input.failureReason
    : input.overlayFailed || exportStatus === "failed_overlay"
      ? "overlay_failed"
      : input.projectStatus === "failed" || exportStatus === "failed"
        ? "merge_failed"
        : rebuildFailed
          ? "merge_failed"
          : null;

  const exportLastError =
    (input.overlayFailed ? input.lastOverlayError : null) ??
    exportRow?.errorMessage?.trim() ??
    rebuildError ??
    null;

  const workerError =
    input.instantWorkerJobStatus === "failed"
      ? exportLastError ?? input.lastOverlayError
      : input.lastOverlayError;

  const displayProgress = inferFailedExportDisplayProgress({
    failureReason: exportFailureReason,
    exportProgress: exportRow?.progress ?? null,
    exportStatus,
  });

  const failedAtStage = inferFailedExportStage({
    failureReason: exportFailureReason,
    displayProgress,
    exportStatus,
  });

  return {
    exportId: exportRow?.id ?? null,
    exportStatus,
    exportFailureReason,
    exportLastError,
    workerError: workerError?.trim() || null,
    failedAtStage,
    displayProgress,
    isExportFailure: exportFailed || rebuildFailed,
    finalRebuildFailed: rebuildFailed,
  };
}

export function logFinalExportFailed(params: FinalExportFailureLog): void {
  console.error("[final-export-failed]", {
    projectId: params.projectId,
    exportId: params.exportId,
    provider: params.provider,
    stage: params.stage,
    failureReason: params.failureReason,
    workerError: params.workerError ?? params.failureMessage,
    failureMessage: params.failureMessage,
  });
}

export type UserSafeExportFailureKey =
  | "instant.exportFailure.overlay"
  | "instant.exportFailure.merge"
  | "instant.exportFailure.uploadAuth"
  | "instant.exportFailure.rebuild"
  | "instant.exportFailure.generic";

export function userSafeExportFailureKey(
  failureReason: InstantPremiumFailureReason | null,
  finalRebuildFailed?: boolean
): UserSafeExportFailureKey {
  if (finalRebuildFailed) {
    return "instant.exportFailure.rebuild";
  }
  switch (failureReason) {
    case "overlay_failed":
      return "instant.exportFailure.overlay";
    case "export_upload_auth_failed":
      return "instant.exportFailure.uploadAuth";
    case "merge_failed":
      return "instant.exportFailure.merge";
    default:
      return "instant.exportFailure.generic";
  }
}

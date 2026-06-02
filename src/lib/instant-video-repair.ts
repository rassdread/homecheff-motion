import type { FinalExportStage } from "@/lib/export-timeout";

export const INSTANT_VIDEO_REPAIR_STAGES = [
  "started",
  "checking_source",
  "preparing_clean",
  "reapplying_texts",
  "uploading_final",
  "done",
  "failed",
] as const;

export type InstantVideoRepairStage = (typeof INSTANT_VIDEO_REPAIR_STAGES)[number];

export type InstantVideoRepairStatus = "running" | "completed" | "failed";

export type VideoRepairAudit = {
  status: InstantVideoRepairStatus;
  stage: InstantVideoRepairStage;
  startedAt: string;
  updatedAt: string;
  source?: string;
  workerMode?: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export const INSTANT_VIDEO_REPAIR_STAGE_I18N: Record<InstantVideoRepairStage, string> = {
  started: "instant.videoRepair.stage.started",
  checking_source: "instant.videoRepair.stage.checkingSource",
  preparing_clean: "instant.videoRepair.stage.preparingClean",
  reapplying_texts: "instant.videoRepair.stage.reapplyingTexts",
  uploading_final: "instant.videoRepair.stage.uploadingFinal",
  done: "instant.videoRepair.stage.done",
  failed: "instant.videoRepair.stage.failed",
};

export function readVideoRepairAudit(auditJson: unknown): VideoRepairAudit | null {
  if (!auditJson || typeof auditJson !== "object" || Array.isArray(auditJson)) {
    return null;
  }
  const raw = (auditJson as { videoRepair?: unknown }).videoRepair;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as VideoRepairAudit;
  if (
    row.status !== "running" &&
    row.status !== "completed" &&
    row.status !== "failed"
  ) {
    return null;
  }
  if (!INSTANT_VIDEO_REPAIR_STAGES.includes(row.stage)) {
    return null;
  }
  if (typeof row.startedAt !== "string" || typeof row.updatedAt !== "string") {
    return null;
  }
  return row;
}

export function mergeVideoRepairAudit(
  existing: unknown,
  patch: Partial<VideoRepairAudit> & Pick<VideoRepairAudit, "status" | "stage">
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const prior = readVideoRepairAudit(existing);
  const startedAt = prior?.startedAt ?? patch.startedAt ?? new Date().toISOString();
  const videoRepair: VideoRepairAudit = {
    status: patch.status,
    stage: patch.stage,
    startedAt,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
    source: patch.source ?? prior?.source,
    workerMode: patch.workerMode ?? prior?.workerMode,
    errorCode: patch.errorCode ?? prior?.errorCode ?? null,
    errorMessage: patch.errorMessage ?? prior?.errorMessage ?? null,
  };
  return { ...base, videoRepair };
}

export function clearVideoRepairAudit(existing: unknown): Record<string, unknown> | null {
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
    return null;
  }
  const base = { ...(existing as Record<string, unknown>) };
  delete base.videoRepair;
  return Object.keys(base).length > 0 ? base : null;
}

export function isVideoRepairRunning(audit: VideoRepairAudit | null): boolean {
  return audit?.status === "running";
}

export function resolveVideoRepairStageFromExport(input: {
  repairRunning: boolean;
  exportProgress: number | null;
  exportStatus: string | null;
  projectStatus: string;
  finalExportStage: FinalExportStage | null;
}): InstantVideoRepairStage | null {
  if (!input.repairRunning) {
    return null;
  }
  if (input.exportStatus === "failed" || input.projectStatus === "failed") {
    return "failed";
  }
  if (
    input.exportStatus === "completed" ||
    (input.projectStatus === "completed" && (input.exportProgress ?? 0) >= 100)
  ) {
    return "done";
  }

  const stage = input.finalExportStage;
  if (stage === "download_segments" || stage === "worker_dispatch" || stage === "worker_wait") {
    return "checking_source";
  }
  if (stage === "normalize" || stage === "concat" || stage === "exposure_match") {
    return "preparing_clean";
  }
  if (stage === "overlay") {
    return "reapplying_texts";
  }
  if (stage === "upload" || stage === "finalize") {
    return "uploading_final";
  }

  const progress = input.exportProgress ?? 0;
  if (progress >= 90) {
    return "uploading_final";
  }
  if (progress >= 55) {
    return "reapplying_texts";
  }
  if (progress >= 20) {
    return "preparing_clean";
  }
  if (progress >= 5) {
    return "checking_source";
  }
  return "started";
}

export type VideoRepairAdminDetail = {
  stage: InstantVideoRepairStage | null;
  status: InstantVideoRepairStatus | null;
  errorCode: string | null;
  workerError: string | null;
  exportLastError: string | null;
  failureReason: string | null;
  exportStatus: string | null;
  exportProgress: number | null;
  workerJobStatus: string | null;
  finalExportStage: FinalExportStage | null;
  updatedAt: string | null;
  startedAt: string | null;
};

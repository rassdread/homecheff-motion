/** Labels and guards for film export. Stages are coarse. There is no progress percent. */

export const TIMELINE_EXPORT_CAPABILITY = "TIMELINE_EXPORT";

const STAGE_LABEL_KEY: Record<string, string> = {
  preparing: "studio.workspace.v278.exportPreparing",
  rendering_scenes: "studio.workspace.v278.exportRendering",
  processing_audio: "studio.workspace.v278.exportAudio",
  finalizing: "studio.workspace.v278.exportFinalizing",
  saving: "studio.workspace.v278.exportSaving",
  completed: "studio.workspace.v16.exportSaved",
  failed: "studio.workspace.v16.exportFailed",
  cancelled: "studio.workspace.v16.exportCancelled",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  pending: "studio.jobs.status.queued",
  queued: "studio.jobs.status.queued",
  starting: "studio.jobs.status.running",
  generating: "studio.jobs.status.running",
  processing: "studio.jobs.status.running",
  succeeded: "studio.jobs.status.completed",
  completed: "studio.jobs.status.completed",
  failed: "studio.jobs.status.failed",
  cancel_requested: "studio.jobs.status.cancelled",
  cancelled: "studio.jobs.status.cancelled",
};

export function timelineExportStatusKey(status: string): string {
  return STATUS_LABEL_KEY[status] ?? "studio.jobs.status.failed";
}

export function canCancelTimelineExport(status: string): boolean {
  return status === "pending" || status === "queued" || status === "processing";
}

export function timelineExportStage(status: string, metadata: unknown): string {
  if (status === "succeeded") return "completed";
  if (status === "failed") return "failed";
  if (status === "cancelled" || status === "cancel_requested") return "cancelled";
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const stage = (metadata as { stage?: unknown }).stage;
    if (typeof stage === "string" && STAGE_LABEL_KEY[stage]) return stage;
  }
  return "preparing";
}

export function timelineExportStageKey(stage: string): string {
  return STAGE_LABEL_KEY[stage] ?? STAGE_LABEL_KEY.preparing;
}

/** User-facing failure text. Never the FFmpeg log. */
export function safeTimelineExportFailure(code: string): { code: string; message: string } {
  if (code === "missing_video" || code === "missing_media") {
    return { code: "missing_video", message: "Add at least one picture clip." };
  }
  if (code === "overlap" || code === "invalid_time") {
    return { code, message: "A clip has an invalid time." };
  }
  if (code === "unsupported_source" || code === "download") {
    return { code, message: "A clip could not be read from Studio storage." };
  }
  if (code === "cancelled") {
    return { code: "cancelled", message: "Export was cancelled." };
  }
  if (code === "film_export_worker_required" || code === "worker_route_unavailable") {
    return {
      code,
      message: "Film export runs on the video worker. This function does not encode video.",
    };
  }
  if (code === "storage") {
    return { code, message: "The film could not be saved." };
  }
  return { code: code || "export_failed", message: "Export did not finish." };
}

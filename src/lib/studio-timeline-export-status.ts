/** Labels and guards for the existing synchronous film export. No queue and no progress percent. */

export const TIMELINE_EXPORT_CAPABILITY = "TIMELINE_EXPORT";

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
  return { code: code || "export_failed", message: "Export did not finish." };
}

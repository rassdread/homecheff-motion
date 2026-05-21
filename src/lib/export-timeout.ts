/**
 * Time budgets for final merge/export (rebuild, concat, upload).
 * Override with EXPORT_TIMEOUT_MS (60000–300000, default 180000).
 */

export const EXPORT_TIMEOUT_DEFAULT_MS = 180_000;
export const EXPORT_TIMEOUT_MIN_MS = 60_000;
export const EXPORT_TIMEOUT_MAX_MS = 300_000;
export const WORKER_DISPATCH_TIMEOUT_MS = 30_000;
export const WORKER_POLL_INTERVAL_MS = 2_500;

export type FinalExportStage =
  | "download_segments"
  | "normalize"
  | "exposure_match"
  | "concat"
  | "overlay"
  | "upload"
  | "finalize"
  | "worker_dispatch"
  | "worker_wait";

export type FinalExportTimeoutLog = {
  projectId: string;
  stage: FinalExportStage;
  elapsedMs: number;
  timeoutMs: number;
  activeSegment?: number;
  ffmpegCommand?: string;
  abortSource: string;
  exportId?: string | null;
};

export function resolveExportTimeoutMs(): number {
  const raw = process.env.EXPORT_TIMEOUT_MS?.trim();
  if (!raw) {
    return EXPORT_TIMEOUT_DEFAULT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return EXPORT_TIMEOUT_DEFAULT_MS;
  }
  return Math.min(EXPORT_TIMEOUT_MAX_MS, Math.max(EXPORT_TIMEOUT_MIN_MS, parsed));
}

/** Per-segment HTTP download budget (scales with segment count, capped by export timeout). */
export function resolveSegmentDownloadTimeoutMs(segmentCount = 3): number {
  const base = resolveExportTimeoutMs();
  const perSegment = Math.min(180_000, Math.max(120_000, Math.floor(base / 2)));
  return Math.min(base, perSegment * Math.max(1, segmentCount));
}

/** FFmpeg subprocess budget for a single heavy stage. */
export function resolveFfmpegStageTimeoutMs(stage: FinalExportStage): number {
  const total = resolveExportTimeoutMs();
  switch (stage) {
    case "concat":
      return Math.min(EXPORT_TIMEOUT_MAX_MS, Math.max(120_000, Math.floor(total * 0.55)));
    case "normalize":
    case "exposure_match":
      return Math.min(240_000, Math.max(90_000, Math.floor(total * 0.35)));
    case "overlay":
      return Math.min(240_000, Math.max(90_000, Math.floor(total * 0.4)));
    default:
      return Math.min(EXPORT_TIMEOUT_MAX_MS, Math.max(60_000, total));
  }
}

export function logFinalExportTimeout(entry: FinalExportTimeoutLog): void {
  console.warn("[final-export-timeout]", entry);
}

export function isTimeoutLikeError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    name === "TimeoutError" ||
    name === "AbortError" ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("aborted due to timeout") ||
    lower.includes("aborterror")
  );
}

export class FinalExportTimeoutError extends Error {
  readonly code = "REBUILD_FAILED_TIMEOUT";
  readonly stage: FinalExportStage;
  readonly elapsedMs: number;
  readonly timeoutMs: number;
  readonly abortSource: string;

  constructor(params: {
    message: string;
    stage: FinalExportStage;
    elapsedMs: number;
    timeoutMs: number;
    abortSource: string;
  }) {
    super(params.message);
    this.name = "FinalExportTimeoutError";
    this.stage = params.stage;
    this.elapsedMs = params.elapsedMs;
    this.timeoutMs = params.timeoutMs;
    this.abortSource = params.abortSource;
  }
}

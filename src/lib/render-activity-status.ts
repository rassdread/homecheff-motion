/**
 * Active render / concept generation statuses and stuck detection.
 */

export const CANCELLABLE_PROJECT_STATUSES = new Set([
  "pending",
  "queued",
  "generating",
  "rendering",
  "processing",
]);

export const CANCELLABLE_TRANSITION_STATUSES = new Set([
  "pending",
  "queued",
  "generating",
  "rendering",
  "processing",
]);

export const CANCELLABLE_EXPORT_STATUSES = new Set([
  "idle",
  "pending",
  "queued",
  "generating",
  "rendering",
  "processing",
]);

/** Stuck thresholds (ms) per normalized activity status. */
export const STUCK_RENDER_TIMEOUT_MS: Record<string, number> = {
  queued: 10 * 60 * 1000,
  generating: 30 * 60 * 1000,
  processing: 15 * 60 * 1000,
  rendering: 15 * 60 * 1000,
};

export type StuckRenderDetection = {
  stuck: boolean;
  elapsedMs: number;
  thresholdMs: number;
  status: string;
};

export function normalizeActivityStatus(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

export function isCancellableProjectStatus(status: string | null | undefined): boolean {
  return CANCELLABLE_PROJECT_STATUSES.has(normalizeActivityStatus(status));
}

export function isCancellableTransitionStatus(status: string | null | undefined): boolean {
  return CANCELLABLE_TRANSITION_STATUSES.has(normalizeActivityStatus(status));
}

export function isCancellableExportStatus(status: string | null | undefined): boolean {
  return CANCELLABLE_EXPORT_STATUSES.has(normalizeActivityStatus(status));
}

export function isActiveRenderProjectStatus(status: string | null | undefined): boolean {
  return isCancellableProjectStatus(status);
}

export function detectStuckRender(input: {
  status: string;
  activityStartedAtMs: number | null;
  lastProgressAtMs: number | null;
  nowMs?: number;
}): StuckRenderDetection {
  const status = normalizeActivityStatus(input.status);
  const thresholdMs = STUCK_RENDER_TIMEOUT_MS[status] ?? 0;
  const nowMs = input.nowMs ?? Date.now();
  const anchorMs = input.lastProgressAtMs ?? input.activityStartedAtMs ?? nowMs;
  const elapsedMs = Math.max(0, nowMs - anchorMs);

  if (!thresholdMs || !CANCELLABLE_PROJECT_STATUSES.has(status)) {
    return { stuck: false, elapsedMs, thresholdMs, status };
  }

  return {
    stuck: elapsedMs >= thresholdMs,
    elapsedMs,
    thresholdMs,
    status,
  };
}

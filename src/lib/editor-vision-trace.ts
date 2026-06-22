/**
 * Temporary vision pipeline trace — remove after stall root-cause is confirmed.
 */

export type VisionTraceContext = {
  sessionId?: string;
  runId?: string;
  analysisId?: string;
  analysisStatus?: string;
  pipelineStage?: string;
  openStage?: string;
  progressPercent?: number;
  [key: string]: unknown;
};

export function traceVisionPipeline(event: string, detail?: VisionTraceContext): void {
  if (typeof window === "undefined" && typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return;
  }
  const payload = detail ? ` ${JSON.stringify(detail)}` : "";
  // eslint-disable-next-line no-console
  console.info(`[vision.trace] ${event}${payload}`);
}

export function traceVisionStageTransition(
  from: string,
  to: string,
  detail?: VisionTraceContext
): void {
  traceVisionPipeline("STAGE_TRANSITION", { from, to, ...detail });
}

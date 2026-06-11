import { after } from "next/server";
import { mapReplicateErrorToCode, type EditorSegmentErrorCode } from "@/lib/editor-segmentation-errors";
import { logEditorSegmentJob } from "@/server/editor/editor-segment-click-job-log";
import {
  getEditorSegmentClickJob,
  markEditorSegmentClickJobFailed,
  markEditorSegmentClickJobReady,
  markEditorSegmentClickJobRunning,
} from "@/server/editor/editor-segment-click-job-store";
import { segmentByClick } from "@/server/editor/editor-segmentation-provider";
import type { EditorSegmentClickJobResult, EditorSegmentClickJobTrace } from "@/types/editor-segment-click-job";

function isRetryableCode(code: EditorSegmentErrorCode): boolean {
  return (
    code === "replicate_timeout" ||
    code === "replicate_prediction_failed" ||
    code === "image_fetch_failed" ||
    code === "mask_fetch_failed" ||
    code === "blob_upload_failed" ||
    code === "SEGMENT_UNAVAILABLE"
  );
}

function toJobResult(
  shape: {
    selectionMode?: string;
    maskUrl?: string;
    cutoutUrl?: string;
    polygon?: { x: number; y: number }[];
    boundingBox: { x: number; y: number; width: number; height: number };
    segmentationSource?: string;
    confidence?: number;
    maskStorageKey?: string;
    alphaMask?: boolean;
  },
  provider: {
    providerUsed?: string;
    predictionId?: string;
    runtimeMs?: number;
  }
): EditorSegmentClickJobResult {
  return {
    selectionMode: shape.selectionMode,
    maskUrl: shape.maskUrl,
    cutoutUrl: shape.cutoutUrl,
    polygon: shape.polygon,
    boundingBox: shape.boundingBox,
    segmentationSource: shape.segmentationSource,
    confidence: shape.confidence,
    maskStorageKey: shape.maskStorageKey,
    alphaMask: shape.alphaMask,
    providerUsed: provider.providerUsed,
    predictionId: provider.predictionId,
    runtimeMs: provider.runtimeMs,
  };
}

function markJobOrphanedTimeout(jobId: string, elapsedMs: number): void {
  const job = getEditorSegmentClickJob(jobId);
  if (!job || job.status === "ready" || job.status === "failed" || job.status === "timeout") {
    return;
  }
  markEditorSegmentClickJobFailed(jobId, {
    status: "timeout",
    errorCode: "replicate_timeout",
    errorMessage: "Segmentation job did not complete.",
    retryable: true,
    trace: { totalMs: elapsedMs },
  });
}

export function scheduleEditorSegmentClickJob(jobId: string): void {
  after(async () => {
    await runEditorSegmentClickJob(jobId);
  });
}

export async function runEditorSegmentClickJob(jobId: string): Promise<void> {
  const job = getEditorSegmentClickJob(jobId);
  if (!job) {
    logEditorSegmentJob({
      jobId,
      status: "failed",
      finalResult: "job_missing",
      errorCode: "job_not_found",
    });
    return;
  }
  if (job.status !== "queued") {
    logEditorSegmentJob({
      jobId,
      status: job.status,
      finalResult: "skipped_not_queued",
      prompt: job.prompt,
    });
    return;
  }

  markEditorSegmentClickJobRunning(jobId);
  const startedMs = Date.now();
  logEditorSegmentJob({
    jobId,
    status: "running",
    provider: "replicate_sam3",
    elapsedMs: 0,
    prompt: job.prompt,
  });

  try {
    const result = await segmentByClick({
      userId: job.userId,
      sessionId: job.sessionId,
      imageUrl: job.imageUrl,
      backgroundStorageKey: job.backgroundStorageKey,
      clickPoint: job.clickPoint,
      targetBounds: job.targetBounds,
      objectHint: job.prompt,
      editorObjectId: job.editorObjectId,
      createCutout: job.createCutout,
      requestId: jobId,
      asyncJob: true,
    });

    const totalMs = Date.now() - startedMs;
    const trace: EditorSegmentClickJobTrace = {
      replicatePredictionMs: result.ok ? result.result.runtimeMs : undefined,
      totalMs,
    };

    if (!result.ok) {
      const status = result.code === "replicate_timeout" ? "timeout" : "failed";
      markEditorSegmentClickJobFailed(jobId, {
        status,
        errorCode: result.code,
        errorMessage: result.message,
        retryable: isRetryableCode(result.code),
        trace,
      });
      return;
    }

    markEditorSegmentClickJobReady(
      jobId,
      toJobResult(result.shape, result.result),
      trace
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Segmentation failed.";
    const code = mapReplicateErrorToCode(message);
    const totalMs = Date.now() - startedMs;
    markEditorSegmentClickJobFailed(jobId, {
      status: code === "replicate_timeout" ? "timeout" : "failed",
      errorCode: code,
      errorMessage: message,
      retryable: isRetryableCode(code),
      trace: { totalMs },
    });
  } finally {
    markJobOrphanedTimeout(jobId, Date.now() - startedMs);
  }
}

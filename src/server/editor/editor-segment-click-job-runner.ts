import { after } from "next/server";
import { mapReplicateErrorToCode, type EditorSegmentErrorCode } from "@/lib/editor-segmentation-errors";
import {
  EDITOR_JOB_CLICK_DEADLINE_MS,
  EDITOR_JOB_REPLICATE_TIMEOUT_MS,
} from "@/server/editor/replicate-sam3-editor-segment";
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

export function scheduleEditorSegmentClickJob(jobId: string): void {
  after(async () => {
    await runEditorSegmentClickJob(jobId);
  });
}

export async function runEditorSegmentClickJob(jobId: string): Promise<void> {
  const job = getEditorSegmentClickJob(jobId);
  if (!job || job.status !== "queued") {
    return;
  }

  markEditorSegmentClickJobRunning(jobId);
  const startedMs = Date.now();

  console.info("[editor-segmentation]", {
    phase: "async_job_start",
    jobId,
    prompt: job.prompt,
    sessionId: job.sessionId,
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
      const status =
        result.code === "replicate_timeout" ? "timeout" : "failed";
      console.info("[editor-segmentation]", {
        phase: "async_job_failed",
        jobId,
        failureCode: result.code,
        totalMs,
      });
      markEditorSegmentClickJobFailed(jobId, {
        status,
        errorCode: result.code,
        errorMessage: result.message,
        retryable: isRetryableCode(result.code),
        trace,
      });
      return;
    }

    console.info("[editor-segmentation]", {
      phase: "async_job_ready",
      jobId,
      replicatePredictionMs: result.result.runtimeMs,
      totalMs,
    });

    markEditorSegmentClickJobReady(
      jobId,
      toJobResult(result.shape, result.result),
      trace
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Segmentation failed.";
    const code = mapReplicateErrorToCode(message);
    const totalMs = Date.now() - startedMs;
    console.error("[editor-segmentation]", {
      phase: "async_job_error",
      jobId,
      error: message,
      totalMs,
    });
    markEditorSegmentClickJobFailed(jobId, {
      status: code === "replicate_timeout" ? "timeout" : "failed",
      errorCode: code,
      errorMessage: message,
      retryable: isRetryableCode(code),
      trace: { totalMs },
    });
  }
}

import fs from "node:fs/promises";
import {
  getVideoWorkerBaseUrl,
  isVideoRenderWorkerMode,
} from "@/lib/video-render-mode";
import {
  recordUnifiedDetectionMetric,
} from "@/lib/vision/unified-detection-metrics";
import type {
  UnifiedDetectionBackend,
  UnifiedDetectionInput,
  UnifiedDetectionResult,
} from "@/lib/vision/unified-detection-types";
import { buildUnifiedDetectionLabels, toUnifiedDetectionStatus } from "@/lib/vision/unified-detection-types";
import { requestWorkerVisionDetect } from "@/lib/video-worker-client";
import { detectObjectsForEditor } from "@/server/animation-export/local-vision/object-detector";
import { resolveObjectDetectorModelPath } from "@/server/animation-export/local-vision/object-detector-model-paths";
import { importOptionalModule } from "@/server/animation-export/local-vision/optional-import";
import { withVisionDetectTempPath } from "@/server/animation-export/local-vision/vision-detect-input";

async function isLocalRtdetrReady(): Promise<boolean> {
  try {
    const modelPath = await resolveObjectDetectorModelPath();
    const modelExists = await fs.access(modelPath).then(() => true).catch(() => false);
    if (!modelExists) {
      return false;
    }
    const ort = await importOptionalModule<typeof import("onnxruntime-node")>("onnxruntime-node");
    return Boolean(ort);
  } catch {
    return false;
  }
}

async function resolveDetectionBackend(): Promise<UnifiedDetectionBackend> {
  if (process.env.HC_FORCE_LOCAL_DETECTION === "1") {
    if (await isLocalRtdetrReady()) {
      return "local";
    }
  }

  const workerConfigured =
    isVideoRenderWorkerMode() && Boolean(getVideoWorkerBaseUrl()?.trim());

  if (process.env.VERCEL && workerConfigured) {
    return "video-worker";
  }

  if (await isLocalRtdetrReady()) {
    return "local";
  }

  if (workerConfigured) {
    return "video-worker";
  }

  return "unavailable";
}

function unavailableResult(
  error: string,
  inferenceMs: number,
  consumer?: UnifiedDetectionInput["consumer"]
): UnifiedDetectionResult {
  const result: UnifiedDetectionResult = {
    detections: [],
    failed: true,
    error,
    backend: "unavailable",
    available: false,
    status: "unavailable",
    inferenceMs,
    detectedAt: new Date().toISOString(),
    consumer,
  };
  recordUnifiedDetectionMetric({
    backend: "unavailable",
    consumer,
    detectionCount: 0,
    inferenceMs,
    failed: true,
    error,
  });
  return result;
}

async function runLocalDetection(
  input: UnifiedDetectionInput,
  startedAt: number
): Promise<UnifiedDetectionResult> {
  const inference = await withVisionDetectTempPath(input, async (tempPath) =>
    detectObjectsForEditor(tempPath)
  );
  const inferenceMs = Date.now() - startedAt;
  const available = !inference.failed;
  const backend: UnifiedDetectionBackend = inference.failed ? "fallback" : "local";
  const result: UnifiedDetectionResult = {
    ...inference,
    backend,
    available,
    status: toUnifiedDetectionStatus({
      failed: inference.failed,
      backend,
      detections: inference.detections,
    }),
    inferenceMs,
    detectedAt: new Date().toISOString(),
    consumer: input.consumer,
  };
  recordUnifiedDetectionMetric({
    backend,
    consumer: input.consumer,
    detectionCount: inference.detections.length,
    inferenceMs,
    failed: inference.failed,
    error: inference.error,
  });
  return result;
}

async function runWorkerDetection(
  input: UnifiedDetectionInput,
  startedAt: number
): Promise<UnifiedDetectionResult> {
  try {
    const workerResult = await requestWorkerVisionDetect({
      imageUrl: input.imageUrl,
      imagePath: input.imagePath,
      imageBase64: input.imageBase64,
    });
    const inferenceMs = workerResult.inferenceMs ?? Date.now() - startedAt;
    const available = !workerResult.failed;
    const result: UnifiedDetectionResult = {
      detections: workerResult.detections,
      failed: workerResult.failed,
      error: workerResult.error,
      detectorKind: workerResult.detectorKind,
      backend: "video-worker",
      available,
      status: workerResult.failed ? "unavailable" : "active",
      inferenceMs,
      detectedAt: workerResult.detectedAt ?? new Date().toISOString(),
      workerReachable: true,
      consumer: input.consumer,
    };
    recordUnifiedDetectionMetric({
      backend: "video-worker",
      consumer: input.consumer,
      detectionCount: workerResult.detections.length,
      inferenceMs,
      failed: workerResult.failed,
      error: workerResult.error,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const inferenceMs = Date.now() - startedAt;

    if (await isLocalRtdetrReady()) {
      const local = await runLocalDetection(input, startedAt);
      return {
        ...local,
        error: `${message}; used local fallback.`,
        backend: "fallback",
        status: "fallback",
      };
    }

    return unavailableResult(message, inferenceMs, input.consumer);
  }
}

/**
 * Single entry point for RT-DETR object detection across Editor, Motion, Safe Zones,
 * overlay placement, and future AI Assistant flows.
 */
export async function resolveObjectDetections(
  input: UnifiedDetectionInput
): Promise<UnifiedDetectionResult> {
  const startedAt = Date.now();
  const hasInput = Boolean(
    input.imageUrl?.trim() || input.imagePath?.trim() || input.imageBase64?.trim()
  );
  if (!hasInput) {
    return unavailableResult("imageUrl, imagePath, or imageBase64 is required.", 0, input.consumer);
  }

  const backend = await resolveDetectionBackend();

  if (backend === "unavailable") {
    return unavailableResult(
      "No detection backend available. Configure VIDEO_WORKER_BASE_URL or install local RT-DETR.",
      Date.now() - startedAt,
      input.consumer
    );
  }

  if (backend === "video-worker") {
    return runWorkerDetection(input, startedAt);
  }

  return runLocalDetection(input, startedAt);
}

/** Whether production should route detections through the video worker. */
export function shouldUseWorkerDetectionBackend(): boolean {
  return Boolean(process.env.VERCEL && isVideoRenderWorkerMode() && getVideoWorkerBaseUrl()?.trim());
}

/** Human-readable detection summary for AI Assistant and tooling. */
export function formatDetectionSummaryForAssistant(result: UnifiedDetectionResult): string {
  const labels = buildUnifiedDetectionLabels(result.detections);
  if (labels.length === 0) {
    return "No objects detected in this image.";
  }
  const lines = labels.map((label) => `- ${label}`);
  return `I found:\n${lines.join("\n")}`;
}

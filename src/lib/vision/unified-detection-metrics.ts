import type {
  UnifiedDetectionBackend,
  UnifiedDetectionConsumer,
  UnifiedDetectionMetricsSnapshot,
} from "@/lib/vision/unified-detection-types";

type MetricsAccumulator = {
  inferenceCount: number;
  totalInferenceMs: number;
  lastDetectionAt: string | null;
  lastDetectionCount: number;
  lastInferenceMs: number | null;
  lastBackend: UnifiedDetectionBackend | null;
  lastConsumer: UnifiedDetectionConsumer | null;
  lastError: string | null;
  workerInferenceCount: number;
  localInferenceCount: number;
  fallbackCount: number;
  updatedAt: string;
};

const globalMetrics: MetricsAccumulator = {
  inferenceCount: 0,
  totalInferenceMs: 0,
  lastDetectionAt: null,
  lastDetectionCount: 0,
  lastInferenceMs: null,
  lastBackend: null,
  lastConsumer: null,
  lastError: null,
  workerInferenceCount: 0,
  localInferenceCount: 0,
  fallbackCount: 0,
  updatedAt: new Date().toISOString(),
};

export function recordUnifiedDetectionMetric(input: {
  backend: UnifiedDetectionBackend;
  consumer?: UnifiedDetectionConsumer;
  detectionCount: number;
  inferenceMs: number;
  failed?: boolean;
  error?: string;
}): void {
  globalMetrics.updatedAt = new Date().toISOString();
  globalMetrics.inferenceCount += 1;
  globalMetrics.totalInferenceMs += input.inferenceMs;
  globalMetrics.lastDetectionAt = new Date().toISOString();
  globalMetrics.lastDetectionCount = input.detectionCount;
  globalMetrics.lastInferenceMs = input.inferenceMs;
  globalMetrics.lastBackend = input.backend;
  globalMetrics.lastConsumer = input.consumer ?? null;
  globalMetrics.lastError = input.failed ? (input.error ?? "detection_failed") : null;

  if (input.backend === "video-worker") {
    globalMetrics.workerInferenceCount += 1;
  } else if (input.backend === "local") {
    globalMetrics.localInferenceCount += 1;
  } else if (input.backend === "fallback") {
    globalMetrics.fallbackCount += 1;
  }
}

export function getUnifiedDetectionMetricsSnapshot(): UnifiedDetectionMetricsSnapshot {
  const averageInferenceMs =
    globalMetrics.inferenceCount > 0
      ? Math.round(globalMetrics.totalInferenceMs / globalMetrics.inferenceCount)
      : null;

  return {
    inferenceCount: globalMetrics.inferenceCount,
    lastDetectionAt: globalMetrics.lastDetectionAt,
    lastDetectionCount: globalMetrics.lastDetectionCount,
    lastInferenceMs: globalMetrics.lastInferenceMs,
    averageInferenceMs,
    lastBackend: globalMetrics.lastBackend,
    lastConsumer: globalMetrics.lastConsumer,
    lastError: globalMetrics.lastError,
    workerInferenceCount: globalMetrics.workerInferenceCount,
    localInferenceCount: globalMetrics.localInferenceCount,
    fallbackCount: globalMetrics.fallbackCount,
    updatedAt: globalMetrics.updatedAt,
  };
}

export function resetUnifiedDetectionMetricsForTests(): void {
  globalMetrics.inferenceCount = 0;
  globalMetrics.totalInferenceMs = 0;
  globalMetrics.lastDetectionAt = null;
  globalMetrics.lastDetectionCount = 0;
  globalMetrics.lastInferenceMs = null;
  globalMetrics.lastBackend = null;
  globalMetrics.lastConsumer = null;
  globalMetrics.lastError = null;
  globalMetrics.workerInferenceCount = 0;
  globalMetrics.localInferenceCount = 0;
  globalMetrics.fallbackCount = 0;
  globalMetrics.updatedAt = new Date().toISOString();
}

import type { EditorVisionMetricsSnapshot } from "@/types/homecheff-visual-editor";

export type EditorVisionMetricEvent =
  | { type: "detection"; count: number; source: "onnx" | "vision" | "hybrid"; durationMs?: number }
  | { type: "detection_failed"; error: string; durationMs?: number }
  | { type: "mask_created" }
  | { type: "segmentation"; success: boolean; durationMs: number }
  | { type: "openai_edit"; success: boolean; operation: "remove" | "replace" };

type MetricsAccumulator = {
  detectionCount: number;
  maskCount: number;
  segmentationAttempts: number;
  segmentationSuccesses: number;
  segmentationDurationMs: number;
  openAiEditAttempts: number;
  openAiEditSuccesses: number;
  failedObjectEdits: number;
  onnxDetectionCount: number;
  hybridMergeCount: number;
  updatedAt: string;
  lastDetectionAt: string | null;
  lastDetectionCount: number;
  lastInferenceMs: number | null;
  lastInferenceError: string | null;
  lastInferenceSource: "onnx" | "vision" | "hybrid" | null;
};

const globalMetrics: MetricsAccumulator = {
  detectionCount: 0,
  maskCount: 0,
  segmentationAttempts: 0,
  segmentationSuccesses: 0,
  segmentationDurationMs: 0,
  openAiEditAttempts: 0,
  openAiEditSuccesses: 0,
  failedObjectEdits: 0,
  onnxDetectionCount: 0,
  hybridMergeCount: 0,
  updatedAt: new Date().toISOString(),
  lastDetectionAt: null,
  lastDetectionCount: 0,
  lastInferenceMs: null,
  lastInferenceError: null,
  lastInferenceSource: null,
};

export function recordEditorVisionMetric(event: EditorVisionMetricEvent): void {
  globalMetrics.updatedAt = new Date().toISOString();

  switch (event.type) {
    case "detection":
      globalMetrics.detectionCount += event.count;
      globalMetrics.lastDetectionAt = new Date().toISOString();
      globalMetrics.lastDetectionCount = event.count;
      globalMetrics.lastInferenceMs = event.durationMs ?? globalMetrics.lastInferenceMs;
      globalMetrics.lastInferenceError = null;
      globalMetrics.lastInferenceSource = event.source;
      if (event.source === "onnx") {
        globalMetrics.onnxDetectionCount += event.count;
      }
      if (event.source === "hybrid") {
        globalMetrics.hybridMergeCount += event.count;
      }
      break;
    case "detection_failed":
      globalMetrics.lastDetectionAt = new Date().toISOString();
      globalMetrics.lastInferenceMs = event.durationMs ?? globalMetrics.lastInferenceMs;
      globalMetrics.lastInferenceError = event.error;
      break;
    case "mask_created":
      globalMetrics.maskCount += 1;
      break;
    case "segmentation":
      globalMetrics.segmentationAttempts += 1;
      globalMetrics.segmentationDurationMs += event.durationMs;
      if (event.success) {
        globalMetrics.segmentationSuccesses += 1;
      }
      break;
    case "openai_edit":
      globalMetrics.openAiEditAttempts += 1;
      if (event.success) {
        globalMetrics.openAiEditSuccesses += 1;
      } else {
        globalMetrics.failedObjectEdits += 1;
      }
      break;
  }
}

export function getEditorVisionMetricsSnapshot(): EditorVisionMetricsSnapshot {
  const segmentationSuccessRate =
    globalMetrics.segmentationAttempts > 0
      ? globalMetrics.segmentationSuccesses / globalMetrics.segmentationAttempts
      : 0;
  const averageSegmentationMs =
    globalMetrics.segmentationSuccesses > 0
      ? globalMetrics.segmentationDurationMs / globalMetrics.segmentationSuccesses
      : 0;
  const openAiEditSuccessRate =
    globalMetrics.openAiEditAttempts > 0
      ? globalMetrics.openAiEditSuccesses / globalMetrics.openAiEditAttempts
      : 0;

  return {
    detectionCount: globalMetrics.detectionCount,
    maskCount: globalMetrics.maskCount,
    segmentationSuccessRate,
    averageSegmentationMs,
    openAiEditSuccessRate,
    failedObjectEdits: globalMetrics.failedObjectEdits,
    onnxDetectionCount: globalMetrics.onnxDetectionCount,
    hybridMergeCount: globalMetrics.hybridMergeCount,
    lastDetectionAt: globalMetrics.lastDetectionAt,
    lastDetectionCount: globalMetrics.lastDetectionCount,
    lastInferenceMs: globalMetrics.lastInferenceMs,
    lastInferenceError: globalMetrics.lastInferenceError,
    lastInferenceSource: globalMetrics.lastInferenceSource,
    updatedAt: globalMetrics.updatedAt,
  };
}

export function resetEditorVisionMetricsForTests(): void {
  globalMetrics.detectionCount = 0;
  globalMetrics.maskCount = 0;
  globalMetrics.segmentationAttempts = 0;
  globalMetrics.segmentationSuccesses = 0;
  globalMetrics.segmentationDurationMs = 0;
  globalMetrics.openAiEditAttempts = 0;
  globalMetrics.openAiEditSuccesses = 0;
  globalMetrics.failedObjectEdits = 0;
  globalMetrics.onnxDetectionCount = 0;
  globalMetrics.hybridMergeCount = 0;
  globalMetrics.updatedAt = new Date().toISOString();
}

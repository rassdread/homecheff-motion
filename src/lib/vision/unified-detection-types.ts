import type {
  ObjectDetection,
  ObjectDetectionResult,
  ObjectDetectorKind,
} from "@/server/animation-export/local-vision/object-detector-types";

/** Where inference actually ran (client view). */
export type UnifiedDetectionBackend = "video-worker" | "local" | "fallback" | "unavailable";

/** User-facing detection health. */
export type UnifiedDetectionStatus = "active" | "fallback" | "unavailable";

export type UnifiedDetectionConsumer =
  | "editor"
  | "motion"
  | "safe_zones"
  | "overlay_placement"
  | "asset_analysis"
  | "ai_assistant";

export type UnifiedDetectionResult = ObjectDetectionResult & {
  /** Inference backend used for this request. */
  backend: UnifiedDetectionBackend;
  /** Whether RT-DETR (or equivalent) produced usable output. */
  available: boolean;
  status: UnifiedDetectionStatus;
  inferenceMs: number;
  detectedAt: string;
  workerReachable?: boolean;
  detectorKind?: ObjectDetectorKind;
  consumer?: UnifiedDetectionConsumer;
};

export type UnifiedDetectionInput = {
  imageUrl?: string;
  imagePath?: string;
  imageBase64?: string;
  consumer?: UnifiedDetectionConsumer;
};

export type UnifiedDetectionMetricsSnapshot = {
  inferenceCount: number;
  lastDetectionAt: string | null;
  lastDetectionCount: number;
  lastInferenceMs: number | null;
  averageInferenceMs: number | null;
  lastBackend: UnifiedDetectionBackend | null;
  lastConsumer: UnifiedDetectionConsumer | null;
  lastError: string | null;
  workerInferenceCount: number;
  localInferenceCount: number;
  fallbackCount: number;
  updatedAt: string;
};

export function buildUnifiedDetectionLabels(detections: ObjectDetection[]): string[] {
  return [...new Set(detections.map((d) => d.label))];
}

export function toUnifiedDetectionStatus(
  result: Pick<UnifiedDetectionResult, "failed" | "backend" | "detections">
): UnifiedDetectionStatus {
  if (result.backend === "unavailable" || result.failed) {
    return result.backend === "fallback" ? "fallback" : "unavailable";
  }
  if (result.backend === "fallback") {
    return "fallback";
  }
  return "active";
}

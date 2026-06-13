import { getEditorVisionMetricsSnapshot } from "@/lib/editor-vision-metrics";
import { buildSam2ProductionStatus } from "@/lib/editor-sam2-production";
import { auditSam2Availability } from "@/lib/editor-sam2-segmentation";
import { fetchWorkerVisionHealth } from "@/lib/video-worker-client";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { shouldUseWorkerDetectionBackend } from "@/lib/vision/unified-detection-client";
import { getUnifiedDetectionMetricsSnapshot } from "@/lib/vision/unified-detection-metrics";
import type { UnifiedDetectionBackend } from "@/lib/vision/unified-detection-types";
import { getVisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";
import { getOverlayEngineStatus } from "@/server/animation-export/overlay-engine-status";
import type { VisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";

export type DetectionConsumerStatus = {
  consumer: "editor" | "motion" | "safe_zones" | "overlay_placement";
  backend: UnifiedDetectionBackend;
  mode: "rtdetr_worker" | "local_rtdetr" | "fallback";
  notes: string;
};

export type VisionHealthDashboard = {
  checkedAt: string;
  source: "video-worker" | "app-process";
  workerReachable: boolean;
  workerBaseUrl: string | null;
  vision: VisionSetupDiagnostics;
  overlayEngine: ReturnType<typeof getOverlayEngineStatus>["card"];
  overlayReasons: ReturnType<typeof getOverlayEngineStatus>["cardReasons"];
  editorMetrics: ReturnType<typeof getEditorVisionMetricsSnapshot>;
  unifiedDetection: {
    detectionBackend: UnifiedDetectionBackend;
    model: string;
    workerReachable: boolean;
    inferenceCount: number;
    lastDetectionAt: string | null;
    averageInferenceMs: number | null;
    lastInferenceMs: number | null;
    lastBackend: UnifiedDetectionBackend | null;
    lastError: string | null;
    consumers: DetectionConsumerStatus[];
  };
  sam2: ReturnType<typeof buildSam2ProductionStatus>;
  activeFlags: {
    HC_ENABLE_OBJECT_SAFE_ZONES: boolean;
    HC_ENABLE_MEDIAPIPE_SAFE_ZONES: boolean;
    HC_SAFE_ZONE_DEBUG: boolean;
    HC_OBJECT_DETECTOR_KIND: string;
  };
  probeWarning?: string;
};

function resolveConsumerStatuses(input: {
  workerReachable: boolean;
  objectDetectorReady: boolean;
  useWorkerBackend: boolean;
}): DetectionConsumerStatus[] {
  const motionBackend: UnifiedDetectionBackend =
    input.objectDetectorReady && input.workerReachable
      ? "video-worker"
      : input.useWorkerBackend
        ? "fallback"
        : "local";

  const editorBackend: UnifiedDetectionBackend = input.useWorkerBackend
    ? input.workerReachable
      ? "video-worker"
      : "unavailable"
    : input.objectDetectorReady
      ? "local"
      : "unavailable";

  const toMode = (backend: UnifiedDetectionBackend): DetectionConsumerStatus["mode"] => {
    if (backend === "video-worker") return "rtdetr_worker";
    if (backend === "local") return "local_rtdetr";
    return "fallback";
  };

  return [
    {
      consumer: "editor",
      backend: editorBackend,
      mode: toMode(editorBackend),
      notes:
        editorBackend === "video-worker"
          ? "POST /api/editor/detect → worker /vision/detect"
          : editorBackend === "local"
            ? "Local RT-DETR (dev)"
            : "Vision/heuristic fallback",
    },
    {
      consumer: "motion",
      backend: motionBackend,
      mode: toMode(motionBackend),
      notes: "Instant Premium export on video worker",
    },
    {
      consumer: "safe_zones",
      backend: motionBackend,
      mode: toMode(motionBackend),
      notes: "buildSceneDetectionContext → resolveObjectDetections",
    },
    {
      consumer: "overlay_placement",
      backend: motionBackend,
      mode: toMode(motionBackend),
      notes: "Enhanced safe zone scoring on worker frames",
    },
  ];
}

export async function loadVisionHealthDashboard(probe: boolean): Promise<VisionHealthDashboard> {
  let vision: VisionSetupDiagnostics | null = null;
  let source: VisionHealthDashboard["source"] = "app-process";
  let workerReachable = false;
  let probeWarning: string | undefined;

  if (isVideoRenderWorkerMode()) {
    const workerVision = await fetchWorkerVisionHealth(probe);
    if (workerVision) {
      vision = workerVision;
      source = "video-worker";
      workerReachable = true;
    } else {
      probeWarning =
        "VIDEO_RENDER_MODE=worker but worker vision health unreachable — showing app-process probe.";
    }
  }

  if (!vision) {
    vision = await getVisionSetupDiagnostics(probe);
    source = "app-process";
  }

  const overlay = getOverlayEngineStatus(vision);
  const unifiedMetrics = getUnifiedDetectionMetricsSnapshot();
  const useWorkerBackend = shouldUseWorkerDetectionBackend();
  const objectDetectorReady =
    vision.objectDetector.status === "READY" && vision.objectDetector.runtimeReady === true;
  const detectionBackend: UnifiedDetectionBackend = useWorkerBackend
    ? workerReachable
      ? "video-worker"
      : "unavailable"
    : objectDetectorReady
      ? "local"
      : "unavailable";

  return {
    checkedAt: new Date().toISOString(),
    source,
    workerReachable,
    workerBaseUrl: process.env.VIDEO_WORKER_BASE_URL?.trim() ?? null,
    vision,
    overlayEngine: overlay.card,
    overlayReasons: overlay.cardReasons,
    editorMetrics: getEditorVisionMetricsSnapshot(),
    unifiedDetection: {
      detectionBackend,
      model: vision.objectDetector.detectorKind ?? "rtdetr",
      workerReachable,
      inferenceCount: unifiedMetrics.inferenceCount,
      lastDetectionAt: unifiedMetrics.lastDetectionAt,
      averageInferenceMs: unifiedMetrics.averageInferenceMs,
      lastInferenceMs: unifiedMetrics.lastInferenceMs,
      lastBackend: unifiedMetrics.lastBackend,
      lastError: unifiedMetrics.lastError,
      consumers: resolveConsumerStatuses({
        workerReachable,
        objectDetectorReady,
        useWorkerBackend,
      }),
    },
    sam2: buildSam2ProductionStatus(auditSam2Availability()),
    activeFlags: {
      HC_ENABLE_OBJECT_SAFE_ZONES: vision.featureFlags.objectDetector,
      HC_ENABLE_MEDIAPIPE_SAFE_ZONES: vision.featureFlags.mediaPipe,
      HC_SAFE_ZONE_DEBUG: vision.featureFlags.safeZoneDebug,
      HC_OBJECT_DETECTOR_KIND: vision.objectDetector.detectorKind ?? "rtdetr",
    },
    probeWarning,
  };
}

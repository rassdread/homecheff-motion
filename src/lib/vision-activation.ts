/**
 * Vision activation helpers — status reasons, feature impact, checklists.
 * No rendering logic; used by admin, Publish analysis, and tests.
 */

import { auditSam2Availability } from "@/lib/editor-sam2-segmentation";
import { getOcrHealthSnapshot } from "@/server/image-text-detection/ocr-health";
import type { VisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";
import {
  isAnyLocalDetectionEnabled,
  isAnyLocalDetectionEnabledForDiagnostics,
  isMediaPipeEnabledForDiagnostics,
  isObjectDetectionEnabledForDiagnostics,
  isMediaPipeSafeZonesEnabled,
  isObjectSafeZonesEnabled,
} from "@/server/animation-export/local-vision/feature-flags";
import type { EngineStatusLabel } from "@/server/animation-export/overlay-engine-status";

export type VisionFeatureImpactRow = {
  feature: string;
  service: "studio" | "motion" | "publish" | "editor" | "library";
  worksWithoutVision: boolean;
  improvedByVision: boolean;
  requiresVision: boolean;
  notes: string;
};

export type VisionActivationChecklist = {
  local: {
    envVars: string[];
    setupCommands: string[];
    healthEndpoints: string[];
  };
  production: {
    envVars: string[];
    setupCommands: string[];
    workerFlags: string[];
    healthEndpoints: string[];
  };
};

export type Sam2OptionalStatus = {
  available: boolean;
  launchRequired: false;
  optionalForLaunch: true;
  reason: string;
  fallbacks: string[];
  requiredFor: string[];
};

export type PublishVisionActivation = {
  ocrActive: boolean;
  objectDetectionReady: boolean;
  safeZoneMode: "vision" | "heuristic";
  ocrProvider: string | null;
};

export type StatusReasonDetail = {
  label: EngineStatusLabel;
  reason: string;
  action?: string;
  launchCritical: boolean;
};

export const VISION_FEATURE_IMPACT: VisionFeatureImpactRow[] = [
  { feature: "Story overlay placement", service: "motion", worksWithoutVision: true, improvedByVision: true, requiresVision: false, notes: "V1 luminance grid always runs; ONNX/MediaPipe improve avoidance." },
  { feature: "Baked text protection", service: "motion", worksWithoutVision: true, improvedByVision: true, requiresVision: false, notes: "Manual band fallback when OCR off." },
  { feature: "Language export recovery", service: "motion", worksWithoutVision: false, improvedByVision: true, requiresVision: true, notes: "Needs GOOGLE_VISION_API_KEY or OPENAI_API_KEY." },
  { feature: "Photo story safe zones", service: "publish", worksWithoutVision: true, improvedByVision: true, requiresVision: false, notes: "Heuristic zones; OCR/object hints when configured." },
  { feature: "Publish overlay placement", service: "publish", worksWithoutVision: true, improvedByVision: true, requiresVision: false, notes: "Zone scoring without frame vision." },
  { feature: "Object detection bootstrap", service: "editor", worksWithoutVision: true, improvedByVision: true, requiresVision: false, notes: "ONNX works without HC_ENABLE_OBJECT_SAFE_ZONES flag." },
  { feature: "Click segmentation (SAM2)", service: "editor", worksWithoutVision: true, improvedByVision: true, requiresVision: false, notes: "Optional — Replicate/rembg/heuristic fallbacks." },
  { feature: "Asset reference scan", service: "studio", worksWithoutVision: true, improvedByVision: false, requiresVision: false, notes: "Generation API; not overlay vision." },
  { feature: "Library previews", service: "library", worksWithoutVision: true, improvedByVision: false, requiresVision: false, notes: "No vision dependency." },
];

export const VISION_ACTIVATION_CHECKLIST: VisionActivationChecklist = {
  local: {
    envVars: [
      "OPENAI_API_KEY or GOOGLE_VISION_API_KEY",
      "HC_ENABLE_OBJECT_SAFE_ZONES=1 (motion overlay)",
      "HC_OBJECT_DETECTOR_KIND=rtdetr",
      "HC_OBJECT_DETECTOR_MODEL_DIR",
      "SAM2_SEGMENTATION_URL (optional, Editor only)",
    ],
    setupCommands: [
      "npm run setup:vision-models -- --include-object-detector",
      "npm run test:vision-smoke",
    ],
    healthEndpoints: [
      "GET /api/admin/video/ocr-health?check=1",
      "GET /api/admin/video/overlay-engine-status?probe=1",
      "GET /api/admin/video/vision-health?probe=1",
    ],
  },
  production: {
    envVars: [
      "OPENAI_API_KEY or GOOGLE_VISION_API_KEY (Vercel app)",
      "VIDEO_RENDER_MODE=worker",
      "VIDEO_WORKER_BASE_URL",
      "VIDEO_WORKER_SECRET",
      "HC_ENABLE_OBJECT_SAFE_ZONES=1 (Render worker)",
      "HC_OBJECT_DETECTOR_MODEL_DIR=/app/models/object-detector",
    ],
    setupCommands: [
      "npm run setup:vision-models -- --include-object-detector (on worker image build)",
      "Dockerfile.worker model COPY step",
    ],
    workerFlags: ["HC_ENABLE_OBJECT_SAFE_ZONES=1", "HC_ENABLE_MEDIAPIPE_SAFE_ZONES=0|1"],
    healthEndpoints: [
      "GET /api/admin/video/overlay-engine-status?probe=1 (source: video-worker)",
      "Worker GET /health/vision?probe=1",
    ],
  },
};

export function getSam2OptionalStatus(): Sam2OptionalStatus {
  const audit = auditSam2Availability();
  return {
    available: audit.available,
    launchRequired: false,
    optionalForLaunch: true,
    reason: audit.available
      ? "SAM2 endpoint configured — Editor click segmentation available."
      : "SAM2_SEGMENTATION_URL not set — Editor uses Replicate, rembg, or manual selection.",
    fallbacks: audit.fallbacks,
    requiredFor: ["Editor precise click segmentation only"],
  };
}

export function resolvePublishVisionActivation(): PublishVisionActivation {
  const ocr = getOcrHealthSnapshot();
  const objectFlag = isObjectSafeZonesEnabled();
  return {
    ocrActive: ocr.ok,
    objectDetectionReady: objectFlag,
    safeZoneMode: ocr.ok || objectFlag ? "vision" : "heuristic",
    ocrProvider: ocr.provider === "none" ? null : ocr.provider,
  };
}

export function resolveSafeZoneFallbackReason(vision: VisionSetupDiagnostics): string {
  if (!isAnyLocalDetectionEnabledForDiagnostics(vision)) {
    return "HC_ENABLE_OBJECT_SAFE_ZONES and HC_ENABLE_MEDIAPIPE_SAFE_ZONES are off — using Safe Zone V1 luminance grid only.";
  }
  if (vision.objectDetector.enabled && vision.objectDetector.status === "MODEL_MISSING") {
    return "Object detector model missing — run npm run setup:vision-models -- --include-object-detector on the worker.";
  }
  if (vision.objectDetector.enabled && vision.objectDetector.status !== "READY") {
    return `Object detector status: ${vision.objectDetector.status}`;
  }
  if (vision.mediaPipe.enabled && vision.mediaPipe.status !== "READY") {
    return `MediaPipe status: ${vision.mediaPipe.status} (optional).`;
  }
  return "Vision detectors ready.";
}

export function buildOverlayStatusReasons(
  vision: VisionSetupDiagnostics
): Record<keyof import("@/server/animation-export/overlay-engine-status").OverlayEngineStatusCard, StatusReasonDetail> {
  const ocr = getOcrHealthSnapshot();
  const objectReady = vision.objectDetector.enabled && vision.objectDetector.status === "READY";
  const mediaPipeReady = vision.mediaPipe.enabled && vision.mediaPipe.status === "READY";
  const objectFlagOn = isObjectDetectionEnabledForDiagnostics(vision);
  const anyVision = isAnyLocalDetectionEnabledForDiagnostics(vision);
  const fallbackReason = resolveSafeZoneFallbackReason(vision);
  const visionActive = objectReady || mediaPipeReady;

  return {
    safeZones: {
      label: visionActive ? "ACTIVE" : "FALLBACK",
      reason: visionActive
        ? "Object-aware safe zones active (RT-DETR and/or MediaPipe)."
        : fallbackReason,
      action: !anyVision
        ? "Set HC_ENABLE_OBJECT_SAFE_ZONES=1 on video worker and install ONNX model."
        : undefined,
      launchCritical: false,
    },
    objectDetection: {
      label:
        !objectFlagOn ? "DISABLED"
        : objectReady ? "ACTIVE"
        : "DISABLED",
      reason:
        !objectFlagOn
          ? "Disabled because HC_ENABLE_OBJECT_SAFE_ZONES is off on the probed runtime."
          : objectReady
            ? "ONNX object detector probed ready — inference can run."
            : `Detector not ready: ${vision.objectDetector.status}`,
      action: vision.objectDetector.status === "MODEL_MISSING"
        ? "Run setup:vision-models on worker host."
        : !objectFlagOn
          ? "Set HC_ENABLE_OBJECT_SAFE_ZONES=1 on worker."
          : undefined,
      launchCritical: false,
    },
    typography: {
      label: "ACTIVE",
      reason: "Adaptive typography always enabled in overlay engine.",
      launchCritical: false,
    },
    placement: {
      label: objectReady || mediaPipeReady ? "ACTIVE" : "FALLBACK",
      reason:
        objectReady || mediaPipeReady
          ? "Object-aware template placement active."
          : "Template placement from V1 luminance analysis only.",
      launchCritical: false,
    },
    timing: {
      label: "ACTIVE",
      reason: "Story timing windows always active.",
      launchCritical: false,
    },
    ocr: {
      label: ocr.ok ? "ACTIVE" : "DISABLED",
      reason: ocr.ok
        ? `OCR configured (${ocr.provider}${ocr.model ? ` / ${ocr.model}` : ""}).`
        : "Set GOOGLE_VISION_API_KEY or OPENAI_API_KEY.",
      action: ocr.ok ? undefined : "Add OCR API key to app server env.",
      launchCritical: false,
    },
  };
}

export function resolveOcrStatusReason(): StatusReasonDetail {
  const snap = getOcrHealthSnapshot();
  return {
    label: snap.ok ? "ACTIVE" : "DISABLED",
    reason: snap.ok
      ? `Provider: ${snap.provider}${snap.model ? `, model: ${snap.model}` : ""}`
      : snap.errors[0] ?? "No OCR provider configured.",
    action: snap.ok ? "Run OCR health check to verify API." : "Set OPENAI_API_KEY or GOOGLE_VISION_API_KEY.",
    launchCritical: false,
  };
}

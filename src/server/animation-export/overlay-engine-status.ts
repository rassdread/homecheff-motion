/**
 * Overlay engine readiness — aggregates installed capabilities (no new rendering logic).
 */

import {
  isAnyLocalDetectionEnabled,
  isAnyLocalDetectionEnabledForDiagnostics,
  isMediaPipeEnabledForDiagnostics,
  isMediaPipeSafeZonesEnabled,
  isObjectDetectionEnabledForDiagnostics,
  isObjectSafeZonesEnabled,
  isSafeZoneDebugEnabled,
} from "@/server/animation-export/local-vision/feature-flags";
import type { VisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";
import { getVisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";
import {
  resolveObjectDetectorKind,
  resolveObjectDetectorModelPath,
} from "@/server/animation-export/local-vision/object-detector-model-paths";
import {
  buildOverlayStatusReasons,
  getSam2OptionalStatus,
  VISION_ACTIVATION_CHECKLIST,
  VISION_FEATURE_IMPACT,
  type StatusReasonDetail,
} from "@/lib/vision-activation";

export type EngineStatusLabel = "READY" | "ACTIVE" | "FALLBACK" | "DISABLED";

export type OverlayCapabilityRow = {
  id: string;
  name: string;
  installed: boolean;
  enabled: boolean;
  usedInRenderPipeline: boolean;
  usedOnWorker: boolean;
  fallbackActive: boolean;
  adminVisibility: boolean;
  impactScore: number;
  notes: string;
};

export type OverlayEngineStatusCard = {
  safeZones: EngineStatusLabel;
  objectDetection: EngineStatusLabel;
  typography: EngineStatusLabel;
  placement: EngineStatusLabel;
  timing: EngineStatusLabel;
  ocr: EngineStatusLabel;
};

export type OverlayEngineReadiness = {
  checkedAt: string;
  card: OverlayEngineStatusCard;
  cardReasons: Record<keyof OverlayEngineStatusCard, StatusReasonDetail>;
  readinessScore: number;
  breakdown: {
    placement: number;
    vision: number;
    typography: number;
    timing: number;
    languageRerender: number;
    repairFlow: number;
  };
  capabilities: OverlayCapabilityRow[];
  vision: VisionSetupDiagnostics;
  env: {
    HC_ENABLE_MEDIAPIPE_SAFE_ZONES: boolean;
    HC_ENABLE_OBJECT_SAFE_ZONES: boolean;
    HC_OBJECT_DETECTOR_KIND: string;
    HC_OBJECT_DETECTOR_MODEL_DIR: string | null;
    HC_OBJECT_DETECTOR_MODEL_PATH: string | null;
    HC_SAFE_ZONE_DEBUG: boolean;
  };
  inactiveFeatures: string[];
  recommendedNextAction: string;
  sam2: ReturnType<typeof getSam2OptionalStatus>;
  featureImpact: typeof VISION_FEATURE_IMPACT;
  activationChecklist: typeof VISION_ACTIVATION_CHECKLIST;
  source?: "video-worker" | "app-process";
  probeWarning?: string;
};

function envFlag(name: string): boolean {
  const v = process.env[name];
  return v === "1" || v === "true";
}

function buildCapabilityInventory(vision: VisionSetupDiagnostics): OverlayCapabilityRow[] {
  const visionEnabled = isAnyLocalDetectionEnabledForDiagnostics(vision);
  const objectReady =
    vision.objectDetector.enabled && vision.objectDetector.status === "READY";
  const mediaPipeReady = vision.mediaPipe.enabled && vision.mediaPipe.status === "READY";
  const enhancedActive = visionEnabled && (objectReady || mediaPipeReady);
  const objectPlacementActive = objectReady || mediaPipeReady;

  return [
    {
      id: "safe_zone_v1",
      name: "Safe Zone V1",
      installed: true,
      enabled: true,
      usedInRenderPipeline: true,
      usedOnWorker: true,
      fallbackActive: false,
      adminVisibility: isSafeZoneDebugEnabled(),
      impactScore: 90,
      notes: "Luminance grid on sampled frame; always runs when adaptive overlay is on.",
    },
    {
      id: "enhanced_safe_zone",
      name: "Enhanced Safe Zone",
      installed: true,
      enabled: visionEnabled,
      usedInRenderPipeline: true,
      usedOnWorker: true,
      fallbackActive: !enhancedActive,
      adminVisibility: isSafeZoneDebugEnabled(),
      impactScore: enhancedActive ? 75 : 25,
      notes: enhancedActive ?
        "Detection penalties applied on V1 grid."
      : "Falls back to V1 when local detectors off or not ready.",
    },
    {
      id: "mediapipe",
      name: "MediaPipe (faces/hands)",
      installed: true,
      enabled: isMediaPipeSafeZonesEnabled(),
      usedInRenderPipeline: mediaPipeReady,
      usedOnWorker: mediaPipeReady,
      fallbackActive: !mediaPipeReady,
      adminVisibility: true,
      impactScore: mediaPipeReady ? 60 : 0,
      notes: vision.mediaPipe.status === "DISABLED" ?
        "Set HC_ENABLE_MEDIAPIPE_SAFE_ZONES=1 and run setup:vision-models."
      : `Status: ${vision.mediaPipe.status}`,
    },
    {
      id: "rtdetr",
      name: "RT-DETR object detector",
      installed: true,
      enabled: isObjectSafeZonesEnabled(),
      usedInRenderPipeline: objectReady,
      usedOnWorker: objectReady,
      fallbackActive: !objectReady,
      adminVisibility: true,
      impactScore: objectReady ? 70 : 0,
      notes: vision.objectDetector.status === "DISABLED" ?
        "Set HC_ENABLE_OBJECT_SAFE_ZONES=1, HC_OBJECT_DETECTOR_KIND=rtdetr, run npm run setup:vision-models -- --include-object-detector on worker."
      : `Status: ${vision.objectDetector.status}`,
    },
    {
      id: "ocr",
      name: "OCR (language export / preflight)",
      installed: true,
      enabled: Boolean(process.env.GOOGLE_VISION_API_KEY || process.env.OPENAI_API_KEY),
      usedInRenderPipeline: true,
      usedOnWorker: true,
      fallbackActive: !process.env.GOOGLE_VISION_API_KEY && !process.env.OPENAI_API_KEY,
      adminVisibility: true,
      impactScore: 50,
      notes: "Used for baked-text preflight and language-export layer recovery; not per-frame overlay placement.",
    },
    {
      id: "adaptive_typography",
      name: "Adaptive Typography",
      installed: true,
      enabled: true,
      usedInRenderPipeline: true,
      usedOnWorker: true,
      fallbackActive: false,
      adminVisibility: isSafeZoneDebugEnabled(),
      impactScore: 85,
      notes: "Headline / title / subtitle size tiers in buildStoryOverlayAss.",
    },
    {
      id: "layer_placement",
      name: "Headline / Title / Subtitle placement",
      installed: true,
      enabled: true,
      usedInRenderPipeline: true,
      usedOnWorker: true,
      fallbackActive: !objectPlacementActive,
      adminVisibility: true,
      impactScore: 88,
      notes: objectPlacementActive ?
        "Object-aware zones per template (headline, title, subtitle)."
      : "Template defaults (top / overall / bottom) from V1 analysis only.",
    },
    {
      id: "object_aware_placement",
      name: "Object-aware placement",
      installed: true,
      enabled: isObjectSafeZonesEnabled(),
      usedInRenderPipeline: objectPlacementActive,
      usedOnWorker: objectPlacementActive,
      fallbackActive: !objectPlacementActive,
      adminVisibility: true,
      impactScore: objectPlacementActive ? 80 : 15,
      notes: "resolveObjectAwarePlacement + placementReason on SceneSafeZoneContext.",
    },
    {
      id: "contrast_backdrop",
      name: "Contrast scoring & backdrop",
      installed: true,
      enabled: true,
      usedInRenderPipeline: true,
      usedOnWorker: true,
      fallbackActive: false,
      adminVisibility: isSafeZoneDebugEnabled(),
      impactScore: 70,
      notes: "Zone score drives backdrop strength and outline.",
    },
    {
      id: "timing_windows",
      name: "Story timing windows",
      installed: true,
      enabled: true,
      usedInRenderPipeline: true,
      usedOnWorker: true,
      fallbackActive: false,
      adminVisibility: false,
      impactScore: 90,
      notes: "getSceneTimingWindows + finale hold (STORY_FINALE_MIN_VISIBLE_SEC).",
    },
    {
      id: "staggered_reveals",
      name: "Staggered reveals",
      installed: true,
      enabled: true,
      usedInRenderPipeline: true,
      usedOnWorker: true,
      fallbackActive: false,
      adminVisibility: false,
      impactScore: 85,
      notes: "buildSceneLayeredRevealSlots → separate ASS Dialogue per field.",
    },
    {
      id: "language_rerender",
      name: "Language rerender placement",
      installed: true,
      enabled: true,
      usedInRenderPipeline: true,
      usedOnWorker: true,
      fallbackActive: false,
      adminVisibility: false,
      impactScore: 88,
      notes: "language-export-render-execution → applyStorySceneTextOverlay.",
    },
    {
      id: "repair_rerender",
      name: "Repair / text rerender",
      installed: true,
      enabled: true,
      usedInRenderPipeline: true,
      usedOnWorker: true,
      fallbackActive: false,
      adminVisibility: false,
      impactScore: 88,
      notes: "rebuild-final-video + merge-instant-project use same overlay path.",
    },
  ];
}

function scoreBreakdown(
  vision: VisionSetupDiagnostics,
  capabilities: OverlayCapabilityRow[]
): OverlayEngineReadiness["breakdown"] {
  const objectReady =
    vision.objectDetector.enabled && vision.objectDetector.status === "READY";
  const mediaPipeReady = vision.mediaPipe.enabled && vision.mediaPipe.status === "READY";

  const placement = Math.round(
    (capabilities.find((c) => c.id === "layer_placement")?.impactScore ?? 0) *
      (objectReady || mediaPipeReady ? 1 : 0.75)
  );
  const visionScore = Math.round(
    ((objectReady ? 35 : 10) + (mediaPipeReady ? 25 : 5) + (vision.ok ? 10 : 0)) *
      (isAnyLocalDetectionEnabledForDiagnostics(vision) ? 1 : 0.6)
  );
  const typography = capabilities.find((c) => c.id === "adaptive_typography")?.impactScore ?? 85;
  const timing = Math.round(
    ((capabilities.find((c) => c.id === "timing_windows")?.impactScore ?? 0) +
      (capabilities.find((c) => c.id === "staggered_reveals")?.impactScore ?? 0)) /
      2
  );
  const languageRerender =
    capabilities.find((c) => c.id === "language_rerender")?.impactScore ?? 85;
  const repairFlow = capabilities.find((c) => c.id === "repair_rerender")?.impactScore ?? 85;

  return {
    placement,
    vision: visionScore,
    typography,
    timing,
    languageRerender,
    repairFlow,
  };
}

function buildCard(
  vision: VisionSetupDiagnostics,
  breakdown: OverlayEngineReadiness["breakdown"]
): OverlayEngineStatusCard {
  const objectReady =
    vision.objectDetector.enabled && vision.objectDetector.status === "READY";
  const mediaPipeReady = vision.mediaPipe.enabled && vision.mediaPipe.status === "READY";
  const objectFlagOn = isObjectDetectionEnabledForDiagnostics(vision);
  const visionActive = objectReady || mediaPipeReady;

  return {
    safeZones:
      visionActive ? "ACTIVE"
      : objectFlagOn || isMediaPipeSafeZonesEnabled() ? "FALLBACK"
      : "FALLBACK",
    objectDetection:
      !objectFlagOn ? "DISABLED"
      : objectReady ? "ACTIVE"
      : "DISABLED",
    typography: breakdown.typography >= 70 ? "ACTIVE" : "FALLBACK",
    placement: breakdown.placement >= 70 ? "ACTIVE" : "FALLBACK",
    timing: breakdown.timing >= 70 ? "ACTIVE" : "FALLBACK",
    ocr:
      process.env.GOOGLE_VISION_API_KEY || process.env.OPENAI_API_KEY ? "ACTIVE" : "DISABLED",
  };
}

function listInactive(capabilities: OverlayCapabilityRow[], vision: VisionSetupDiagnostics): string[] {
  const out: string[] = [];
  for (const row of capabilities) {
    if (row.installed && !row.enabled) {
      out.push(`${row.name}: installed but flag off (${row.notes})`);
    }
    if (row.enabled && row.fallbackActive && !row.usedInRenderPipeline) {
      out.push(`${row.name}: enabled but not ready — ${row.notes}`);
    }
  }
  if (!isAnyLocalDetectionEnabledForDiagnostics(vision)) {
    out.push(
      "Local vision flags off — enhanced/object-aware paths use Safe Zone V1 template placement only."
    );
  }
  if (vision.mediaPipe.enabled && vision.mediaPipe.status !== "READY") {
    out.push(`MediaPipe: ${vision.mediaPipe.status}`);
  }
  if (vision.objectDetector.enabled && vision.objectDetector.status !== "READY") {
    out.push(`Object detector: ${vision.objectDetector.status}`);
  }
  return out;
}

function recommendNextAction(vision: VisionSetupDiagnostics): string {
  if (
    !isObjectDetectionEnabledForDiagnostics(vision) &&
    !isMediaPipeEnabledForDiagnostics(vision)
  ) {
    return "Enable HC_ENABLE_OBJECT_SAFE_ZONES=1 (and optionally HC_ENABLE_MEDIAPIPE_SAFE_ZONES=1) on the video worker, run npm run setup:vision-models -- --include-object-detector, then verify GET /api/admin/video/vision-health?probe=1.";
  }
  if (vision.objectDetector.status === "MODEL_MISSING") {
    return "Run npm run setup:vision-models -- --include-object-detector on the worker host and set HC_OBJECT_DETECTOR_MODEL_DIR to that directory.";
  }
  if (vision.objectDetector.status === "PACKAGE_MISSING") {
    return "Install onnxruntime-node on the worker (npm install) and redeploy.";
  }
  if (vision.objectDetector.enabled && vision.objectDetector.status !== "READY") {
    return `Fix object detector status (${vision.objectDetector.status}) then re-probe vision health.`;
  }
  if (!process.env.GOOGLE_VISION_API_KEY && !process.env.OPENAI_API_KEY) {
    return "Optional: set GOOGLE_VISION_API_KEY or OPENAI_API_KEY for OCR-backed language export recovery.";
  }
  return "Overlay engine core paths are active. Enable HC_SAFE_ZONE_DEBUG=1 on worker to log per-scene placement in export logs.";
}

export function getOverlayEngineStatus(vision: VisionSetupDiagnostics): OverlayEngineReadiness {
  const capabilities = buildCapabilityInventory(vision);
  const breakdown = scoreBreakdown(vision, capabilities);
  const total =
    breakdown.placement +
    breakdown.vision +
    breakdown.typography +
    breakdown.timing +
    breakdown.languageRerender +
    breakdown.repairFlow;
  const readinessScore = Math.round(total / 6);

  const modelDir = process.env.HC_OBJECT_DETECTOR_MODEL_DIR?.trim() || null;
  const modelPath = process.env.HC_OBJECT_DETECTOR_MODEL_PATH?.trim() || null;

  const card = buildCard(vision, breakdown);
  return {
    checkedAt: new Date().toISOString(),
    card,
    cardReasons: buildOverlayStatusReasons(vision),
    readinessScore,
    breakdown,
    capabilities,
    vision,
    env: {
      HC_ENABLE_MEDIAPIPE_SAFE_ZONES:
        vision.featureFlags.mediaPipe || envFlag("HC_ENABLE_MEDIAPIPE_SAFE_ZONES"),
      HC_ENABLE_OBJECT_SAFE_ZONES:
        vision.featureFlags.objectDetector || envFlag("HC_ENABLE_OBJECT_SAFE_ZONES"),
      HC_OBJECT_DETECTOR_KIND: resolveObjectDetectorKind(),
      HC_OBJECT_DETECTOR_MODEL_DIR: modelDir,
      HC_OBJECT_DETECTOR_MODEL_PATH: modelPath,
      HC_SAFE_ZONE_DEBUG: envFlag("HC_SAFE_ZONE_DEBUG"),
    },
    inactiveFeatures: listInactive(capabilities, vision),
    recommendedNextAction: recommendNextAction(vision),
    sam2: getSam2OptionalStatus(),
    featureImpact: VISION_FEATURE_IMPACT,
    activationChecklist: VISION_ACTIVATION_CHECKLIST,
  };
}

export async function getOverlayEngineReadiness(probe = false): Promise<OverlayEngineReadiness> {
  const vision = await getVisionSetupDiagnostics(probe);
  const status = getOverlayEngineStatus(vision);
  const modelPath = await resolveObjectDetectorModelPath().catch(() => "");
  status.env.HC_OBJECT_DETECTOR_MODEL_PATH = modelPath || status.env.HC_OBJECT_DETECTOR_MODEL_PATH;
  return status;
}

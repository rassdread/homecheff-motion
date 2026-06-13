/** Feature flags for local Safe Zone V3–V6 detectors (all off by default). */

let deprecatedYoloFlagLogged = false;

function warnDeprecatedYoloFlagOnce(): void {
  if (deprecatedYoloFlagLogged) {
    return;
  }
  const v = process.env.HC_ENABLE_YOLO_SAFE_ZONES;
  if (v === "1" || v === "true") {
    deprecatedYoloFlagLogged = true;
    console.warn(
      "YOLO detector was removed due to licensing. Use HC_ENABLE_OBJECT_SAFE_ZONES."
    );
  }
}

export function isMediaPipeSafeZonesEnabled(): boolean {
  const v = process.env.HC_ENABLE_MEDIAPIPE_SAFE_ZONES;
  return v === "1" || v === "true";
}

export function isObjectSafeZonesEnabled(): boolean {
  warnDeprecatedYoloFlagOnce();
  const v = process.env.HC_ENABLE_OBJECT_SAFE_ZONES;
  return v === "1" || v === "true";
}

/** @deprecated YOLO removed — logs warning only; does not enable detection. */
export function isYoloSafeZonesEnabled(): boolean {
  warnDeprecatedYoloFlagOnce();
  return false;
}

export function isSafeZoneDebugEnabled(): boolean {
  const v = process.env.HC_SAFE_ZONE_DEBUG;
  return v === "1" || v === "true";
}

export function isAnyLocalDetectionEnabled(): boolean {
  return isMediaPipeSafeZonesEnabled() || isObjectSafeZonesEnabled();
}

/** Use probed worker/app diagnostics instead of process.env when reporting remote readiness. */
export function isObjectDetectionEnabledForDiagnostics(
  vision?: { featureFlags?: { objectDetector?: boolean }; objectDetector?: { enabled?: boolean } }
): boolean {
  if (vision?.featureFlags?.objectDetector !== undefined) {
    return vision.featureFlags.objectDetector;
  }
  if (vision?.objectDetector?.enabled !== undefined) {
    return vision.objectDetector.enabled;
  }
  return isObjectSafeZonesEnabled();
}

export function isMediaPipeEnabledForDiagnostics(
  vision?: { featureFlags?: { mediaPipe?: boolean }; mediaPipe?: { enabled?: boolean } }
): boolean {
  if (vision?.featureFlags?.mediaPipe !== undefined) {
    return vision.featureFlags.mediaPipe;
  }
  if (vision?.mediaPipe?.enabled !== undefined) {
    return vision.mediaPipe.enabled;
  }
  return isMediaPipeSafeZonesEnabled();
}

export function isAnyLocalDetectionEnabledForDiagnostics(
  vision?: {
    featureFlags?: { objectDetector?: boolean; mediaPipe?: boolean };
    objectDetector?: { enabled?: boolean };
    mediaPipe?: { enabled?: boolean };
  }
): boolean {
  return (
    isObjectDetectionEnabledForDiagnostics(vision) ||
    isMediaPipeEnabledForDiagnostics(vision)
  );
}

/** Max time per detector before fail-open to Safe Zone V1. */
export const DETECTOR_TIMEOUT_MS = 8_000;

/** Reset deprecation guard (tests only). */
export function resetFeatureFlagDeprecationGuards(): void {
  deprecatedYoloFlagLogged = false;
}

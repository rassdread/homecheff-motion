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

/** Max time per detector before fail-open to Safe Zone V1. */
export const DETECTOR_TIMEOUT_MS = 8_000;

/** Reset deprecation guard (tests only). */
export function resetFeatureFlagDeprecationGuards(): void {
  deprecatedYoloFlagLogged = false;
}

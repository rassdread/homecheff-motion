export type PublishOrientation = "portrait" | "landscape";

export type PortraitSafeZoneId =
  | "top_left"
  | "top_right"
  | "middle_upper_left"
  | "middle_upper_right"
  | "middle_lower_left"
  | "middle_lower_right"
  | "bottom_left"
  | "bottom_right";

export type LandscapeSafeZoneId =
  | "top_left"
  | "top_center_left"
  | "top_center_right"
  | "top_right"
  | "bottom_left"
  | "bottom_center_left"
  | "bottom_center_right"
  | "bottom_right";

export type PublishSafeZoneId = PortraitSafeZoneId | LandscapeSafeZoneId;

export const PORTRAIT_SAFE_ZONES: PortraitSafeZoneId[] = [
  "top_left",
  "top_right",
  "middle_upper_left",
  "middle_upper_right",
  "middle_lower_left",
  "middle_lower_right",
  "bottom_left",
  "bottom_right",
];

export const LANDSCAPE_SAFE_ZONES: LandscapeSafeZoneId[] = [
  "top_left",
  "top_center_left",
  "top_center_right",
  "top_right",
  "bottom_left",
  "bottom_center_left",
  "bottom_center_right",
  "bottom_right",
];

export type PublishSafeZoneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PublishSafeZoneHeatmap = Partial<Record<PublishSafeZoneId, number>>;

export function resolvePublishOrientation(aspectRatio?: number): PublishOrientation {
  if (!aspectRatio || aspectRatio >= 1) return "landscape";
  return "portrait";
}

export function resolveSafeZonesForOrientation(orientation: PublishOrientation): PublishSafeZoneId[] {
  return orientation === "portrait" ? PORTRAIT_SAFE_ZONES : LANDSCAPE_SAFE_ZONES;
}

/** Normalized 0–1 rects for UI mini-frame. */
export function resolveSafeZoneRect(
  zoneId: PublishSafeZoneId,
  orientation: PublishOrientation
): PublishSafeZoneRect {
  if (orientation === "portrait") {
    const colW = 0.5;
    const rowH = 0.25;
    const map: Record<PortraitSafeZoneId, PublishSafeZoneRect> = {
      top_left: { x: 0, y: 0, width: colW, height: rowH },
      top_right: { x: colW, y: 0, width: colW, height: rowH },
      middle_upper_left: { x: 0, y: rowH, width: colW, height: rowH },
      middle_upper_right: { x: colW, y: rowH, width: colW, height: rowH },
      middle_lower_left: { x: 0, y: rowH * 2, width: colW, height: rowH },
      middle_lower_right: { x: colW, y: rowH * 2, width: colW, height: rowH },
      bottom_left: { x: 0, y: rowH * 3, width: colW, height: rowH },
      bottom_right: { x: colW, y: rowH * 3, width: colW, height: rowH },
    };
    return map[zoneId as PortraitSafeZoneId];
  }

  const colW = 0.25;
  const rowH = 0.5;
  const map: Record<LandscapeSafeZoneId, PublishSafeZoneRect> = {
    top_left: { x: 0, y: 0, width: colW, height: rowH },
    top_center_left: { x: colW, y: 0, width: colW, height: rowH },
    top_center_right: { x: colW * 2, y: 0, width: colW, height: rowH },
    top_right: { x: colW * 3, y: 0, width: colW, height: rowH },
    bottom_left: { x: 0, y: rowH, width: colW, height: rowH },
    bottom_center_left: { x: colW, y: rowH, width: colW, height: rowH },
    bottom_center_right: { x: colW * 2, y: rowH, width: colW, height: rowH },
    bottom_right: { x: colW * 3, y: rowH, width: colW, height: rowH },
  };
  return map[zoneId as LandscapeSafeZoneId];
}

export function scoreSafeZones(input: {
  orientation: PublishOrientation;
  occupiedZones?: PublishSafeZoneId[];
}): PublishSafeZoneHeatmap {
  const zones = resolveSafeZonesForOrientation(input.orientation);
  const occupied = new Set(input.occupiedZones ?? []);
  const heatmap: PublishSafeZoneHeatmap = {};
  for (const zone of zones) {
    heatmap[zone] = occupied.has(zone) ? 0 : 1;
  }
  return heatmap;
}

export function pickBestSafeZone(heatmap: PublishSafeZoneHeatmap): {
  zone: PublishSafeZoneId | null;
  confidence: number;
  needsManual: boolean;
} {
  let best: PublishSafeZoneId | null = null;
  let bestScore = -1;
  for (const [zone, score] of Object.entries(heatmap)) {
    if ((score ?? 0) > bestScore) {
      bestScore = score ?? 0;
      best = zone as PublishSafeZoneId;
    }
  }
  const confidence = bestScore;
  return {
    zone: confidence > 0 ? best : null,
    confidence,
    needsManual: confidence <= 0,
  };
}

export function zoneToOverlayPosition(
  zoneId: PublishSafeZoneId,
  orientation: PublishOrientation
): { x: number; y: number } {
  const rect = resolveSafeZoneRect(zoneId, orientation);
  return {
    x: rect.x + rect.width * 0.1,
    y: rect.y + rect.height * 0.15,
  };
}

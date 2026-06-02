/** Box overlap utilities for Safe Zone V3–V6 scoring. */

import type { NormalizedBox } from "@/server/animation-export/local-vision/types";
import type { SafeZoneId } from "@/server/animation-export/safe-zone-placement";

export function zoneBoundsNormalized(zoneId: SafeZoneId): NormalizedBox {
  const col = zoneId.includes("_LEFT") ? 0 : zoneId.includes("_RIGHT") ? 2 : 1;
  const row = zoneId.startsWith("TOP_") ? 0 : zoneId.startsWith("BOTTOM_") ? 2 : 1;
  return {
    x: col / 3,
    y: row / 3,
    width: 1 / 3,
    height: 1 / 3,
  };
}

export function boxIntersectionArea(a: NormalizedBox, b: NormalizedBox): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  return iw * ih;
}

export function boxOverlapFraction(zone: NormalizedBox, box: NormalizedBox): number {
  const zoneArea = Math.max(1e-6, zone.width * zone.height);
  return boxIntersectionArea(zone, box) / zoneArea;
}

export function boxCenter(box: NormalizedBox): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function distanceBetweenCenters(a: NormalizedBox, b: NormalizedBox): number {
  const ca = boxCenter(a);
  const cb = boxCenter(b);
  const dx = ca.x - cb.x;
  const dy = ca.y - cb.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function nearestNonOverlappingZoneCenter(
  objectBox: NormalizedBox,
  preferredZone: SafeZoneId
): { x: number; y: number } {
  const zone = zoneBoundsNormalized(preferredZone);
  const overlap = boxOverlapFraction(zone, objectBox);
  if (overlap < 0.05) {
    return boxCenter(zone);
  }

  const objCenter = boxCenter(objectBox);
  const zoneCenter = boxCenter(zone);
  const dx = zoneCenter.x - objCenter.x;
  const dy = zoneCenter.y - objCenter.y;
  const len = Math.max(1e-6, Math.sqrt(dx * dx + dy * dy));
  const pushX = (dx / len) * 0.12;
  const pushY = (dy / len) * 0.12;

  return {
    x: Math.max(zone.x + 0.05, Math.min(zone.x + zone.width - 0.05, zoneCenter.x + pushX)),
    y: Math.max(zone.y + 0.05, Math.min(zone.y + zone.height - 0.05, zoneCenter.y + pushY)),
  };
}

export function normalizedToPixelAnchor(
  norm: { x: number; y: number },
  width: number,
  height: number,
  marginH: number,
  marginV: number
): { anchorX: number; anchorY: number } {
  const safeLeft = width * marginH;
  const safeRight = width * (1 - marginH);
  const safeTop = height * marginV;
  const safeBottom = height * (1 - marginV);
  return {
    anchorX: Math.round(safeLeft + norm.x * (safeRight - safeLeft)),
    anchorY: Math.round(safeTop + norm.y * (safeBottom - safeTop)),
  };
}

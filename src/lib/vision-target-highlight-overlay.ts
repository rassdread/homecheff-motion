/**
 * Sprint K1.4 — SVG path helpers for vision target highlight overlay.
 */

import type { VisionTargetGeometry } from "@/types/vision-target-picker";

export function visionTargetQuadToPercentPath(
  quad: NonNullable<VisionTargetGeometry["quad"]>
): string {
  const points = [
    quad.topLeft,
    quad.topRight,
    quad.bottomRight,
    quad.bottomLeft,
  ];
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * 100} ${point.y * 100}`)
    .join(" ")
    .concat(" Z");
}

export function visionTargetPolygonToPercentPath(
  polygon: NonNullable<VisionTargetGeometry["polygon"]>
): string {
  if (polygon.length === 0) {
    return "";
  }
  return polygon
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * 100} ${point.y * 100}`)
    .join(" ")
    .concat(" Z");
}

export function visionTargetGeometryStyle(
  geometry: VisionTargetGeometry,
  variant: "hover" | "selected"
): {
  kind: "polygon" | "quad" | "bbox";
  path?: string;
  bounds?: { x: number; y: number; width: number; height: number };
} {
  if (geometry.polygon?.length) {
    return { kind: "polygon", path: visionTargetPolygonToPercentPath(geometry.polygon) };
  }
  if (geometry.maskUrl) {
    return {
      kind: "bbox",
      bounds: geometry.bounds,
    };
  }
  if (geometry.quad) {
    return { kind: "quad", path: visionTargetQuadToPercentPath(geometry.quad) };
  }
  return {
    kind: "bbox",
    bounds: geometry.bounds,
  };
}

export function visionTargetHighlightColors(variant: "hover" | "selected"): {
  fill: string;
  stroke: string;
  glow: string;
} {
  if (variant === "selected") {
    return {
      fill: "rgba(0, 103, 177, 0.28)",
      stroke: "rgba(0, 103, 177, 0.95)",
      glow: "rgba(0, 103, 177, 0.35)",
    };
  }
  return {
    fill: "rgba(0, 109, 82, 0.18)",
    stroke: "rgba(0, 109, 82, 0.75)",
    glow: "rgba(0, 109, 82, 0.22)",
  };
}

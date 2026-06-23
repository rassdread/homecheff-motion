/**
 * Placement quad generation — polygon → mask → contour → bbox fallback.
 */

import { boundsToPolygon } from "@/lib/editor-object-mask";
import type {
  BrandAssetBounds,
  BrandAssetQuad,
  BrandPlacementSurfaceType,
  BrandSurfaceShape,
  LogoPlacementMode,
  QuadGenerationSource,
} from "@/types/brand-asset-protection";
import type { EditorShapePoint } from "@/types/homecheff-visual-editor";

export type PlacementQuadInput = {
  bbox: BrandAssetBounds;
  polygon?: EditorShapePoint[];
  maskUrl?: string;
  objectCategory?: string;
  objectLabel?: string;
  surfaceType?: BrandPlacementSurfaceType;
  userQuad?: BrandAssetQuad;
  placementMode?: LogoPlacementMode;
};

export type PlacementQuadResult = {
  quad: BrandAssetQuad;
  source: QuadGenerationSource;
  surfaceType: BrandPlacementSurfaceType;
  surfaceShape: BrandSurfaceShape;
  placementMode: LogoPlacementMode;
  curveMesh: { enabled: false };
};

const CURVED_SURFACES = new Set<BrandPlacementSurfaceType>([
  "shirt",
  "mug",
  "cup",
  "vehicle",
  "packaging",
]);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampPoint(point: { x: number; y: number }): { x: number; y: number } {
  return { x: clamp01(point.x), y: clamp01(point.y) };
}

function clampQuad(quad: BrandAssetQuad): BrandAssetQuad {
  return {
    topLeft: clampPoint(quad.topLeft),
    topRight: clampPoint(quad.topRight),
    bottomRight: clampPoint(quad.bottomRight),
    bottomLeft: clampPoint(quad.bottomLeft),
  };
}

export function boundsToBrandQuad(bounds: BrandAssetBounds): BrandAssetQuad {
  const x = clamp01(bounds.x);
  const y = clamp01(bounds.y);
  const w = clamp01(bounds.width);
  const h = clamp01(bounds.height);
  return clampQuad({
    topLeft: { x, y },
    topRight: { x: x + w, y },
    bottomRight: { x: x + w, y: y + h },
    bottomLeft: { x, y: y + h },
  });
}

export function inferBrandPlacementSurfaceType(input: {
  label?: string;
  category?: string;
}): BrandPlacementSurfaceType {
  const text = `${input.label ?? ""} ${input.category ?? ""}`.toLowerCase();
  if (/shirt|tee|t-?shirt|hoodie|polo|jersey|apron|blouse/.test(text)) {
    return "shirt";
  }
  if (/mug|drinkware|coffee\s*cup/.test(text)) {
    return "mug";
  }
  if (/\bcup\b/.test(text)) {
    return "cup";
  }
  if (/vehicle|car|van|truck|bus|auto|fleet/.test(text)) {
    return "vehicle";
  }
  if (/billboard|outdoor|hoarding/.test(text)) {
    return "billboard";
  }
  if (/poster|banner/.test(text)) {
    return "poster";
  }
  if (/signage|sign\b|facade/.test(text)) {
    return "signage";
  }
  if (/wall|mural|brick/.test(text)) {
    return "wall";
  }
  if (/label|sticker|tag\b/.test(text)) {
    return "product_label";
  }
  if (/pack|box|carton|bottle|jar|can\b|verpak/.test(text)) {
    return "packaging";
  }
  if (/cloth|jacket|wear|garment/.test(text)) {
    return "shirt";
  }
  if (/product|merch/.test(text)) {
    return "product_label";
  }
  return "packaging";
}

export function inferBrandSurfaceShape(surfaceType: BrandPlacementSurfaceType): BrandSurfaceShape {
  if (surfaceType === "mug" || surfaceType === "cup") {
    return "curved";
  }
  if (surfaceType === "shirt" || surfaceType === "vehicle") {
    return "curved";
  }
  if (surfaceType === "packaging") {
    return "curved";
  }
  if (surfaceType === "billboard" || surfaceType === "poster" || surfaceType === "wall") {
    return "flat";
  }
  return "flat";
}

export function defaultPlacementModeForSurface(
  surfaceType: BrandPlacementSurfaceType,
  surfaceShape: BrandSurfaceShape
): LogoPlacementMode {
  if (surfaceShape === "curved" || CURVED_SURFACES.has(surfaceType)) {
    return "perspective_warp";
  }
  return "perspective_warp";
}

function orderQuadPoints(points: EditorShapePoint[]): BrandAssetQuad | null {
  if (points.length < 4) {
    return null;
  }

  const unique = points.slice(0, Math.min(points.length, 64));
  const centroid = unique.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  centroid.x /= unique.length;
  centroid.y /= unique.length;

  const sorted = [...unique].sort((a, b) => {
    const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
    const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
    return angleA - angleB;
  });

  if (sorted.length === 4) {
    const byY = [...sorted].sort((a, b) => a.y - b.y);
    const top = byY.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = byY.slice(2).sort((a, b) => a.x - b.x);
    return clampQuad({
      topLeft: top[0]!,
      topRight: top[1]!,
      bottomRight: bottom[1]!,
      bottomLeft: bottom[0]!,
    });
  }

  const scores = sorted.map((point) => ({
    point,
    sum: point.x + point.y,
    diff: point.x - point.y,
  }));

  const topLeft = scores.reduce((best, entry) => (entry.sum < best.sum ? entry : best)).point;
  const bottomRight = scores.reduce((best, entry) => (entry.sum > best.sum ? entry : best)).point;
  const topRight = scores.reduce((best, entry) => (entry.diff > best.diff ? entry : best)).point;
  const bottomLeft = scores.reduce((best, entry) => (entry.diff < best.diff ? entry : best)).point;

  return clampQuad({
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  });
}

function polygonToQuad(polygon: EditorShapePoint[]): BrandAssetQuad | null {
  if (polygon.length === 4) {
    return orderQuadPoints(polygon);
  }
  if (polygon.length > 4) {
    return orderQuadPoints(polygon);
  }
  return null;
}

function bboxToPerspectiveQuad(bounds: BrandAssetBounds, surfaceType: BrandPlacementSurfaceType): BrandAssetQuad {
  const base = boundsToBrandQuad(bounds);
  const skewBySurface: Partial<Record<BrandPlacementSurfaceType, number>> = {
    shirt: 0.06,
    vehicle: 0.05,
    mug: 0.08,
    cup: 0.08,
    packaging: 0.03,
    billboard: 0,
    poster: 0,
    wall: 0,
    signage: 0.02,
    product_label: 0.02,
  };
  const skew = skewBySurface[surfaceType] ?? 0.04;
  const x = clamp01(bounds.x);
  const y = clamp01(bounds.y);
  const w = clamp01(bounds.width);
  const h = clamp01(bounds.height);

  return clampQuad({
    topLeft: { x: x + w * skew, y },
    topRight: { x: x + w * (1 - skew), y },
    bottomRight: { x: x + w, y: y + h },
    bottomLeft: { x, y: y + h },
  });
}

export function generatePlacementQuad(input: PlacementQuadInput): PlacementQuadResult {
  const surfaceType =
    input.surfaceType ??
    inferBrandPlacementSurfaceType({
      label: input.objectLabel,
      category: input.objectCategory,
    });
  const surfaceShape = inferBrandSurfaceShape(surfaceType);

  if (input.userQuad) {
    return {
      quad: clampQuad(input.userQuad),
      source: "user",
      surfaceType,
      surfaceShape,
      placementMode: input.placementMode ?? "perspective_warp",
      curveMesh: { enabled: false },
    };
  }

  const polygon = input.polygon?.length ? input.polygon : undefined;
  if (polygon && polygon.length >= 3) {
    const fromPolygon = polygonToQuad(polygon);
    if (fromPolygon) {
      return {
        quad: fromPolygon,
        source: "polygon",
        surfaceType,
        surfaceShape,
        placementMode: input.placementMode ?? defaultPlacementModeForSurface(surfaceType, surfaceShape),
        curveMesh: { enabled: false },
      };
    }
  }

  if (input.maskUrl?.trim()) {
    const fromMask = orderQuadPoints(boundsToPolygon(input.bbox));
    if (fromMask) {
      return {
        quad: fromMask,
        source: "mask",
        surfaceType,
        surfaceShape,
        placementMode: input.placementMode ?? defaultPlacementModeForSurface(surfaceType, surfaceShape),
        curveMesh: { enabled: false },
      };
    }
  }

  const fromContour = orderQuadPoints(boundsToPolygon(input.bbox));
  if (fromContour && surfaceShape !== "flat") {
    return {
      quad: bboxToPerspectiveQuad(input.bbox, surfaceType),
      source: "vision_contour",
      surfaceType,
      surfaceShape,
      placementMode: input.placementMode ?? "perspective_warp",
      curveMesh: { enabled: false },
    };
  }

  const placementMode = input.placementMode ?? defaultPlacementModeForSurface(surfaceType, surfaceShape);
  const quad =
    placementMode === "perspective_warp" && surfaceShape !== "flat"
      ? bboxToPerspectiveQuad(input.bbox, surfaceType)
      : boundsToBrandQuad(input.bbox);

  return {
    quad,
    source: "bbox",
    surfaceType,
    surfaceShape,
    placementMode,
    curveMesh: { enabled: false },
  };
}

export function normalizedQuadToPixelQuad(
  quad: BrandAssetQuad,
  imageWidth: number,
  imageHeight: number
): BrandAssetQuad {
  const w = Math.max(1, imageWidth);
  const h = Math.max(1, imageHeight);
  const scale = (point: { x: number; y: number }) => ({
    x: Math.round(clamp01(point.x) * w),
    y: Math.round(clamp01(point.y) * h),
  });
  return {
    topLeft: scale(quad.topLeft),
    topRight: scale(quad.topRight),
    bottomRight: scale(quad.bottomRight),
    bottomLeft: scale(quad.bottomLeft),
  };
}

export function resetPlacementQuad(input: PlacementQuadInput): PlacementQuadResult {
  return generatePlacementQuad({ ...input, userQuad: undefined });
}

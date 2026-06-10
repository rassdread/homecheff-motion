import type { EditorCanvasBounds, EditorShapePoint } from "@/types/homecheff-visual-editor";

export const MASK_ALPHA_THRESHOLD = 24;
export const CONTOUR_SIMPLIFY_EPSILON = 0.0025;
export const CONTOUR_MAX_POINTS = 64;
export const CONTOUR_MIN_HOLE_AREA = 48;

export function maskToBoundingBox(
  alphaData: Uint8Array,
  width: number,
  height: number,
  channels: number
): EditorCanvasBounds | null {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = alphaData[(y * width + x) * channels + (channels - 1)] ?? 0;
      if (alpha > MASK_ALPHA_THRESHOLD) {
        found = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!found || maxX <= minX || maxY <= minY) {
    return null;
  }

  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  };
}

function isForeground(alphaData: Uint8Array, width: number, x: number, y: number, channels: number): boolean {
  if (x < 0 || y < 0 || x >= width) {
    return false;
  }
  const alpha = alphaData[(y * width + x) * channels + (channels - 1)] ?? 0;
  return alpha > MASK_ALPHA_THRESHOLD;
}

function perpendicularDistance(
  point: EditorShapePoint,
  lineStart: EditorShapePoint,
  lineEnd: EditorShapePoint
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }
  const t =
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

/** Douglas–Peucker simplification — preserves sharp corners when epsilon is low. */
export function simplifyContourPolygon(
  points: EditorShapePoint[],
  epsilon = CONTOUR_SIMPLIFY_EPSILON
): EditorShapePoint[] {
  if (points.length < 3) {
    return points;
  }

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i]!, points[0]!, points[end]!);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyContourPolygon(points.slice(0, index + 1), epsilon);
    const right = simplifyContourPolygon(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0]!, points[end]!];
}

function smoothContourMovingAverage(
  points: EditorShapePoint[],
  window = 3
): EditorShapePoint[] {
  if (points.length < 5) {
    return points;
  }
  const half = Math.floor(window / 2);
  return points.map((_, i) => {
    let sx = 0;
    let sy = 0;
    let count = 0;
    for (let j = i - half; j <= i + half; j++) {
      const idx = (j + points.length) % points.length;
      sx += points[idx]!.x;
      sy += points[idx]!.y;
      count += 1;
    }
    return { x: sx / count, y: sy / count };
  });
}

/** Remove isolated noise pixels and close tiny holes in alpha mask. */
export function cleanupMaskAlpha(
  alphaData: Uint8Array,
  width: number,
  height: number,
  channels: number
): Uint8Array {
  const out = new Uint8Array(alphaData);
  const alphaIndex = channels - 1;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * channels + alphaIndex;
      const alpha = alphaData[idx] ?? 0;
      if (alpha <= MASK_ALPHA_THRESHOLD) {
        continue;
      }
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const nIdx = ((y + dy) * width + (x + dx)) * channels + alphaIndex;
          if ((alphaData[nIdx] ?? 0) > MASK_ALPHA_THRESHOLD) {
            neighbors += 1;
          }
        }
      }
      if (neighbors <= 2) {
        out[idx] = 0;
      }
    }
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * channels + alphaIndex;
      if ((out[idx] ?? 0) > MASK_ALPHA_THRESHOLD) {
        continue;
      }
      let fgNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const nIdx = ((y + dy) * width + (x + dx)) * channels + alphaIndex;
          if ((out[nIdx] ?? 0) > MASK_ALPHA_THRESHOLD) {
            fgNeighbors += 1;
          }
        }
      }
      if (fgNeighbors >= 6) {
        out[idx] = 255;
      }
    }
  }

  return out;
}

export function refineContourPolygon(
  points: EditorShapePoint[],
  options?: { maxPoints?: number; epsilon?: number }
): EditorShapePoint[] {
  if (points.length < 3) {
    return points;
  }
  const maxPoints = options?.maxPoints ?? CONTOUR_MAX_POINTS;
  const epsilon = options?.epsilon ?? CONTOUR_SIMPLIFY_EPSILON;
  const smoothed = smoothContourMovingAverage(points);
  const simplified = simplifyContourPolygon(smoothed, epsilon);
  if (simplified.length <= maxPoints) {
    return simplified;
  }
  const step = simplified.length / maxPoints;
  const sampled: EditorShapePoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(simplified[Math.floor(i * step)]!);
  }
  return sampled;
}

/** Trace outer boundary pixels and downsample to a normalized polygon. */
export function maskToPolygon(
  alphaData: Uint8Array,
  width: number,
  height: number,
  channels: number,
  maxPoints = CONTOUR_MAX_POINTS
): EditorShapePoint[] {
  const bbox = maskToBoundingBox(alphaData, width, height, channels);
  if (!bbox) {
    return [];
  }

  const boundary: EditorShapePoint[] = [];
  const minX = Math.floor(bbox.x * width);
  const minY = Math.floor(bbox.y * height);
  const maxX = Math.ceil((bbox.x + bbox.width) * width);
  const maxY = Math.ceil((bbox.y + bbox.height) * height);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!isForeground(alphaData, width, x, y, channels)) {
        continue;
      }
      const edge =
        !isForeground(alphaData, width, x - 1, y, channels) ||
        !isForeground(alphaData, width, x + 1, y, channels) ||
        !isForeground(alphaData, width, x, y - 1, channels) ||
        !isForeground(alphaData, width, x, y + 1, channels);
      if (edge) {
        boundary.push({ x: x / width, y: y / height });
      }
    }
  }

  if (boundary.length < 3) {
    return boundsToPolygonFallback(bbox);
  }

  boundary.sort((a, b) => {
    const angleA = Math.atan2(a.y - (bbox.y + bbox.height / 2), a.x - (bbox.x + bbox.width / 2));
    const angleB = Math.atan2(b.y - (bbox.y + bbox.height / 2), b.x - (bbox.x + bbox.width / 2));
    return angleA - angleB;
  });

  return refineContourPolygon(boundary, { maxPoints });
}

function boundsToPolygonFallback(bounds: EditorCanvasBounds): EditorShapePoint[] {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];
}

export async function extractMaskContourFromPng(maskBuffer: Buffer): Promise<{
  polygon: EditorShapePoint[];
  boundingBox: EditorCanvasBounds;
}> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(maskBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cleaned = cleanupMaskAlpha(data, info.width, info.height, info.channels);
  const bbox =
    maskToBoundingBox(cleaned, info.width, info.height, info.channels) ??
    ({ x: 0, y: 0, width: 1, height: 1 } as EditorCanvasBounds);
  const polygon = maskToPolygon(cleaned, info.width, info.height, info.channels);
  return {
    polygon: polygon.length >= 3 ? polygon : boundsToPolygonFallback(bbox),
    boundingBox: bbox,
  };
}

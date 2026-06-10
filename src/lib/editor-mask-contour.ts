import type { EditorCanvasBounds, EditorShapePoint } from "@/types/homecheff-visual-editor";

export const MASK_ALPHA_THRESHOLD = 24;

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

/** Trace outer boundary pixels and downsample to a normalized polygon. */
export function maskToPolygon(
  alphaData: Uint8Array,
  width: number,
  height: number,
  channels: number,
  maxPoints = 48
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

  if (boundary.length <= maxPoints) {
    return boundary;
  }

  const step = boundary.length / maxPoints;
  const sampled: EditorShapePoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(boundary[Math.floor(i * step)]!);
  }
  return sampled;
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
  const bbox =
    maskToBoundingBox(data, info.width, info.height, info.channels) ??
    ({ x: 0, y: 0, width: 1, height: 1 } as EditorCanvasBounds);
  const polygon = maskToPolygon(data, info.width, info.height, info.channels);
  return {
    polygon: polygon.length >= 3 ? polygon : boundsToPolygonFallback(bbox),
    boundingBox: bbox,
  };
}

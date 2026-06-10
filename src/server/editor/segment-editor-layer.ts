import sharp from "sharp";
import type { EditorCanvasBounds, EditorShapePoint } from "@/types/homecheff-visual-editor";
import {
  boundsFromPolygon,
  boundsToPolygon,
  refineSelectionPolygonFromBounds,
} from "@/lib/editor-object-mask";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";

export type EditorSegmentRequestMode = "refine" | "remove_background";

export type EditorSegmentResult = {
  maskUrl?: string;
  cutoutUrl?: string;
  polygon: EditorShapePoint[];
  boundingBox: EditorCanvasBounds;
  confidence: number;
  segmentationSource: "rembg" | "heuristic";
  alphaMask: boolean;
};

async function tryRembgMask(sourceBuffer: Buffer): Promise<Buffer | null> {
  const endpoint = process.env.REMBG_API_URL?.trim();
  if (!endpoint) {
    return null;
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: new Uint8Array(sourceBuffer),
    signal: AbortSignal.timeout(45_000),
  }).catch(() => null);
  if (!res?.ok) {
    return null;
  }
  const maskBuffer = Buffer.from(await res.arrayBuffer());
  return maskBuffer.length >= 100 ? maskBuffer : null;
}

async function bboxFromAlphaMask(
  maskBuffer: Buffer,
  width: number,
  height: number
): Promise<EditorCanvasBounds | null> {
  const { data, info } = await sharp(maskBuffer)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  const channels = info.channels;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * channels + (channels - 1)] ?? 0;
      if (alpha > 24) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    return null;
  }
  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  };
}

export async function segmentEditorLayer(input: {
  sourceUrl: string;
  uploadPathPrefix: string;
  mode: EditorSegmentRequestMode;
  targetBounds?: EditorCanvasBounds;
}): Promise<EditorSegmentResult> {
  const res = await fetch(input.sourceUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch editor image (${res.status}).`);
  }
  const sourceBuffer = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(sourceBuffer).metadata();
  const width = Math.max(1, meta.width ?? 720);
  const height = Math.max(1, meta.height ?? 1280);

  const fallbackBounds = input.targetBounds ?? {
    x: 0.15,
    y: 0.1,
    width: 0.7,
    height: 0.8,
  };

  const rembgMask = await tryRembgMask(sourceBuffer);
  const detectedBounds =
    rembgMask ? (await bboxFromAlphaMask(rembgMask, width, height)) ?? fallbackBounds : fallbackBounds;

  const polygon = refineSelectionPolygonFromBounds(detectedBounds);
  let maskUrl: string | undefined;
  let cutoutUrl: string | undefined;
  let segmentationSource: "rembg" | "heuristic" = "heuristic";
  let confidence = 0.62;
  let alphaMask = false;

  if (rembgMask) {
    segmentationSource = "rembg";
    confidence = 0.88;
    alphaMask = true;
    const maskPath = `${input.uploadPathPrefix}/editor-mask.png`;
    const { url } = await uploadPublicBlob({
      pathname: maskPath,
      body: rembgMask,
      contentType: "image/png",
      addRandomSuffix: true,
      context: { uploadTarget: maskPath, provider: "editor-segment-mask" },
    });
    maskUrl = url;

    if (input.mode === "remove_background") {
      const cutoutBuffer = await sharp(sourceBuffer)
        .ensureAlpha()
        .composite([{ input: rembgMask, blend: "dest-in" }])
        .png()
        .toBuffer();
      const cutoutPath = `${input.uploadPathPrefix}/editor-cutout.png`;
      const { url: cutout } = await uploadPublicBlob({
        pathname: cutoutPath,
        body: cutoutBuffer,
        contentType: "image/png",
        addRandomSuffix: true,
        context: { uploadTarget: cutoutPath, provider: "editor-segment-cutout" },
      });
      cutoutUrl = cutout;
    }
  }

  return {
    maskUrl,
    cutoutUrl,
    polygon,
    boundingBox: boundsFromPolygon(polygon.length >= 3 ? polygon : boundsToPolygon(detectedBounds)),
    confidence,
    segmentationSource,
    alphaMask,
  };
}

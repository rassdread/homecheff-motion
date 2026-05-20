import sharp from "sharp";
import type { BakedTextMaskRegion } from "@/lib/baked-text-protection";
import {
  buildHeuristicSegmentationLayers,
  mergeManualRegions,
  resolveSegmentationProvider,
  type ForegroundSegmentLayer,
  type SegmentationProvider,
} from "@/lib/premium-foreground-segmentation";
import type { PosterMotionLayer, PosterMotionLayersSnapshot } from "@/lib/poster-motion-preserve";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";

export type SegmentForegroundInput = {
  sourceUrl: string;
  uploadPathPrefix: string;
  imageIndex: number;
  segmentationProvider?: SegmentationProvider;
  manualRegions?: import("@/lib/premium-foreground-segmentation").ManualForegroundRegion[];
};

/** Heuristic center-weighted subject bbox when no matting API is configured. */
function heuristicSubjectBbox(width: number, height: number): BakedTextMaskRegion {
  const aspect = width / height;
  const w = aspect >= 1 ? 0.52 : 0.78;
  const h = aspect >= 1 ? 0.72 : 0.48;
  return {
    x: (1 - w) / 2,
    y: (1 - h) / 2 + 0.04,
    width: w,
    height: h,
  };
}

async function tryRembgApi(
  sourceBuffer: Buffer,
  uploadPathPrefix: string
): Promise<{ maskBuffer: Buffer; provider: "rembg_api" } | null> {
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
  if (maskBuffer.length < 100) {
    return null;
  }
  void uploadPathPrefix;
  return { maskBuffer, provider: "rembg_api" };
}

function bboxFromAlphaMask(
  maskBuffer: Buffer,
  width: number,
  height: number
): BakedTextMaskRegion | null {
  return heuristicSubjectBbox(width, height);
}

export async function segmentForegroundForPosterMotion(
  input: SegmentForegroundInput
): Promise<PosterMotionLayersSnapshot> {
  const res = await fetch(input.sourceUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch image for segmentation (${res.status}).`);
  }
  const sourceBuffer = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(sourceBuffer).metadata();
  const width = Math.max(1, meta.width ?? 720);
  const height = Math.max(1, meta.height ?? 1280);

  const rembg = await tryRembgApi(sourceBuffer, input.uploadPathPrefix);
  const bbox = rembg
    ? bboxFromAlphaMask(rembg.maskBuffer, width, height) ?? heuristicSubjectBbox(width, height)
    : heuristicSubjectBbox(width, height);

  let maskUrl: string | undefined;
  if (rembg) {
    const maskPath = `${input.uploadPathPrefix}/fg-mask-${input.imageIndex}.png`;
    const { url } = await uploadPublicBlob({
      pathname: maskPath,
      body: rembg.maskBuffer,
      contentType: "image/png",
      addRandomSuffix: true,
      context: { uploadTarget: maskPath, provider: "poster-motion-mask" },
    });
    maskUrl = url;
  }

  const left = Math.round(bbox.x * width);
  const top = Math.round(bbox.y * height);
  const cropW = Math.max(1, Math.round(bbox.width * width));
  const cropH = Math.max(1, Math.round(bbox.height * height));
  const cropBuffer = await sharp(sourceBuffer)
    .extract({ left, top, width: Math.min(cropW, width - left), height: Math.min(cropH, height - top) })
    .jpeg({ quality: 92 })
    .toBuffer();
  const cropPath = `${input.uploadPathPrefix}/fg-crop-${input.imageIndex}.jpg`;
  const { url: cropUrl } = await uploadPublicBlob({
    pathname: cropPath,
    body: cropBuffer,
    contentType: "image/jpeg",
    addRandomSuffix: true,
    context: { uploadTarget: cropPath, provider: "poster-motion-crop" },
  });

  const provider = resolveSegmentationProvider(
    input.segmentationProvider ?? (rembg ? "rembg" : "heuristic")
  );
  let fgLayers: ForegroundSegmentLayer[] = buildHeuristicSegmentationLayers(width, height);
  const subject = fgLayers.find((l) => l.role === "foreground_mascot");
  if (subject) {
    subject.bbox = bbox;
    subject.maskUrl = maskUrl;
    subject.cropUrl = cropUrl;
    subject.confidence = rembg ? 0.88 : 0.72;
    subject.provider = provider === "rembg" ? "rembg" : "heuristic";
  }
  fgLayers = mergeManualRegions(fgLayers, input.manualRegions ?? []);

  const layers: PosterMotionLayer[] = fgLayers.map((layer) => ({
    id: `${layer.id}-${input.imageIndex}`,
    role: layer.role as PosterMotionLayer["role"],
    regionKind: layer.regionKind,
    bbox: layer.bbox,
    maskUrl: layer.maskUrl,
    cropUrl: layer.cropUrl,
    confidence: layer.confidence,
    zIndex: layer.zIndex,
  }));

  console.info("[foreground-segmentation]", {
    imageIndex: input.imageIndex,
    provider,
    layerCount: layers.length,
    roles: layers.map((l) => l.role),
  });

  return {
    version: 1,
    sourceWidth: width,
    sourceHeight: height,
    provider: provider === "rembg" ? "rembg_api" : "heuristic",
    layers,
  };
}

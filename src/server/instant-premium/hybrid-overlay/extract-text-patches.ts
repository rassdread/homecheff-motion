import sharp from "sharp";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import {
  bboxToPolygon,
  type ImageTextPatchesSnapshot,
  type TextPatch,
} from "@/lib/hybrid-motion-overlay";
import {
  normalizeMaskRegion,
  normalizeMaskRegionNormalized,
} from "@/lib/baked-text-protection";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";

const DEFAULT_PADDING_RATIO = 0.08;
const MIN_PATCH_PX = 8;

function logTextWarp(phase: string, data: Record<string, unknown>): void {
  console.info("[text-warp]", { phase, ...data });
}

function expandBox(
  box: { left: number; top: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
  paddingRatio: number
): { left: number; top: number; width: number; height: number } {
  const padX = Math.max(2, Math.round(box.width * paddingRatio));
  const padY = Math.max(2, Math.round(box.height * paddingRatio));
  const left = Math.max(0, box.left - padX);
  const top = Math.max(0, box.top - padY);
  const right = Math.min(imageWidth, box.left + box.width + padX);
  const bottom = Math.min(imageHeight, box.top + box.height + padY);
  return {
    left,
    top,
    width: Math.max(MIN_PATCH_PX, right - left),
    height: Math.max(MIN_PATCH_PX, bottom - top),
  };
}

/** Extract high-res PNG patches from confirmed OCR blocks (pixel preservation source). */
export async function extractTextPatchesFromImage(params: {
  sourceBuffer: Buffer;
  blocks: BakedTextBlockRecord[];
  uploadPathPrefix: string;
  imageOrder: number;
  paddingRatio?: number;
}): Promise<ImageTextPatchesSnapshot> {
  const paddingRatio = params.paddingRatio ?? DEFAULT_PADDING_RATIO;
  const meta = await sharp(params.sourceBuffer).metadata();
  const imageWidth = Math.max(1, meta.width ?? 720);
  const imageHeight = Math.max(1, meta.height ?? 1280);
  const patches: TextPatch[] = [];

  logTextWarp("extract-start", {
    imageOrder: params.imageOrder,
    blockCount: params.blocks.length,
  });

  for (let i = 0; i < params.blocks.length; i += 1) {
    const block = params.blocks[i];
    const normalized = normalizeMaskRegionNormalized(block.bbox);
    if (!normalized) {
      continue;
    }
    const box = normalizeMaskRegion(normalized, imageWidth, imageHeight);
    if (!box) {
      continue;
    }
    const expanded = expandBox(box, imageWidth, imageHeight, paddingRatio);
    const patchBuffer = await sharp(params.sourceBuffer)
      .extract(expanded)
      .png()
      .toBuffer();

    const pathname = `${params.uploadPathPrefix}/patch-${block.id}.png`;
    const { url } = await uploadPublicBlob({
      pathname,
      body: patchBuffer,
      contentType: "image/png",
      addRandomSuffix: false,
      context: {
        uploadTarget: pathname,
        provider: "instant-text-patch",
      },
    });

    const polygon = bboxToPolygon(normalized);
    patches.push({
      id: block.id,
      text: block.editedText?.trim() || block.text,
      polygon,
      bbox: normalized,
      patchUrl: url,
      patchWidth: expanded.width,
      patchHeight: expanded.height,
      padding: paddingRatio,
      zIndex: i + 1,
      confidence: block.confidence,
      fontInfo: {
        family: "sans-serif",
        weight: block.blockType === "cta" ? 700 : 500,
      },
      colorInfo: {},
      sourceImageOrder: params.imageOrder,
    });
  }

  logTextWarp("extract-complete", {
    imageOrder: params.imageOrder,
    patchCount: patches.length,
  });

  return { version: 1, patches };
}

export async function extractTextPatchesFromUrl(params: {
  sourceUrl: string;
  blocks: BakedTextBlockRecord[];
  uploadPathPrefix: string;
  imageOrder: number;
}): Promise<ImageTextPatchesSnapshot> {
  const res = await fetch(params.sourceUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not download image for patch extraction (${res.status}).`);
  }
  const sourceBuffer = Buffer.from(await res.arrayBuffer());
  return extractTextPatchesFromImage({
    sourceBuffer,
    blocks: params.blocks,
    uploadPathPrefix: params.uploadPathPrefix,
    imageOrder: params.imageOrder,
  });
}

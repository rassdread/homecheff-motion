import { put } from "@vercel/blob";
import sharp from "sharp";
import {
  clamp01,
  defaultMaskRegionForTextPosition,
  type BakedTextMaskRegion,
} from "@/lib/baked-text-protection";

export type MaskBakedTextImageInput = {
  sourceUrl: string;
  maskRegion: BakedTextMaskRegion;
  uploadPathPrefix: string;
};

export type MaskBakedTextImageResult = {
  url: string;
  storageKey: string;
};

function regionPixels(
  width: number,
  height: number,
  region: BakedTextMaskRegion
): { left: number; top: number; width: number; height: number } {
  const left = Math.round(clamp01(region.x) * width);
  const top = Math.round(clamp01(region.y) * height);
  const w = Math.max(8, Math.round(region.width * width));
  const h = Math.max(8, Math.round(region.height * height));
  return {
    left: Math.min(left, Math.max(0, width - 8)),
    top: Math.min(top, Math.max(0, height - 8)),
    width: Math.min(w, width - left),
    height: Math.min(h, height - top),
  };
}

/** Blur + neutralize a text band so Vidu does not animate readable baked-in copy. */
export async function maskBakedTextInImageBuffer(
  input: Buffer,
  region: BakedTextMaskRegion
): Promise<Buffer> {
  const base = sharp(input);
  const meta = await base.metadata();
  const width = meta.width ?? 720;
  const height = meta.height ?? 1280;
  const box = regionPixels(width, height, region);

  const patch = await sharp(input)
    .extract(box)
    .blur(28)
    .modulate({ brightness: 1.02, saturation: 0.85 })
    .toBuffer();

  const softened = await sharp(patch)
    .modulate({ brightness: 0.98 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return sharp(input)
    .composite([{ input: softened, left: box.left, top: box.top }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

export async function maskBakedTextRegionsInImageBuffer(
  input: Buffer,
  regions: BakedTextMaskRegion[]
): Promise<Buffer> {
  let current = input;
  for (const region of regions) {
    current = await maskBakedTextInImageBuffer(current, region);
  }
  return current;
}

export async function maskAndUploadBakedTextSafeImage(
  input: MaskBakedTextImageInput & { maskRegions?: BakedTextMaskRegion[] }
): Promise<MaskBakedTextImageResult> {
  const res = await fetch(input.sourceUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not download source image for text masking (${res.status}).`);
  }
  const sourceBuffer = Buffer.from(await res.arrayBuffer());
  const regions =
    input.maskRegions && input.maskRegions.length > 0
      ? input.maskRegions
      : [input.maskRegion];
  const masked = await maskBakedTextRegionsInImageBuffer(sourceBuffer, regions);
  const path = `${input.uploadPathPrefix}/vidu-safe-${Date.now()}.jpg`;
  const blob = await put(path, masked, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: true,
  });
  return { url: blob.url, storageKey: path };
}

export function resolveMaskRegionForProtection(params: {
  maskRegion?: BakedTextMaskRegion | null;
  positionY?: number;
}): BakedTextMaskRegion {
  if (params.maskRegion) {
    return params.maskRegion;
  }
  return defaultMaskRegionForTextPosition(params.positionY ?? 0.12);
}

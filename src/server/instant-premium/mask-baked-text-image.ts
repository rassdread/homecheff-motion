import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import sharp from "sharp";
import { neutralizeTextRegionsHybrid } from "@/server/instant-premium/hybrid-overlay/pre-ai-neutralize";
import {
  defaultMaskRegionForTextPosition,
  logInvalidMaskRegion,
  normalizeMaskRegion,
  normalizeMaskRegionNormalized,
  type BakedTextMaskRegion,
  type MaskRegionPixels,
} from "@/lib/baked-text-protection";

export type MaskBakedTextImageInput = {
  sourceUrl: string;
  maskRegion: BakedTextMaskRegion;
  uploadPathPrefix: string;
};

export type MaskBakedTextImageResult = {
  url: string;
  storageKey: string;
  skippedRegionCount: number;
};

export type MaskBakedTextRegionsResult = {
  buffer: Buffer;
  skippedRegionCount: number;
};

async function readImageDimensions(input: Buffer): Promise<{ width: number; height: number }> {
  const meta = await sharp(input).metadata();
  return {
    width: Math.max(1, meta.width ?? 720),
    height: Math.max(1, meta.height ?? 1280),
  };
}

/** Blur + neutralize a text band so Vidu does not animate readable baked-in copy. */
export async function maskBakedTextInImageBufferWithBox(
  input: Buffer,
  box: MaskRegionPixels
): Promise<Buffer> {
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

/** Blur + neutralize a normalized text band (validates pixels before extract). */
export async function maskBakedTextInImageBuffer(
  input: Buffer,
  region: BakedTextMaskRegion,
  context?: { imageIndex?: number; ocrText?: string }
): Promise<Buffer> {
  const { width, height } = await readImageDimensions(input);
  const box = normalizeMaskRegion(region, width, height);
  if (!box) {
    logInvalidMaskRegion({
      imageIndex: context?.imageIndex ?? -1,
      ocrText: context?.ocrText,
      rawBbox: region,
      normalizedBbox: normalizeMaskRegionNormalized(region),
      imageWidth: width,
      imageHeight: height,
    });
    throw new Error("Invalid mask region for baked text extract.");
  }
  return maskBakedTextInImageBufferWithBox(input, box);
}

export async function maskBakedTextRegionsInImageBuffer(
  input: Buffer,
  regions: BakedTextMaskRegion[],
  context?: {
    imageIndex?: number;
    ocrTexts?: string[];
    projectId?: string;
    useHybridNeutralize?: boolean;
    useAggressiveNeutralize?: boolean;
  }
): Promise<MaskBakedTextRegionsResult> {
  if (context?.useHybridNeutralize) {
    const hybrid = await neutralizeTextRegionsHybrid(input, regions, {
      projectId: context.projectId,
      imageIndex: context.imageIndex,
      ocrTexts: context.ocrTexts,
      aggressive: context.useAggressiveNeutralize === true,
    });
    return { buffer: hybrid.buffer, skippedRegionCount: hybrid.skippedRegionCount };
  }

  const { width, height } = await readImageDimensions(input);
  let current = input;
  let skippedRegionCount = 0;

  for (let i = 0; i < regions.length; i += 1) {
    const region = regions[i];
    const box = normalizeMaskRegion(region, width, height);
    if (!box) {
      skippedRegionCount += 1;
      logInvalidMaskRegion({
        imageIndex: context?.imageIndex ?? -1,
        ocrText: context?.ocrTexts?.[i],
        rawBbox: region,
        normalizedBbox: normalizeMaskRegionNormalized(region),
        imageWidth: width,
        imageHeight: height,
      });
      continue;
    }
    current = await maskBakedTextInImageBufferWithBox(current, box);
  }

  return { buffer: current, skippedRegionCount };
}

export async function maskAndUploadBakedTextSafeImage(
  input: MaskBakedTextImageInput & {
    maskRegions?: BakedTextMaskRegion[];
    imageIndex?: number;
    projectId?: string;
    useHybridNeutralize?: boolean;
    useAggressiveNeutralize?: boolean;
  }
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
  const { buffer: masked, skippedRegionCount } = await maskBakedTextRegionsInImageBuffer(
    sourceBuffer,
    regions,
    {
      imageIndex: input.imageIndex,
      projectId: input.projectId,
      useHybridNeutralize: input.useHybridNeutralize,
      useAggressiveNeutralize: input.useAggressiveNeutralize,
    }
  );
  const path = `${input.uploadPathPrefix}/vidu-safe-${Date.now()}.jpg`;
  const { url } = await uploadPublicBlob({
    pathname: path,
    body: masked,
    contentType: "image/jpeg",
    addRandomSuffix: true,
    context: {
      uploadTarget: path,
      provider: "instant-baked-text-mask",
    },
  });
  return { url, storageKey: path, skippedRegionCount };
}

export function resolveMaskRegionForProtection(params: {
  maskRegion?: BakedTextMaskRegion | null;
  positionY?: number;
}): BakedTextMaskRegion {
  if (params.maskRegion) {
    return normalizeMaskRegionNormalized(params.maskRegion) ?? defaultMaskRegionForTextPosition(params.positionY ?? 0.12);
  }
  return defaultMaskRegionForTextPosition(params.positionY ?? 0.12);
}

export function sanitizeMaskRegionsForImage(
  regions: BakedTextMaskRegion[],
  context: {
    imageIndex: number;
    imageWidth: number;
    imageHeight: number;
    ocrTexts?: string[];
  }
): { regions: BakedTextMaskRegion[]; skippedCount: number } {
  const valid: BakedTextMaskRegion[] = [];
  let skippedCount = 0;

  for (let i = 0; i < regions.length; i += 1) {
    const raw = regions[i];
    const normalized = normalizeMaskRegionNormalized(raw);
    const pixels =
      normalized && normalizeMaskRegion(normalized, context.imageWidth, context.imageHeight);
    if (!normalized || !pixels) {
      skippedCount += 1;
      logInvalidMaskRegion({
        imageIndex: context.imageIndex,
        ocrText: context.ocrTexts?.[i],
        rawBbox: raw,
        normalizedBbox: normalized,
        imageWidth: context.imageWidth,
        imageHeight: context.imageHeight,
      });
      continue;
    }
    valid.push(normalized);
  }

  return { regions: valid, skippedCount };
}

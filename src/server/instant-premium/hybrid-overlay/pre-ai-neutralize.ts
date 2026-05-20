import sharp from "sharp";
import {
  logInvalidMaskRegion,
  normalizeMaskRegion,
  normalizeMaskRegionNormalized,
  type BakedTextMaskRegion,
  type MaskRegionPixels,
} from "@/lib/baked-text-protection";

function logOverlayReproject(phase: string, data: Record<string, unknown>): void {
  console.info("[overlay-reproject]", { phase, ...data });
}

async function readImageDimensions(input: Buffer): Promise<{ width: number; height: number }> {
  const meta = await sharp(input).metadata();
  return {
    width: Math.max(1, meta.width ?? 720),
    height: Math.max(1, meta.height ?? 1280),
  };
}

/**
 * Hybrid pre-AI neutralize: texture reconstruction + blur (inpaint-lite).
 * Keeps lighting/perspective; removes readable typography for Vidu.
 */
export async function neutralizeTextRegionHybrid(
  input: Buffer,
  box: MaskRegionPixels
): Promise<Buffer> {
  const patch = await sharp(input).extract(box).toBuffer();
  const meta = await sharp(patch).metadata();
  const pw = Math.max(1, meta.width ?? box.width);
  const ph = Math.max(1, meta.height ?? box.height);

  const blurred = await sharp(patch).blur(22).modulate({ saturation: 0.75, brightness: 1.03 }).toBuffer();
  const noise = await sharp({
    create: {
      width: pw,
      height: ph,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .png()
    .blur(6)
    .modulate({ brightness: 1.05 })
    .toBuffer();

  const reconstructed = await sharp(blurred)
    .composite([{ input: noise, blend: "soft-light" }])
    .sharpen({ sigma: 0.6 })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  return sharp(input)
    .composite([{ input: reconstructed, left: box.left, top: box.top }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

export async function neutralizeTextRegionsHybrid(
  input: Buffer,
  regions: BakedTextMaskRegion[],
  context?: { projectId?: string; imageIndex?: number; ocrTexts?: string[] }
): Promise<{ buffer: Buffer; skippedRegionCount: number }> {
  const { width, height } = await readImageDimensions(input);
  let current = input;
  let skippedRegionCount = 0;

  logOverlayReproject("pre-ai-start", {
    projectId: context?.projectId,
    imageIndex: context?.imageIndex,
    regionCount: regions.length,
  });

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
    current = await neutralizeTextRegionHybrid(current, box);
  }

  logOverlayReproject("pre-ai-complete", {
    projectId: context?.projectId,
    imageIndex: context?.imageIndex,
    skippedRegionCount,
  });

  return { buffer: current, skippedRegionCount };
}

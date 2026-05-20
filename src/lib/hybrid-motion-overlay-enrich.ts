import sharp from "sharp";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import { normalizeMaskRegion, type BakedTextMaskRegion } from "@/lib/baked-text-protection";
import type { DetectedTextBlock, HybridTextBlockMetadata } from "@/lib/hybrid-motion-overlay";

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function sampleRegionStats(
  buffer: Buffer,
  region: BakedTextMaskRegion
): Promise<{ textColor?: string; backgroundColor?: string; rotation?: number }> {
  const meta = await sharp(buffer).metadata();
  const width = Math.max(1, meta.width ?? 720);
  const height = Math.max(1, meta.height ?? 1280);
  const box = normalizeMaskRegion(region, width, height);
  if (!box) {
    return {};
  }

  const patch = await sharp(buffer).extract(box).resize(48, 24, { fit: "fill" }).raw().toBuffer({
    resolveWithObject: true,
  });

  const { data, info } = patch;
  const channels = info.channels;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let darkR = 0;
  let darkG = 0;
  let darkB = 0;
  let darkCount = 0;
  let brightR = 0;
  let brightG = 0;
  let brightB = 0;
  let brightCount = 0;
  const pixels = data.length / channels;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1] ?? r;
    const b = data[i + 2] ?? r;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumR += r;
    sumG += g;
    sumB += b;
    if (lum < 110) {
      darkR += r;
      darkG += g;
      darkB += b;
      darkCount += 1;
    } else if (lum > 170) {
      brightR += r;
      brightG += g;
      brightB += b;
      brightCount += 1;
    }
  }

  const avgR = sumR / pixels;
  const avgG = sumG / pixels;
  const avgB = sumB / pixels;
  const bg =
    darkCount > brightCount && darkCount > pixels * 0.15
      ? rgbToHex(darkR / darkCount, darkG / darkCount, darkB / darkCount)
      : brightCount > 0
        ? rgbToHex(brightR / brightCount, brightG / brightCount, brightB / brightCount)
        : rgbToHex(avgR, avgG, avgB);

  const text =
    brightCount >= darkCount
      ? rgbToHex(darkR / Math.max(1, darkCount), darkG / Math.max(1, darkCount), darkB / Math.max(1, darkCount))
      : rgbToHex(brightR / Math.max(1, brightCount), brightG / Math.max(1, brightCount), brightB / Math.max(1, brightCount));

  return {
    textColor: text,
    backgroundColor: bg,
    rotation: 0,
  };
}

/** Enrich OCR blocks with color/font estimates for hybrid reprojection metadata. */
export async function enrichBakedTextBlocksFromImage(
  sourceBuffer: Buffer,
  blocks: BakedTextBlockRecord[],
  context?: { sourceImageId?: string; imageWidth?: number; imageHeight?: number }
): Promise<HybridTextBlockMetadata[]> {
  const meta = await sharp(sourceBuffer).metadata();
  const imageWidth = context?.imageWidth ?? meta.width ?? 720;
  const imageHeight = context?.imageHeight ?? meta.height ?? 1280;

  const enriched: HybridTextBlockMetadata[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const stats = await sampleRegionStats(sourceBuffer, block.bbox).catch(
      (): { textColor?: string; backgroundColor?: string; rotation?: number } => ({})
    );
    enriched.push({
      id: block.id,
      text: block.text,
      editedText: block.editedText,
      bbox: block.bbox,
      confidence: block.confidence,
      alignment: block.suggestedAlign,
      rotation: stats.rotation ?? 0,
      fontFamilyEstimate: "sans-serif",
      fontWeightEstimate: block.blockType === "cta" ? 700 : 500,
      textColor: stats.textColor ?? "#FFFFFF",
      backgroundColor: stats.backgroundColor ?? "#1a1a1a",
      zIndex: i + 1,
      imageWidth,
      imageHeight,
      sourceImageId: context?.sourceImageId,
      blockType: block.blockType,
    });
  }
  return enriched;
}

export function blocksToDetectedTextMetadata(
  blocks: HybridTextBlockMetadata[]
): DetectedTextBlock[] {
  return blocks.map((b) => ({
    id: b.id,
    text: b.editedText?.trim() || b.text,
    bbox: b.bbox,
    rotation: b.rotation,
    fontFamilyEstimate: b.fontFamilyEstimate,
    fontWeightEstimate: b.fontWeightEstimate,
    textColor: b.textColor,
    backgroundColor: b.backgroundColor,
    alignment: b.alignment,
    zIndex: b.zIndex,
    confidence: b.confidence,
    imageWidth: b.imageWidth,
    imageHeight: b.imageHeight,
  }));
}

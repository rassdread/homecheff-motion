import sharp from "sharp";
import type { MaskRegionPixels } from "@/lib/baked-text-protection";

function logAggressiveNeutralize(phase: string, data: Record<string, unknown>): void {
  console.info("[pre-ai-aggressive]", { phase, ...data });
}

async function meanRgbFromRing(
  input: Buffer,
  box: MaskRegionPixels,
  imageWidth: number,
  imageHeight: number
): Promise<{ r: number; g: number; b: number }> {
  const ring = Math.max(3, Math.round(Math.min(box.width, box.height) * 0.08));
  const samples: Array<{ r: number; g: number; b: number }> = [];

  const strips: Array<{ left: number; top: number; width: number; height: number }> = [];
  const left = Math.max(0, box.left - ring);
  const top = Math.max(0, box.top - ring);
  const right = Math.min(imageWidth, box.left + box.width + ring);
  const bottom = Math.min(imageHeight, box.top + box.height + ring);

  if (box.top - top > 0) {
    strips.push({ left, top, width: right - left, height: box.top - top });
  }
  if (bottom - (box.top + box.height) > 0) {
    strips.push({
      left,
      top: box.top + box.height,
      width: right - left,
      height: bottom - (box.top + box.height),
    });
  }
  if (box.left - left > 0) {
    strips.push({
      left,
      top: box.top,
      width: box.left - left,
      height: box.height,
    });
  }
  if (right - (box.left + box.width) > 0) {
    strips.push({
      left: box.left + box.width,
      top: box.top,
      width: right - (box.left + box.width),
      height: box.height,
    });
  }

  for (const strip of strips) {
    if (strip.width < 2 || strip.height < 2) {
      continue;
    }
    try {
      const { data, info } = await sharp(input)
        .extract(strip)
        .resize(4, 4, { fit: "fill" })
        .raw()
        .toBuffer({ resolveWithObject: true });
      const channels = info.channels ?? 3;
      let r = 0;
      let g = 0;
      let b = 0;
      const pixels = data.length / channels;
      for (let i = 0; i < data.length; i += channels) {
        r += data[i] ?? 128;
        g += data[i + 1] ?? 128;
        b += data[i + 2] ?? 128;
      }
      samples.push({
        r: Math.round(r / pixels),
        g: Math.round(g / pixels),
        b: Math.round(b / pixels),
      });
    } catch {
      // skip invalid strip
    }
  }

  if (samples.length === 0) {
    return { r: 128, g: 128, b: 128 };
  }
  const sum = samples.reduce(
    (acc, s) => ({ r: acc.r + s.r, g: acc.g + s.g, b: acc.b + s.b }),
    { r: 0, g: 0, b: 0 }
  );
  return {
    r: Math.round(sum.r / samples.length),
    g: Math.round(sum.g / samples.length),
    b: Math.round(sum.b / samples.length),
  };
}

/**
 * Aggressive typography removal: no blurred letters — fill with surrounding texture color + light noise.
 */
export async function neutralizeTextRegionAggressive(
  input: Buffer,
  box: MaskRegionPixels,
  imageWidth: number,
  imageHeight: number
): Promise<Buffer> {
  const fill = await meanRgbFromRing(input, box, imageWidth, imageHeight);
  const pw = Math.max(2, box.width);
  const ph = Math.max(2, box.height);

  const base = await sharp({
    create: {
      width: pw,
      height: ph,
      channels: 3,
      background: fill,
    },
  })
    .png()
    .toBuffer();

  const grain = await sharp({
    create: {
      width: pw,
      height: ph,
      channels: 3,
      background: {
        r: Math.min(255, fill.r + 6),
        g: Math.min(255, fill.g + 6),
        b: Math.min(255, fill.b + 6),
      },
    },
  })
    .blur(1.2)
    .linear(0.35, 0)
    .toBuffer();

  const filled = await sharp(base)
    .composite([{ input: grain, blend: "overlay" }])
    .modulate({ saturation: 0.55, brightness: 1.02 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  logAggressiveNeutralize("region-filled", {
    left: box.left,
    top: box.top,
    width: pw,
    height: ph,
  });

  return sharp(input)
    .composite([{ input: filled, left: box.left, top: box.top }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

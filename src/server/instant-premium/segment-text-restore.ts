/**
 * Post-Vidu segment restore — reproject frozen text patches from source poster (hard text lock).
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  normalizeMaskRegion,
  normalizeMaskRegionNormalized,
} from "@/lib/baked-text-protection";
import type { LockedTextRegion } from "@/lib/hard-text-lock";
import { MAX_LOCKED_TEXT_REGIONS } from "@/lib/hard-text-lock";
import { runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

const PATCH_PADDING_RATIO = 0.06;
const MIN_PATCH_PX = 8;

async function extractFeatheredPatch(params: {
  sourceImagePath: string;
  region: LockedTextRegion;
  outPath: string;
  imageWidth: number;
  imageHeight: number;
}): Promise<boolean> {
  const normalized = normalizeMaskRegionNormalized(params.region.bbox);
  if (!normalized) {
    return false;
  }
  const box = normalizeMaskRegion(normalized, params.imageWidth, params.imageHeight);
  if (!box) {
    return false;
  }
  const padX = Math.max(2, Math.round(box.width * PATCH_PADDING_RATIO));
  const padY = Math.max(2, Math.round(box.height * PATCH_PADDING_RATIO));
  const left = Math.max(0, box.left - padX);
  const top = Math.max(0, box.top - padY);
  const right = Math.min(params.imageWidth, box.left + box.width + padX);
  const bottom = Math.min(params.imageHeight, box.top + box.height + padY);
  const width = Math.max(MIN_PATCH_PX, right - left);
  const height = Math.max(MIN_PATCH_PX, bottom - top);

  const raw = await sharp(params.sourceImagePath)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .png()
    .toBuffer();

  const feathered = await sharp(raw)
    .resize(width, height)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${width}" height="${height}"><rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="4" ry="4" fill="white"/></svg>`
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  await fs.writeFile(params.outPath, feathered);
  return true;
}

/**
 * Overlay source text patches on a segment video (static position, full duration).
 */
export async function applyLockedTextRegionsToVideo(params: {
  ffmpeg: string;
  videoPath: string;
  outputPath: string;
  sourceImagePath: string;
  regions: LockedTextRegion[];
  workDir: string;
  segmentIndex?: number;
}): Promise<{ applied: number; skipped: number }> {
  const regions = params.regions.slice(0, MAX_LOCKED_TEXT_REGIONS);
  if (regions.length === 0) {
    await fs.copyFile(params.videoPath, params.outputPath);
    return { applied: 0, skipped: 0 };
  }

  const meta = await sharp(params.sourceImagePath).metadata();
  const imageWidth = Math.max(1, meta.width ?? 720);
  const imageHeight = Math.max(1, meta.height ?? 1280);

  const patchPaths: string[] = [];
  const overlays: { patchPath: string; x: number; y: number }[] = [];
  let skipped = 0;

  for (let i = 0; i < regions.length; i += 1) {
    const region = regions[i]!;
    const patchPath = path.join(params.workDir, `text-lock-patch-${params.segmentIndex ?? 0}-${i}.png`);
    const ok = await extractFeatheredPatch({
      sourceImagePath: params.sourceImagePath,
      region,
      outPath: patchPath,
      imageWidth,
      imageHeight,
    });
    if (!ok) {
      skipped += 1;
      continue;
    }
    const normalized = normalizeMaskRegionNormalized(region.bbox);
    const box = normalized ? normalizeMaskRegion(normalized, imageWidth, imageHeight) : null;
    if (!box) {
      skipped += 1;
      continue;
    }
    patchPaths.push(patchPath);
    overlays.push({ patchPath, x: box.left, y: box.top });
  }

  if (overlays.length === 0) {
    await fs.copyFile(params.videoPath, params.outputPath);
    return { applied: 0, skipped };
  }

  const inputArgs = ["-y", "-i", params.videoPath];
  for (const o of overlays) {
    inputArgs.push("-i", o.patchPath);
  }

  let filterComplex: string;
  if (overlays.length === 1) {
    const o = overlays[0]!;
    filterComplex = `[0:v][1:v]overlay=x=${o.x}:y=${o.y}:format=auto[outv]`;
  } else {
    const parts: string[] = [];
    parts.push(
      `[0:v][1:v]overlay=x=${overlays[0]!.x}:y=${overlays[0]!.y}:format=auto[v1]`
    );
    for (let i = 1; i < overlays.length - 1; i += 1) {
      const o = overlays[i]!;
      parts.push(`[v${i}][${i + 1}:v]overlay=x=${o.x}:y=${o.y}:format=auto[v${i + 1}]`);
    }
    const last = overlays.length - 1;
    const o = overlays[last]!;
    parts.push(`[v${last}][${last + 1}:v]overlay=x=${o.x}:y=${o.y}:format=auto[outv]`);
    filterComplex = parts.join(";");
  }
  const args = [
    ...inputArgs,
    "-filter_complex",
    filterComplex,
    "-map",
    "[outv]",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-an",
    params.outputPath,
  ];

  const result = await runFfmpegCapture(params.ffmpeg, args);
  if (result.code !== 0) {
    console.warn("[text-lock-restore]", {
      segmentIndex: params.segmentIndex,
      phase: "overlay_failed",
      tail: result.output.slice(-400),
    });
    await fs.copyFile(params.videoPath, params.outputPath);
    return { applied: 0, skipped: regions.length };
  }

  console.info("[text-lock-restore]", {
    segmentIndex: params.segmentIndex,
    phase: "applied",
    applied: overlays.length,
    skipped,
  });

  return { applied: overlays.length, skipped };
}

/**
 * Sprint G — segment-level brand lock enforcement (warp + sharp overlay → FFmpeg).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fetchSourceImageBuffer } from "@/lib/openai-image-generation";
import { applyBrandAssetPostComposite } from "@/lib/brand-asset-post-composite";
import { buildPostCompositeOverlayPlansFromBrandLockedAssets } from "@/lib/brand-asset-post-composite-plan";
import {
  resolveKeyframeBrandAssetsForFrame,
  resolveMotionKeyframeBrandAssets,
} from "@/lib/motion-keyframe-brand-baking";
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
} from "@/lib/media-export-constants";
import { getResolvedFfmpegPathSync } from "@/lib/ffmpeg/resolve-ffmpeg-binaries";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";
import type { MotionKeyframeBrandAsset } from "@/types/brand-asset-protection";

export async function buildTransparentBrandOverlayPng(input: {
  width: number;
  height: number;
  assets: MotionKeyframeBrandAsset[];
}): Promise<Buffer | null> {
  if (!input.assets.length) {
    return null;
  }

  const sharp = (await import("sharp")).default;
  const transparent = await sharp({
    create: {
      width: input.width,
      height: input.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  const plans = buildPostCompositeOverlayPlansFromBrandLockedAssets({
    assets: input.assets,
    sourceImageWidth: input.width,
    sourceImageHeight: input.height,
  });
  if (!plans.length) {
    return null;
  }

  const composite = await applyBrandAssetPostComposite({
    renderBuffer: transparent,
    plans,
    sourceImageWidth: input.width,
    sourceImageHeight: input.height,
  });

  return composite.applied ? composite.buffer : null;
}

export async function enforceBrandLockOnSegmentVideo(input: {
  segmentVideoPath: string;
  outputVideoPath: string;
  brandLockedAssets: BrandLockedAsset[];
  segmentIndex: number;
  referenceFrameBuffer: Buffer;
  width: number;
  height: number;
}): Promise<{ applied: boolean; warnings: string[] }> {
  const keyframeAssets = resolveMotionKeyframeBrandAssets(input.brandLockedAssets);
  const frameAssets = resolveKeyframeBrandAssetsForFrame(keyframeAssets, {
    segmentIndex: input.segmentIndex,
    keyframeRole: "middle",
  });
  if (!frameAssets.length) {
    return { applied: false, warnings: ["no_keyframe_assets_for_segment"] };
  }

  const overlay = await buildTransparentBrandOverlayPng({
    width: input.width,
    height: input.height,
    assets: frameAssets,
  });
  if (!overlay) {
    return { applied: false, warnings: ["overlay_generation_failed"] };
  }

  const workDir = path.dirname(input.outputVideoPath);
  const overlayPath = path.join(workDir, `brand-lock-overlay-${input.segmentIndex}.png`);
  await fs.writeFile(overlayPath, overlay);

  const ffmpeg = await resolveFfmpegForTextOverlay();
  const audioArgs = FINAL_MERGE_DISABLE_AUDIO ? ["-an"] : ["-c:a", "copy"];
  const result = await runFfmpegCapture(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      input.segmentVideoPath,
      "-i",
      overlayPath,
      "-filter_complex",
      "[0:v][1:v]overlay=0:0:format=auto",
      "-c:v",
      "libx264",
      "-preset",
      FINAL_MERGE_VIDEO_PRESET,
      "-crf",
      String(FINAL_MERGE_VIDEO_CRF),
      ...audioArgs,
      "-y",
      input.outputVideoPath,
    ],
    { timeoutMs: 10 * 60 * 1000 }
  );

  if (result.code !== 0) {
    return {
      applied: false,
      warnings: [result.output?.slice(-400) ?? "ffmpeg_overlay_failed"],
    };
  }

  return { applied: true, warnings: [] };
}

export async function prepareLogoReferenceGrayscale(
  assetUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer> {
  const source = await fetchSourceImageBuffer(assetUrl);
  const sharp = (await import("sharp")).default;
  return sharp(source.buffer)
    .resize(targetWidth, targetHeight, { fit: "inside" })
    .greyscale()
    .raw()
    .toBuffer();
}

export function ffmpegBinaryForMotionLock(): string {
  return getResolvedFfmpegPathSync();
}

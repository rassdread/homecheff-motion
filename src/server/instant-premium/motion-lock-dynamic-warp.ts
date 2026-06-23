/**
 * Sprint I — per-sample dynamic perspective warp enforcement.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fetchSourceImageBuffer } from "@/lib/openai-image-generation";
import { normalizedQuadToPixelQuad } from "@/lib/brand-asset-quad-generator";
import { warpLogoBufferToQuad } from "@/lib/brand-asset-perspective-warp";
import { MOTION_LOCK_SAMPLE_POINTS } from "@/lib/motion-lock-dense-sampling";
import {
  buildMotionTrackingResult,
  listTrackableAssets,
  resolveKeyframeQuadsForAsset,
  resolveSegmentTrackingMode,
} from "@/lib/motion-lock-quad-tracking";
import {
  resolveKeyframeBrandAssetsForFrame,
  resolveMotionKeyframeBrandAssets,
} from "@/lib/motion-keyframe-brand-baking";
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
} from "@/lib/media-export-constants";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import { buildTransparentBrandOverlayPng } from "@/server/instant-premium/motion-lock-enforcement";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";
import type { MotionLockSegmentTrackingReport } from "@/types/motion-lock-tracking";

export type DynamicSampleOverlay = {
  progress: number;
  zoneIndex: number;
  buffer: Buffer;
};

export async function buildDynamicSampleOverlay(input: {
  width: number;
  height: number;
  progress: number;
  brandLockedAssets: BrandLockedAsset[];
  workflowType?: string;
}): Promise<{ buffer: Buffer | null; warpCount: number; perspectiveWarpApplied: boolean }> {
  const trackable = listTrackableAssets(input.brandLockedAssets, input.workflowType);
  if (!trackable.length) {
    return { buffer: null, warpCount: 0, perspectiveWarpApplied: false };
  }

  const sharp = (await import("sharp")).default;
  let canvas = await sharp({
    create: {
      width: input.width,
      height: input.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  let warpCount = 0;
  let perspectiveWarpApplied = false;

  for (const asset of trackable) {
    const keyframes = resolveKeyframeQuadsForAsset(input.brandLockedAssets, asset.assetId);
    if (!keyframes) {
      continue;
    }

    const tracked = buildMotionTrackingResult({
      startQuad: keyframes.startQuad,
      midQuad: keyframes.midQuad,
      endQuad: keyframes.endQuad,
      samplePoints: [input.progress],
    });
    const predictedQuad = tracked.quads[0]?.quad;
    if (!predictedQuad) {
      continue;
    }

    const logo = await fetchSourceImageBuffer(asset.assetUrl);
    const pixelQuad = normalizedQuadToPixelQuad(predictedQuad, input.width, input.height);
    const warped = await warpLogoBufferToQuad({
      logoBuffer: logo.buffer,
      pixelQuad,
      canvasWidth: input.width,
      canvasHeight: input.height,
    });

    if (!warped.applied) {
      continue;
    }

    perspectiveWarpApplied = true;
    warpCount += 1;

    canvas = await sharp(canvas)
      .composite([{ input: warped.buffer, blend: "over" }])
      .png()
      .toBuffer();
  }

  return {
    buffer: perspectiveWarpApplied ? canvas : null,
    warpCount,
    perspectiveWarpApplied,
  };
}

export async function buildDynamicZoneOverlays(input: {
  width: number;
  height: number;
  brandLockedAssets: BrandLockedAsset[];
  workflowType?: string;
}): Promise<DynamicSampleOverlay[]> {
  const overlays: DynamicSampleOverlay[] = [];

  for (let zoneIndex = 0; zoneIndex < MOTION_LOCK_SAMPLE_POINTS.length; zoneIndex += 1) {
    const progress = MOTION_LOCK_SAMPLE_POINTS[zoneIndex]!;
    const sample = await buildDynamicSampleOverlay({
      width: input.width,
      height: input.height,
      progress,
      brandLockedAssets: input.brandLockedAssets,
      workflowType: input.workflowType,
    });
    if (sample.buffer) {
      overlays.push({ progress, zoneIndex, buffer: sample.buffer });
    }
  }

  return overlays;
}

function buildTimedOverlayFilter(overlayCount: number, durationSec: number): string {
  const zoneDuration = durationSec / overlayCount;
  const parts: string[] = [];
  let current = "0:v";

  for (let i = 0; i < overlayCount; i += 1) {
    const t0 = (i * zoneDuration).toFixed(4);
    const t1 = (i === overlayCount - 1 ? durationSec : (i + 1) * zoneDuration).toFixed(4);
    const out = i === overlayCount - 1 ? "vout" : `vz${i}`;
    parts.push(
      `[${current}][${i + 1}:v]overlay=0:0:enable='between(t,${t0},${t1})'[${out}]`
    );
    current = out;
  }

  return parts.join(";");
}

export async function enforceBrandLockOnSegmentVideoDynamic(input: {
  segmentVideoPath: string;
  outputVideoPath: string;
  brandLockedAssets: BrandLockedAsset[];
  segmentIndex: number;
  width: number;
  height: number;
  durationSec: number;
  workflowType?: string;
}): Promise<{
  applied: boolean;
  warnings: string[];
  tracking: MotionLockSegmentTrackingReport;
}> {
  const trackingMode = resolveSegmentTrackingMode(input.brandLockedAssets, input.workflowType);
  const trackable = listTrackableAssets(input.brandLockedAssets, input.workflowType);

  if (trackingMode !== "quad_interpolation" || trackable.length === 0) {
    return {
      applied: false,
      warnings: ["dynamic_tracking_not_applicable"],
      tracking: {
        trackingMode: "static",
        trackedSamples: 0,
        perspectiveWarpApplied: false,
        enforcementApplied: false,
        dynamicWarpCount: 0,
        trackedAssetIds: [],
      },
    };
  }

  const zoneOverlays = await buildDynamicZoneOverlays({
    width: input.width,
    height: input.height,
    brandLockedAssets: input.brandLockedAssets,
    workflowType: input.workflowType,
  });

  if (zoneOverlays.length === 0) {
    return {
      applied: false,
      warnings: ["dynamic_overlay_generation_failed"],
      tracking: {
        trackingMode,
        trackedSamples: MOTION_LOCK_SAMPLE_POINTS.length,
        perspectiveWarpApplied: false,
        enforcementApplied: false,
        dynamicWarpCount: 0,
        trackedAssetIds: trackable.map((asset) => asset.assetId),
      },
    };
  }

  const workDir = path.dirname(input.outputVideoPath);
  const overlayPaths: string[] = [];
  let dynamicWarpCount = 0;

  for (const zone of zoneOverlays) {
    const overlayPath = path.join(
      workDir,
      `brand-lock-zone-${input.segmentIndex}-${zone.zoneIndex}.png`
    );
    await fs.writeFile(overlayPath, zone.buffer);
    overlayPaths.push(overlayPath);
    dynamicWarpCount += trackable.length;
  }

  const ffmpeg = await resolveFfmpegForTextOverlay();
  const audioArgs = FINAL_MERGE_DISABLE_AUDIO ? ["-an"] : ["-c:a", "copy"];
  const filter = buildTimedOverlayFilter(overlayPaths.length, input.durationSec);
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    input.segmentVideoPath,
    ...overlayPaths.flatMap((overlayPath) => ["-i", overlayPath]),
    "-filter_complex",
    filter,
    "-map",
    "[vout]",
    "-c:v",
    "libx264",
    "-preset",
    FINAL_MERGE_VIDEO_PRESET,
    "-crf",
    String(FINAL_MERGE_VIDEO_CRF),
    ...audioArgs,
    "-y",
    input.outputVideoPath,
  ];

  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 10 * 60 * 1000 });

  if (result.code !== 0) {
    return {
      applied: false,
      warnings: [result.output?.slice(-400) ?? "ffmpeg_dynamic_overlay_failed"],
      tracking: {
        trackingMode,
        trackedSamples: MOTION_LOCK_SAMPLE_POINTS.length,
        perspectiveWarpApplied: true,
        enforcementApplied: false,
        dynamicWarpCount,
        trackedAssetIds: trackable.map((asset) => asset.assetId),
      },
    };
  }

  return {
    applied: true,
    warnings: [],
    tracking: {
      trackingMode,
      trackedSamples: MOTION_LOCK_SAMPLE_POINTS.length,
      perspectiveWarpApplied: true,
      enforcementApplied: true,
      dynamicWarpCount,
      trackedAssetIds: trackable.map((asset) => asset.assetId),
    },
  };
}

export async function enforceBrandLockOnSegmentVideoSmart(input: {
  segmentVideoPath: string;
  outputVideoPath: string;
  brandLockedAssets: BrandLockedAsset[];
  segmentIndex: number;
  referenceFrameBuffer: Buffer;
  width: number;
  height: number;
  durationSec: number;
  workflowType?: string;
}): Promise<{
  applied: boolean;
  warnings: string[];
  tracking: MotionLockSegmentTrackingReport;
}> {
  const trackingMode = resolveSegmentTrackingMode(input.brandLockedAssets, input.workflowType);

  if (trackingMode === "quad_interpolation") {
    return enforceBrandLockOnSegmentVideoDynamic({
      segmentVideoPath: input.segmentVideoPath,
      outputVideoPath: input.outputVideoPath,
      brandLockedAssets: input.brandLockedAssets,
      segmentIndex: input.segmentIndex,
      width: input.width,
      height: input.height,
      durationSec: input.durationSec,
      workflowType: input.workflowType,
    });
  }

  const keyframeAssets = resolveMotionKeyframeBrandAssets(input.brandLockedAssets);
  const frameAssets = resolveKeyframeBrandAssetsForFrame(keyframeAssets, {
    segmentIndex: input.segmentIndex,
    keyframeRole: "middle",
  });

  const overlay = await buildTransparentBrandOverlayPng({
    width: input.width,
    height: input.height,
    assets: frameAssets,
  });

  if (!overlay) {
    return {
      applied: false,
      warnings: ["static_overlay_generation_failed"],
      tracking: {
        trackingMode: "static",
        trackedSamples: 0,
        perspectiveWarpApplied: false,
        enforcementApplied: false,
        dynamicWarpCount: 0,
        trackedAssetIds: [],
      },
    };
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
      warnings: [result.output?.slice(-400) ?? "ffmpeg_static_overlay_failed"],
      tracking: {
        trackingMode: "static",
        trackedSamples: 0,
        perspectiveWarpApplied: false,
        enforcementApplied: false,
        dynamicWarpCount: 0,
        trackedAssetIds: [],
      },
    };
  }

  return {
    applied: true,
    warnings: [],
    tracking: {
      trackingMode: "static",
      trackedSamples: 0,
      perspectiveWarpApplied: true,
      enforcementApplied: true,
      dynamicWarpCount: 0,
      trackedAssetIds: frameAssets.map((asset) => asset.assetId),
    },
  };
}

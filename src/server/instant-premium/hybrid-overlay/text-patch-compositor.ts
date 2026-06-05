import fs from "node:fs/promises";
import path from "node:path";
import {
  collectProjectTextPatches,
  type OverlayStyle,
  type TextPatch,
  type TextRenderMode,
  type TextTrackingMode,
} from "@/lib/hybrid-motion-overlay";
import { resolveInstantVideoDimensions } from "@/lib/locked-text-layer";
import {
  resolveFfmpegForTextOverlay,
  runFfmpegCapture,
} from "@/lib/video-ffmpeg-capability";
import { applyHybridMotionOverlay } from "@/server/instant-premium/hybrid-overlay/motion-overlay-compositor";
import { applyLockedTextOverlay } from "@/server/instant-premium/locked-text-overlay";
import type { LockedTextLayer } from "@/lib/locked-text-layer";
import { buildMultiSampleAvoidZonePlan } from "@/server/animation-export/multi-sample-avoid-zones";
import { isPatchBboxUnsafe } from "@/server/animation-export/multi-image-text-safety";
import type { TextAvoidZonePlan } from "@/types/text-avoid-zone";
import { estimateVideoMotionProfile } from "@/server/instant-premium/hybrid-overlay/tracking-engine";
import { trackPatchAffineAtTime } from "@/server/instant-premium/hybrid-overlay/text-patch-track";

function logTextComposite(phase: string, data: Record<string, unknown>): void {
  console.info("[text-composite]", { phase, ...data });
}

function logTextFallback(data: Record<string, unknown>): void {
  console.info("[text-fallback]", data);
}

function logTextFailed(data: Record<string, unknown>): void {
  console.error("[text-failed]", data);
}

function overlayExprForPatch(
  patch: TextPatch,
  videoWidth: number,
  videoHeight: number,
  durationSec: number,
  overlayStyle: OverlayStyle,
  freeze: boolean
): { x: string; y: string; w: string; h: string; rotate: string } {
  const baseW = Math.max(8, Math.round(patch.bbox.width * videoWidth));
  const baseH = Math.max(8, Math.round(patch.bbox.height * videoHeight));
  const x0 = patch.bbox.x * videoWidth;
  const y0 = patch.bbox.y * videoHeight;

  if (freeze) {
    return {
      x: String(Math.round(x0)),
      y: String(Math.round(y0)),
      w: String(baseW),
      h: String(baseH),
      rotate: "0",
    };
  }

  const amp = overlayStyle === "cinematic" ? 0.012 : 0.008;
  const freq = overlayStyle === "kinetic" ? 1.35 : 0.9;
  const x = `${Math.round(x0)}+${Math.round(videoWidth * amp)}*sin(2*PI*${freq}*t/${Math.max(1, durationSec)})`;
  const y = `${Math.round(y0)}+${Math.round(videoHeight * amp * 0.65)}*cos(2*PI*${freq}*0.7*t/${Math.max(1, durationSec)})`;
  const w = `${baseW}*(1+${amp * 0.5}*sin(2*PI*${freq}*0.5*t/${Math.max(1, durationSec)}))`;
  const h = `${baseH}*(1+${amp * 0.4}*cos(2*PI*${freq}*0.6*t/${Math.max(1, durationSec)}))`;
  const rotate =
    overlayStyle === "kinetic"
      ? `${amp * 12}*sin(2*PI*t/${Math.max(1, durationSec)})`
      : `${amp * 4}*sin(2*PI*0.8*t/${Math.max(1, durationSec)})`;

  return { x, y, w, h, rotate };
}

async function downloadPatchToWorkdir(
  patch: TextPatch,
  workDir: string,
  index: number
): Promise<string> {
  const res = await fetch(patch.patchUrl, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`Failed to download text patch ${patch.id} (${res.status}).`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const localPath = path.join(workDir, `patch-${index}-${patch.id}.png`);
  await fs.writeFile(localPath, buffer);
  return localPath;
}

async function compositePatchesWithFfmpeg(params: {
  projectId: string;
  inputVideoPath: string;
  outputVideoPath: string;
  patchPaths: string[];
  patches: TextPatch[];
  videoWidth: number;
  videoHeight: number;
  durationSec: number;
  overlayStyle: OverlayStyle;
  freeze: boolean;
}): Promise<void> {
  const { inputVideoPath, outputVideoPath, patchPaths, patches, videoWidth, videoHeight, durationSec } =
    params;
  const freeze = params.freeze;

  const inputs = [path.resolve(inputVideoPath), ...patchPaths.map((p) => path.resolve(p))];
  const filterParts: string[] = [];
  let lastLabel = "0:v";

  for (let i = 0; i < patches.length; i += 1) {
    const patch = patches[i];
    const inputIndex = i + 1;
    const expr = overlayExprForPatch(patch, videoWidth, videoHeight, durationSec, params.overlayStyle, freeze);
    const patchLabel = `p${i}`;
    const outLabel = i === patches.length - 1 ? "vout" : `v${i}`;

    filterParts.push(
      `[${inputIndex}:v]scale=${expr.w}:${expr.h}:flags=lanczos,format=rgba,rotate=${expr.rotate}*PI/180:c=none:ow=iw:oh=ih[${patchLabel}]`,
      `[${lastLabel}][${patchLabel}]overlay=${expr.x}:${expr.y}:format=auto:shortest=1[${outLabel}]`
    );
    lastLabel = outLabel;
  }

  if (filterParts.length === 0) {
    await fs.copyFile(inputVideoPath, outputVideoPath);
    return;
  }

  const filterComplex = filterParts.join(";");
  const binary = await resolveFfmpegForTextOverlay();
  const args = [
    "-y",
    ...inputs.flatMap((p) => ["-i", p]),
    "-filter_complex",
    filterComplex,
    "-map",
    `[${lastLabel}]`,
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    path.resolve(outputVideoPath),
  ];

  logTextComposite("ffmpeg-start", {
    projectId: params.projectId,
    patchCount: patches.length,
    filterLength: filterComplex.length,
  });

  const result = await runFfmpegCapture(binary, args, { timeoutMs: 15 * 60 * 1000 });
  if (result.code !== 0) {
    throw new Error(`Text patch compositing failed: ${result.output.trim().slice(-2500)}`);
  }
}

export type ApplyPixelPreservedTextInput = {
  projectId: string;
  inputVideoPath: string;
  outputVideoPath: string;
  patches: TextPatch[];
  aspectRatio: string | null | undefined;
  viduResolution: string | null | undefined;
  totalDurationMs: number;
  segmentCount: number;
  segmentDurationSec: number;
  overlayStyle: OverlayStyle;
  textRenderMode: TextRenderMode;
  /** Fallback drawtext layers when patch warp fails */
  lockedLayers: LockedTextLayer[];
};

/** DeeVid-style: warp original text PNG patches onto AI video (pixel preserved). */
export async function applyPixelPreservedTextMotion(
  input: ApplyPixelPreservedTextInput
): Promise<{ trackingMode: TextTrackingMode; fallbackReason?: string }> {
  const patches = input.patches.filter((p) => p.patchUrl?.trim());
  if (patches.length === 0) {
    throw new Error("No text patches available for pixel-preserved compositing.");
  }

  const { width, height } = resolveInstantVideoDimensions(input.aspectRatio, input.viduResolution);
  const durationSec = input.totalDurationMs / 1000;
  const freeze = input.textRenderMode === "exact_freeze";
  const workDir = path.join(path.dirname(input.inputVideoPath), "text-patches-work");
  await fs.mkdir(workDir, { recursive: true });

  let subjectAvoidPlan: TextAvoidZonePlan | undefined;
  try {
    subjectAvoidPlan = await buildMultiSampleAvoidZonePlan({
      videoPath: input.inputVideoPath,
      durationSec,
      aspectRatio: input.aspectRatio,
      enableVision: true,
    });
  } catch {
    subjectAvoidPlan = await buildMultiSampleAvoidZonePlan({
      videoPath: input.inputVideoPath,
      durationSec,
      aspectRatio: input.aspectRatio,
      enableVision: false,
    });
  }

  const unsafePatch = subjectAvoidPlan
    ? patches.some((p) => isPatchBboxUnsafe(p.bbox, subjectAvoidPlan!.zones))
    : false;

  if (unsafePatch) {
    logTextFallback({
      projectId: input.projectId,
      reason: "patch_bbox_subject_unsafe",
      fallback: "locked_drawtext_subject_safe",
    });
    await applyLockedTextOverlay({
      inputVideoPath: input.inputVideoPath,
      outputVideoPath: input.outputVideoPath,
      layers: input.lockedLayers,
      aspectRatio: input.aspectRatio,
      viduResolution: input.viduResolution,
      totalDurationMs: input.totalDurationMs,
      subjectAvoidPlan,
    });
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    return { trackingMode: "static", fallbackReason: "patch_subject_unsafe" };
  }

  logTextComposite("start", {
    projectId: input.projectId,
    patchCount: patches.length,
    segmentCount: input.segmentCount,
  });

  const profile = await estimateVideoMotionProfile({
    durationSec,
    segmentCount: input.segmentCount,
    segmentDurationSec: input.segmentDurationSec,
    overlayStyle: input.overlayStyle,
    projectId: input.projectId,
  });

  for (let fi = 0; fi < Math.min(3, patches.length); fi += 1) {
    trackPatchAffineAtTime({
      patch: patches[fi],
      timeSec: 0,
      durationSec,
      profile,
      overlayStyle: input.overlayStyle,
      frameIndex: 0,
      freeze,
    });
  }

  const attempts: Array<{ label: string; run: () => Promise<void> }> = [
    {
      label: "homography",
      run: async () => {
        const paths = await Promise.all(
          patches.map((p, i) => downloadPatchToWorkdir(p, workDir, i))
        );
        await compositePatchesWithFfmpeg({
          projectId: input.projectId,
          inputVideoPath: input.inputVideoPath,
          outputVideoPath: input.outputVideoPath,
          patchPaths: paths,
          patches,
          videoWidth: width,
          videoHeight: height,
          durationSec,
          overlayStyle: input.overlayStyle,
          freeze,
        });
      },
    },
    {
      label: "affine",
      run: async () => {
        const paths = await Promise.all(
          patches.map((p, i) => downloadPatchToWorkdir(p, workDir, i))
        );
        await compositePatchesWithFfmpeg({
          projectId: input.projectId,
          inputVideoPath: input.inputVideoPath,
          outputVideoPath: input.outputVideoPath,
          patchPaths: paths,
          patches: patches.map((p) => ({ ...p, bbox: { ...p.bbox, x: p.bbox.x + 0.002 } })),
          videoWidth: width,
          videoHeight: height,
          durationSec,
          overlayStyle: input.overlayStyle,
          freeze,
        });
      },
    },
    {
      label: "static",
      run: async () => {
        await applyLockedTextOverlay({
          inputVideoPath: input.inputVideoPath,
          outputVideoPath: input.outputVideoPath,
          layers: input.lockedLayers,
          aspectRatio: input.aspectRatio,
          viduResolution: input.viduResolution,
          totalDurationMs: input.totalDurationMs,
          subjectAvoidPlan,
        });
      },
    },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      await attempt.run();
      logTextComposite("completed", {
        projectId: input.projectId,
        trackingMode: attempt.label,
      });
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
      return {
        trackingMode: attempt.label as TextTrackingMode,
        fallbackReason: attempt.label !== "homography" ? `used_${attempt.label}` : undefined,
      };
    } catch (error) {
      lastError = error;
      logTextFallback({
        projectId: input.projectId,
        trackingMode: attempt.label,
        fallbackReason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logTextFailed({
    projectId: input.projectId,
    message: lastError instanceof Error ? lastError.message : "Pixel-preserved compositing failed.",
  });
  throw lastError instanceof Error ? lastError : new Error("Pixel-preserved compositing failed.");
}

export type ProjectImageRow = {
  order: number;
  instantTextPatches?: unknown;
};

export async function applyBestTextOverlayForProject(params: {
  projectId: string;
  inputVideoPath: string;
  outputVideoPath: string;
  images: ProjectImageRow[];
  aspectRatio: string | null | undefined;
  viduResolution: string | null | undefined;
  totalDurationMs: number;
  segmentCount: number;
  segmentDurationSec: number;
  overlayStyle: OverlayStyle;
  textRenderMode: TextRenderMode;
  lockedLayers: LockedTextLayer[];
}): Promise<{ method: string; trackingMode?: string }> {
  const patches = collectProjectTextPatches(params.images);

  if (
    (params.textRenderMode === "hybrid_overlay" || params.textRenderMode === "deevid_text_safe") &&
    patches.length > 0
  ) {
    try {
      const result = await applyPixelPreservedTextMotion({
        projectId: params.projectId,
        inputVideoPath: params.inputVideoPath,
        outputVideoPath: params.outputVideoPath,
        patches,
        aspectRatio: params.aspectRatio,
        viduResolution: params.viduResolution,
        totalDurationMs: params.totalDurationMs,
        segmentCount: params.segmentCount,
        segmentDurationSec: params.segmentDurationSec,
        overlayStyle: params.overlayStyle,
        textRenderMode: params.textRenderMode,
        lockedLayers: params.lockedLayers,
      });
      return { method: "pixel_preserved", trackingMode: result.trackingMode };
    } catch (error) {
      logTextFallback({
        projectId: params.projectId,
        reason: "pixel_preserved_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (
    params.textRenderMode === "deevid_text_safe" ||
    params.textRenderMode === "hybrid_overlay" ||
    params.textRenderMode === "exact_freeze"
  ) {
    await applyHybridMotionOverlay({
      projectId: params.projectId,
      inputVideoPath: params.inputVideoPath,
      outputVideoPath: params.outputVideoPath,
      layers: params.lockedLayers,
      aspectRatio: params.aspectRatio,
      viduResolution: params.viduResolution,
      totalDurationMs: params.totalDurationMs,
      segmentCount: params.segmentCount,
      segmentDurationSec: params.segmentDurationSec,
      overlayStyle: params.overlayStyle,
      textRenderMode: params.textRenderMode,
    });
    return { method: "hybrid_drawtext" };
  }

  let subjectAvoidPlan: TextAvoidZonePlan | undefined;
  try {
    subjectAvoidPlan = await buildMultiSampleAvoidZonePlan({
      videoPath: params.inputVideoPath,
      durationSec: params.totalDurationMs / 1000,
      aspectRatio: params.aspectRatio,
      enableVision: true,
    });
  } catch {
    subjectAvoidPlan = undefined;
  }

  await applyLockedTextOverlay({
    inputVideoPath: params.inputVideoPath,
    outputVideoPath: params.outputVideoPath,
    layers: params.lockedLayers,
    aspectRatio: params.aspectRatio,
    viduResolution: params.viduResolution,
    totalDurationMs: params.totalDurationMs,
    subjectAvoidPlan,
  });
  return { method: "locked_drawtext" };
}

import path from "node:path";
import fs from "node:fs/promises";
import type { LockedTextLayer } from "@/lib/locked-text-layer";
import { normalizeLockedTextContent, resolveInstantVideoDimensions } from "@/lib/locked-text-layer";
import type { OverlayStyle, TextRenderMode, TrackingMode } from "@/lib/hybrid-motion-overlay";
import {
  resolveConfiguredFontPath,
  resolveFfmpegForTextOverlay,
  runFfmpegCapture,
} from "@/lib/video-ffmpeg-capability";
import { applyLockedTextOverlay } from "@/server/instant-premium/locked-text-overlay";
import {
  estimateVideoMotionProfile,
  motionExprForAxis,
  type VideoMotionProfile,
} from "@/server/instant-premium/hybrid-overlay/tracking-engine";

function logOverlayComposite(phase: string, data: Record<string, unknown>): void {
  console.info("[overlay-composite]", { phase, ...data });
}

function logOverlayFallback(data: Record<string, unknown>): void {
  console.info("[overlay-fallback]", data);
}

function logOverlayFailed(data: Record<string, unknown>): void {
  console.error("[overlay-failed]", data);
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "'\\''")
    .replace(/,/g, "\\,")
    .replace(/%/g, "\\%");
}

function escapeFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:");
}

function hexFontColor(color: string | undefined): string {
  const raw = (color ?? "#FFFFFF").replace("#", "").trim();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `0x${raw}`;
  }
  return "white";
}

function buildHybridDrawtextFilters(
  layers: LockedTextLayer[],
  width: number,
  height: number,
  profile: VideoMotionProfile,
  overlayStyle: OverlayStyle,
  renderMode: TextRenderMode
): string {
  const fontfile = resolveConfiguredFontPath();
  const parts: string[] = [];
  const freeze = renderMode === "exact_freeze";

  for (const layer of layers) {
    const text = normalizeLockedTextContent(layer.text);
    if (!text) continue;

    const fontSize = layer.fontSize ?? 42;
    const fontColor = hexFontColor(layer.color);
    const baseX = layer.x;
    const baseY = layer.y;
    const xExpr =
      freeze
        ? layer.textAlign === "left"
          ? `${Math.round(baseX * width)}`
          : layer.textAlign === "right"
            ? `w-tw-${Math.round((1 - baseX) * width)}`
            : `(w-tw)/2+${Math.round(baseX * width - width / 2)}`
        : layer.textAlign === "left"
          ? `(${motionExprForAxis(baseX, "x", profile, overlayStyle)})*w`
          : layer.textAlign === "right"
            ? `w-tw-(${motionExprForAxis(1 - baseX, "x", profile, overlayStyle)})*w`
            : `(w-tw)/2+(${motionExprForAxis(baseX - 0.5, "x", profile, overlayStyle)})*w`;

    const yBasePx = Math.round(baseY * height);
    const yExpr = freeze
      ? String(yBasePx)
      : `${yBasePx}+(${motionExprForAxis(0, "y", profile, overlayStyle)})*h`;

    const fadeSec = overlayStyle === "cinematic" ? 0.35 : 0.2;
    const alphaExpr =
      overlayStyle === "soft-glow"
        ? `if(lt(t\\,${fadeSec})\\,(t)/${fadeSec}\\,0.92+0.08*sin(2*PI*t/${Math.max(1, profile.durationSec)}))`
        : overlayStyle === "cinematic"
          ? `if(lt(t\\,${fadeSec})\\,(t)/${fadeSec}\\,0.97+0.03*sin(2*PI*0.6*t/${Math.max(1, profile.durationSec)}))`
          : "1";

    const fontPath = escapeFilterPath(fontfile);
    const escapedText = escapeDrawtext(text);
    parts.push(
      [
        `drawtext=fontfile=${fontPath}`,
        `text='${escapedText}'`,
        `fontsize=${fontSize}`,
        `fontcolor=${fontColor}`,
        `alpha='${alphaExpr}'`,
        `x=${xExpr}`,
        `y=${yExpr}`,
        `shadowcolor=black@0.35`,
        `shadowx=1`,
        `shadowy=1`,
        `borderw=1`,
        `bordercolor=black@0.25`,
      ].join(":")
    );
  }

  return parts.join(",");
}

async function runHybridFfmpegOverlay(params: {
  inputVideoPath: string;
  outputVideoPath: string;
  filter: string;
}): Promise<void> {
  const binary = await resolveFfmpegForTextOverlay();
  const args = [
    "-y",
    "-i",
    path.resolve(params.inputVideoPath),
    "-vf",
    params.filter,
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
    path.resolve(params.outputVideoPath),
  ];
  const result = await runFfmpegCapture(binary, args, { timeoutMs: 10 * 60 * 1000 });
  if (result.code !== 0) {
    throw new Error(`Hybrid motion overlay failed: ${result.output.trim().slice(-2500)}`);
  }
}

export type ApplyHybridMotionOverlayInput = {
  projectId: string;
  inputVideoPath: string;
  outputVideoPath: string;
  layers: LockedTextLayer[];
  aspectRatio: string | null | undefined;
  viduResolution: string | null | undefined;
  totalDurationMs: number;
  segmentCount: number;
  segmentDurationSec: number;
  overlayStyle: OverlayStyle;
  textRenderMode: TextRenderMode;
};

/** Hybrid post-AI reprojection with fallback hierarchy. */
export async function applyHybridMotionOverlay(
  input: ApplyHybridMotionOverlayInput
): Promise<{ trackingMode: TrackingMode; fallbackReason?: string }> {
  const active = input.layers.filter((l) => l.locked && l.text.trim());
  if (active.length === 0) {
    await fs.copyFile(input.inputVideoPath, input.outputVideoPath);
    return { trackingMode: "static_overlay" };
  }

  const { width, height } = resolveInstantVideoDimensions(input.aspectRatio, input.viduResolution);

  logOverlayComposite("start", {
    projectId: input.projectId,
    layerCount: active.length,
    overlayStyle: input.overlayStyle,
    textRenderMode: input.textRenderMode,
  });

  let profile: VideoMotionProfile;
  try {
    profile = await estimateVideoMotionProfile({
      durationSec: input.totalDurationMs / 1000,
      segmentCount: input.segmentCount,
      segmentDurationSec: input.segmentDurationSec,
      overlayStyle: input.overlayStyle,
      projectId: input.projectId,
    });
  } catch (error) {
    logOverlayFallback({
      projectId: input.projectId,
      reason: "profile_failed",
      message: error instanceof Error ? error.message : String(error),
      step: "affine_transform",
    });
    profile = {
      durationSec: input.totalDurationMs / 1000,
      fps: 30,
      segments: [],
      trackingMode: "affine_transform",
    };
  }

  const attempts: Array<{ mode: TrackingMode; run: () => Promise<void> }> = [];

  if (input.textRenderMode !== "exact_freeze" && profile.trackingMode === "perspective_reprojection") {
    attempts.push({
      mode: "perspective_reprojection",
      run: async () => {
        const filter = buildHybridDrawtextFilters(
          active,
          width,
          height,
          profile,
          input.overlayStyle,
          input.textRenderMode
        );
        if (!filter) {
          throw new Error("Empty hybrid filter.");
        }
        await runHybridFfmpegOverlay({
          inputVideoPath: input.inputVideoPath,
          outputVideoPath: input.outputVideoPath,
          filter,
        });
      },
    });
  }

  attempts.push({
    mode: "affine_transform",
    run: async () => {
      const affineProfile: VideoMotionProfile = {
        ...profile,
        trackingMode: "affine_transform",
      };
      const filter = buildHybridDrawtextFilters(
        active,
        width,
        height,
        affineProfile,
        input.overlayStyle === "exact" ? "cinematic" : input.overlayStyle,
        input.textRenderMode
      );
      if (!filter) {
        throw new Error("Empty affine filter.");
      }
      await runHybridFfmpegOverlay({
        inputVideoPath: input.inputVideoPath,
        outputVideoPath: input.outputVideoPath,
        filter,
      });
    },
  });

  attempts.push({
    mode: input.textRenderMode === "exact_freeze" ? "freeze_region" : "static_overlay",
    run: async () => {
      await applyLockedTextOverlay({
        inputVideoPath: input.inputVideoPath,
        outputVideoPath: input.outputVideoPath,
        layers: active,
        aspectRatio: input.aspectRatio,
        viduResolution: input.viduResolution,
        totalDurationMs: input.totalDurationMs,
      });
    },
  });

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      logOverlayComposite("attempt", {
        projectId: input.projectId,
        trackingMode: attempt.mode,
        frameIndex: 0,
      });
      await attempt.run();
      logOverlayComposite("completed", {
        projectId: input.projectId,
        trackingMode: attempt.mode,
      });
      return {
        trackingMode: attempt.mode,
        fallbackReason:
          attempt.mode !== "perspective_reprojection" ? `used_${attempt.mode}` : undefined,
      };
    } catch (error) {
      lastError = error;
      logOverlayFallback({
        projectId: input.projectId,
        trackingMode: attempt.mode,
        fallbackReason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logOverlayFailed({
    projectId: input.projectId,
    message: lastError instanceof Error ? lastError.message : "Hybrid overlay failed.",
  });
  throw lastError instanceof Error ? lastError : new Error("Hybrid motion overlay failed.");
}

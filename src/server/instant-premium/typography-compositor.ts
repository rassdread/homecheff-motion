import fs from "node:fs/promises";
import path from "node:path";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";
import { resolveInstantVideoDimensions } from "@/lib/locked-text-layer";
import {
  analyzeTypographyStyleProfile,
  DEFAULT_TYPOGRAPHY_RENDER_QUALITY,
  isTypographyRenderQuality,
  parseTypographyStyleProfile,
  type TypographyRenderQuality,
  typographyEncodePreset,
} from "@/lib/typography-style-profile";
import { smartFitTypographyText as fitText } from "@/lib/typography-smart-fit";
import {
  createTypographyPipelineContext,
  logTypographyPipeline,
  type TypographyCompositorPass,
} from "@/lib/typography-pipeline";
import {
  resolveFfmpegForTextOverlay,
  runFfmpegCapture,
} from "@/lib/video-ffmpeg-capability";
import { applyLockedTextOverlay } from "@/server/instant-premium/locked-text-overlay";
import { languageLayersToLockedLayers } from "@/lib/language-text-layers";
import {
  buildTypographyLayerSvg,
  rasterizeTypographyLayerPng,
} from "@/server/instant-premium/typography-svg-renderer";

export type ApplyTypographyPreservedOverlayInput = {
  inputVideoPath: string;
  outputVideoPath: string;
  layers: LanguageTextLayerRecord[];
  languageCode: string;
  aspectRatio: string | null | undefined;
  viduResolution: string | null | undefined;
  totalDurationMs: number;
  typographyRenderQuality?: TypographyRenderQuality | string;
};

function resolveQuality(raw?: TypographyRenderQuality | string): TypographyRenderQuality {
  if (raw && isTypographyRenderQuality(raw)) {
    return raw;
  }
  const fromEnv = process.env.TYPOGRAPHY_RENDER_QUALITY?.trim();
  if (fromEnv && isTypographyRenderQuality(fromEnv)) {
    return fromEnv;
  }
  return DEFAULT_TYPOGRAPHY_RENDER_QUALITY;
}

function layerVisibleWindow(layer: LanguageTextLayerRecord, totalDurationMs: number): {
  startSec: number;
  endSec: number;
} {
  const startMs = layer.startMs ?? 0;
  const durationMs = layer.durationMs ?? totalDurationMs;
  return {
    startSec: startMs / 1000,
    endSec: (startMs + durationMs) / 1000,
  };
}

async function compositePngOverVideo(params: {
  inputVideoPath: string;
  outputVideoPath: string;
  overlayPaths: Array<{ path: string; startSec: number; endSec: number }>;
  quality: TypographyRenderQuality;
}): Promise<void> {
  if (params.overlayPaths.length === 0) {
    await fs.copyFile(params.inputVideoPath, params.outputVideoPath);
    return;
  }

  const encode = typographyEncodePreset(params.quality);
  const binary = await resolveFfmpegForTextOverlay();
  const inputArgs = ["-y", "-i", path.resolve(params.inputVideoPath)];
  for (const overlay of params.overlayPaths) {
    inputArgs.push("-i", path.resolve(overlay.path));
  }

  const parts: string[] = [];
  let last = "[0:v]";
  for (let i = 0; i < params.overlayPaths.length; i += 1) {
    const overlay = params.overlayPaths[i]!;
    const inputIndex = i + 1;
    const outLabel = i === params.overlayPaths.length - 1 ? "[vout]" : `[v${i + 1}]`;
    const enable = `between(t\\,${overlay.startSec}\\,${overlay.endSec})`;
    parts.push(
      `[${inputIndex}:v]format=rgba[ov${i}];${last}[ov${i}]overlay=0:0:enable='${enable}'${outLabel}`
    );
    last = outLabel;
  }
  const chain = parts.join(";");

  const args = [
    ...inputArgs,
    "-filter_complex",
    chain,
    "-map",
    "[vout]",
    "-c:v",
    "libx264",
    "-preset",
    encode.preset,
    "-crf",
    encode.crf,
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    path.resolve(params.outputVideoPath),
  ];

  const result = await runFfmpegCapture(binary, args, { timeoutMs: 12 * 60 * 1000 });
  if (result.code !== 0) {
    throw new Error(`Typography compositor failed: ${result.output.trim().slice(-2500)}`);
  }
}

/** High-quality SVG raster typography compositing on existing motion video. */
export async function applyTypographyPreservedOverlay(
  input: ApplyTypographyPreservedOverlayInput
): Promise<{ method: "svg_typography" | "drawtext_fallback"; layerCount: number }> {
  const active = input.layers.filter(
    (l) => (l.translatedText?.trim() || l.sourceText?.trim()).length > 0
  );
  if (active.length === 0) {
    await fs.copyFile(input.inputVideoPath, input.outputVideoPath);
    return { method: "svg_typography", layerCount: 0 };
  }

  const quality = resolveQuality(input.typographyRenderQuality);
  const { width, height } = resolveInstantVideoDimensions(
    input.aspectRatio,
    input.viduResolution
  );
  const pipeline = createTypographyPipelineContext({
    projectId: "language-export",
    languageCode: input.languageCode,
    canvasWidth: width,
    canvasHeight: height,
    quality,
  });

  const workDir = path.join(path.dirname(input.outputVideoPath), `typography-${Date.now()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    const overlayPaths: Array<{ path: string; startSec: number; endSec: number }> = [];

    for (const layer of active) {
      const typography =
        parseTypographyStyleProfile(layer.typography) ??
        analyzeTypographyStyleProfile({
          sourceText: layer.sourceText,
          fontSize: layer.fontSize,
          color: layer.color,
          textAlign: layer.textAlign,
          languageCode: input.languageCode,
        });

      const fit =
        layer.fit ??
        fitText({
          text: layer.translatedText.trim() || layer.sourceText.trim(),
          typography,
          languageCode: input.languageCode,
          canvasWidth: width,
          canvasHeight: height,
          regionWidthNorm: layer.width,
          regionHeightNorm: layer.height,
          anchorX: layer.x,
          anchorY: layer.y,
        });

      const svg = buildTypographyLayerSvg({
        layer,
        languageCode: input.languageCode,
        canvasWidth: width,
        canvasHeight: height,
        fit,
        quality,
      });
      const png = await rasterizeTypographyLayerPng({
        svg,
        canvasWidth: width,
        canvasHeight: height,
        quality,
      });
      const pngPath = path.join(workDir, `layer-${layer.id}.png`);
      await fs.writeFile(pngPath, png);
      const window = layerVisibleWindow(layer, input.totalDurationMs);
      overlayPaths.push({ path: pngPath, ...window });

      const pass: TypographyCompositorPass = {
        passId: `pass-${layer.id}`,
        layerId: layer.id,
        method: "svg_raster",
        quality,
      };
      logTypographyPipeline(pass, {
        phase: "layer_rasterized",
        lines: fit.lines.length,
        fontSize: fit.fontSize,
        overflowWarning: fit.overflowWarning,
        tracking: typography.compositing.trackingStability,
      });
    }

    await compositePngOverVideo({
      inputVideoPath: input.inputVideoPath,
      outputVideoPath: input.outputVideoPath,
      overlayPaths,
      quality,
    });

    console.info("[typography-compositor]", {
      phase: "completed",
      method: "svg_typography",
      quality,
      layerCount: active.length,
      canvas: `${width}x${height}`,
      pipelineKind: pipeline.pipelineKind,
    });

    return { method: "svg_typography", layerCount: active.length };
  } catch (error) {
    console.warn("[typography-compositor]", {
      phase: "fallback_drawtext",
      error: error instanceof Error ? error.message : String(error),
    });
    const lockedLayers = languageLayersToLockedLayers(
      active,
      input.languageCode,
      input.totalDurationMs
    );
    await applyLockedTextOverlay({
      inputVideoPath: input.inputVideoPath,
      outputVideoPath: input.outputVideoPath,
      layers: lockedLayers,
      aspectRatio: input.aspectRatio,
      viduResolution: input.viduResolution,
      totalDurationMs: input.totalDurationMs,
    });
    return { method: "drawtext_fallback", layerCount: active.length };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

import fs from "node:fs/promises";
import path from "node:path";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import {
  analyzeSafeZonesFromBuffer,
  buildSafeZoneDebugInfo,
  isSafeZoneDebugEnabled,
  maybeWriteSafeZoneDebug,
  type SafeZoneAnalysis,
} from "@/server/animation-export/safe-zone-placement";
import { buildSceneDetectionContext } from "@/server/animation-export/local-vision/scene-detection-context";
import type { SceneDetectionContext } from "@/server/animation-export/local-vision/scene-detection-context";

export type { SafeZoneAnalysis, SafeZoneDebugInfo, SafeZonePlacement } from "@/server/animation-export/safe-zone-placement";
export {
  heroFinalePlacement,
  heroPlacement,
  scenePlacement,
  sequencePlacement,
  enhanceThemeForZonePlacement,
} from "@/server/animation-export/safe-zone-placement";

export type FrameColorMetrics = {
  luma: number;
  stddev: number;
  avgR: number;
  avgG: number;
  avgB: number;
};

export type AdaptiveOverlayTheme = {
  mode: "dark" | "light" | "mixed";
  isBusy: boolean;
  primaryColorAss: string;
  accentColorAss: string;
  outlineColorAss: string;
  shadow: number;
  outline: number;
  useBackdrop: boolean;
  backdropColorAss: string;
  backdropOpacity: number;
};

export type SceneOverlayWindow = {
  sceneIndex: number;
  start: number;
  end: number;
};

const ASS = {
  white: "&H00FFFFFF",
  nearBlack: "&H00111111",
  green: "&H00526D00",
  blue: "&H00B16700",
  gold: "&H0000B7F5",
  outlineWhite: "&H00FFFFFF",
  backdrop50: "&H80000000",
} as const;

/** Convert #RRGGBB to ASS &H00BBGGRR& */
export function hexToAssColor(hex: string): string {
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = raw.slice(0, 2);
  const g = raw.slice(2, 4);
  const b = raw.slice(4, 6);
  return `&H00${b}${g}${r}&`;
}

export function defaultV2OverlayTheme(): AdaptiveOverlayTheme {
  return {
    mode: "dark",
    isBusy: false,
    primaryColorAss: ASS.white,
    accentColorAss: ASS.gold,
    outlineColorAss: ASS.green,
    shadow: 3,
    outline: 5,
    useBackdrop: false,
    backdropColorAss: ASS.backdrop50,
    backdropOpacity: 0,
  };
}

export function chooseAdaptiveOverlayTheme(metrics: FrameColorMetrics): AdaptiveOverlayTheme {
  const isBusy = metrics.stddev > 55;
  let mode: AdaptiveOverlayTheme["mode"];
  if (metrics.luma < 95) {
    mode = "dark";
  } else if (metrics.luma > 175) {
    mode = "light";
  } else {
    mode = "mixed";
  }

  if (mode === "dark") {
    return {
      mode,
      isBusy,
      primaryColorAss: ASS.white,
      accentColorAss: ASS.gold,
      outlineColorAss: ASS.green,
      shadow: isBusy ? 5 : 4,
      outline: isBusy ? 7 : 5,
      useBackdrop: isBusy,
      backdropColorAss: ASS.backdrop50,
      backdropOpacity: isBusy ? 0.5 : 0,
    };
  }

  if (mode === "light") {
    return {
      mode,
      isBusy,
      primaryColorAss: ASS.nearBlack,
      accentColorAss: ASS.blue,
      outlineColorAss: ASS.outlineWhite,
      shadow: isBusy ? 3 : 2,
      outline: isBusy ? 6 : 4,
      useBackdrop: isBusy,
      backdropColorAss: ASS.backdrop50,
      backdropOpacity: isBusy ? 0.5 : 0,
    };
  }

  const useBackdrop = isBusy;
  return {
    mode: "mixed",
    isBusy,
    primaryColorAss: ASS.white,
    accentColorAss: ASS.gold,
    outlineColorAss: ASS.green,
    shadow: isBusy ? 5 : 4,
    outline: isBusy ? 6 : 5,
    useBackdrop,
    backdropColorAss: ASS.backdrop50,
    backdropOpacity: useBackdrop ? 0.48 : 0,
  };
}

export async function extractSceneSampleFrame(
  inputVideoPath: string,
  sampleTime: number,
  outputPath: string
): Promise<void> {
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const ss = Math.max(0, sampleTime).toFixed(3);
  const args = [
    "-y",
    "-ss",
    ss,
    "-i",
    inputVideoPath,
    "-frames:v",
    "1",
    "-vf",
    "scale=64:64",
    outputPath,
  ];
  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 60_000 });
  if (result.code !== 0) {
    throw new Error(
      `Adaptive sample frame extract failed: ${result.output?.slice(-300) ?? "ffmpeg error"}`
    );
  }
}

export type SceneAdaptiveOverlayContext = {
  theme: AdaptiveOverlayTheme;
  safeZone: SafeZoneAnalysis | null;
  detection: SceneDetectionContext | null;
};

export async function analyzeSceneFrame(imagePath: string): Promise<{
  metrics: FrameColorMetrics;
  safeZone: SafeZoneAnalysis;
}> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const pixels = Math.max(1, data.length / channels);
  let sumLuma = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  const lumas: number[] = [];

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lumas.push(luma);
    sumLuma += luma;
    sumR += r;
    sumG += g;
    sumB += b;
  }

  const meanLuma = sumLuma / pixels;
  let variance = 0;
  for (const l of lumas) {
    variance += (l - meanLuma) ** 2;
  }
  const stddev = Math.sqrt(variance / pixels);

  const metrics: FrameColorMetrics = {
    luma: meanLuma,
    stddev,
    avgR: sumR / pixels,
    avgG: sumG / pixels,
    avgB: sumB / pixels,
  };

  const safeZone = analyzeSafeZonesFromBuffer(data, info.width, info.height, channels);
  return { metrics, safeZone };
}

export async function analyzeFrameColors(imagePath: string): Promise<FrameColorMetrics> {
  const { metrics } = await analyzeSceneFrame(imagePath);
  return metrics;
}

export async function buildAdaptiveThemesForScenes(params: {
  inputVideoPath: string;
  sceneWindows: SceneOverlayWindow[];
  workDir: string;
}): Promise<Map<number, AdaptiveOverlayTheme | null>> {
  const contexts = await buildAdaptiveOverlayContextsForScenes(params);
  const out = new Map<number, AdaptiveOverlayTheme | null>();
  for (const [index, ctx] of contexts) {
    out.set(index, ctx?.theme ?? null);
  }
  return out;
}

export async function buildAdaptiveOverlayContextsForScenes(params: {
  inputVideoPath: string;
  sceneWindows: SceneOverlayWindow[];
  workDir: string;
}): Promise<Map<number, SceneAdaptiveOverlayContext | null>> {
  const out = new Map<number, SceneAdaptiveOverlayContext | null>();
  await fs.mkdir(params.workDir, { recursive: true }).catch(() => undefined);

  for (const window of params.sceneWindows) {
    const samplePath = path.join(
      params.workDir,
      `adaptive-sample-${window.sceneIndex}.png`
    );
    try {
      const sampleTime = window.start + (window.end - window.start) * 0.5;
      await extractSceneSampleFrame(params.inputVideoPath, sampleTime, samplePath);
      const { metrics, safeZone } = await analyzeSceneFrame(samplePath);
      const detection = await buildSceneDetectionContext(samplePath, safeZone);
      await maybeWriteSafeZoneDebug({
        workDir: params.workDir,
        sceneIndex: window.sceneIndex,
        samplePath,
        analysis: safeZone,
      });
      if (isSafeZoneDebugEnabled()) {
        console.info("[hc-safe-zone]", buildSafeZoneDebugInfo(window.sceneIndex, safeZone));
        console.info("[hc-safe-zone-detection]", {
          sceneIndex: window.sceneIndex,
          mediaPipe: detection.mediaPipeDetections.length,
          object: detection.objectDetections.length,
          failed: detection.failedDetectors,
        });
      }
      out.set(window.sceneIndex, {
        theme: chooseAdaptiveOverlayTheme(metrics),
        safeZone,
        detection,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[hc-adaptive-overlay]", {
        sceneIndex: window.sceneIndex,
        warning: message,
      });
      out.set(window.sceneIndex, null);
    } finally {
      await fs.unlink(samplePath).catch(() => undefined);
    }
  }

  return out;
}

export function resolveSceneOverlayTheme(
  themeByIndex: Map<number, AdaptiveOverlayTheme | null> | undefined,
  sceneIndex: number
): AdaptiveOverlayTheme {
  const adaptive = themeByIndex?.get(sceneIndex);
  return adaptive ?? defaultV2OverlayTheme();
}

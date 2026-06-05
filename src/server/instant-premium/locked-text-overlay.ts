import path from "node:path";
import fs from "node:fs/promises";
import type { LockedTextLayer } from "@/lib/locked-text-layer";
import { normalizeLockedTextContent, resolveInstantVideoDimensions } from "@/lib/locked-text-layer";
import {
  resolveConfiguredFontPath,
  resolveFfmpegForTextOverlay,
  runFfmpegCapture,
} from "@/lib/video-ffmpeg-capability";
import {
  applySubjectSafetyToLockedLayers,
  buildMultiImageAvoidPlan,
} from "@/server/animation-export/multi-image-text-safety";
import type { TextAvoidZonePlan } from "@/types/text-avoid-zone";

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

function visibleTextAt(layer: LockedTextLayer, elapsedSec: number): string {
  const full = normalizeLockedTextContent(layer.text);
  const local = elapsedSec - layer.startMs / 1000;
  if (local < 0) {
    return "";
  }
  const endSec = (layer.endMs ?? layer.startMs + layer.durationMs) / 1000;
  if (elapsedSec > endSec) {
    return "";
  }
  const durSec = layer.durationMs / 1000;
  if (layer.animation === "typewriter") {
    const ratio = durSec <= 0 ? 1 : Math.min(1, local / durSec);
    const n = Math.max(0, Math.min(full.length, Math.ceil(full.length * ratio)));
    return full.slice(0, n);
  }
  if (layer.animation === "word-by-word") {
    const words = full.split(/(\s+)/);
    const wordCount = words.filter((w) => w.trim().length > 0).length;
    const ratio = durSec <= 0 ? 1 : Math.min(1, local / durSec);
    const visibleWords = Math.max(0, Math.ceil(wordCount * ratio));
    let seen = 0;
    let out = "";
    for (const part of words) {
      if (part.trim().length > 0) {
        if (seen >= visibleWords) {
          break;
        }
        seen += 1;
      }
      out += part;
    }
    return out;
  }
  return full;
}

type DrawStep = { startSec: number; endSec: number; text: string };

function buildDrawSteps(layer: LockedTextLayer): DrawStep[] {
  const startSec = layer.startMs / 1000;
  const endSec = (layer.endMs ?? layer.startMs + layer.durationMs) / 1000;
  const durSec = Math.max(0.05, endSec - startSec);

  if (layer.animation === "typewriter" || layer.animation === "word-by-word") {
    const steps = 24;
    const out: DrawStep[] = [];
    for (let i = 1; i <= steps; i += 1) {
      const t = startSec + (durSec * i) / steps;
      const prevT = startSec + (durSec * (i - 1)) / steps;
      out.push({
        startSec: prevT,
        endSec: i === steps ? endSec : t,
        text: visibleTextAt(layer, t),
      });
    }
    return out.filter((s) => s.text.length > 0);
  }

  return [{ startSec, endSec, text: normalizeLockedTextContent(layer.text) }];
}

function pushDrawtext(
  parts: string[],
  opts: {
    fontfile: string;
    text: string;
    fontSize: number | string;
    fontColor: string;
    x: string;
    y: string;
    alpha: string;
    startSec: number;
    endSec: number;
  }
): void {
  const escapedText = escapeDrawtext(opts.text);
  const fontPath = escapeFilterPath(opts.fontfile);
  parts.push(
    [
      `drawtext=fontfile=${fontPath}`,
      `text='${escapedText}'`,
      `fontsize=${opts.fontSize}`,
      `fontcolor=${opts.fontColor}`,
      `alpha='${opts.alpha}'`,
      `x=${opts.x}`,
      `y=${opts.y}`,
      `enable='between(t\\,${opts.startSec}\\,${opts.endSec})'`,
    ].join(":")
  );
}

function buildDrawtextFilters(layers: LockedTextLayer[], width: number, height: number): string {
  const fontfile = resolveConfiguredFontPath();
  const parts: string[] = [];

  for (const layer of layers) {
    const fontSize = layer.fontSize ?? 42;
    const fontColor = hexFontColor(layer.color);
    const xExpr =
      layer.textAlign === "left"
        ? `${Math.round(layer.x * width)}`
        : layer.textAlign === "right"
          ? `w-tw-${Math.round((1 - layer.x) * width)}`
          : `(w-tw)/2+${Math.round(layer.x * width - width / 2)}`;
    const baseY = Math.round(layer.y * height);
    const fadeSec = Math.min(0.45, layer.durationMs / 1000 / 3);

    for (const step of buildDrawSteps(layer)) {
      let yExpr = String(baseY);
      let xExprOut = xExpr;
      let alphaExpr = "1";
      let fontsizeExpr: number | string = fontSize;

      if (layer.animation === "fade-in") {
        alphaExpr = `if(lt(t-${step.startSec}\\,${fadeSec})\\,(t-${step.startSec})/${fadeSec}\\,1)`;
      } else if (layer.animation === "slide-up") {
        const slidePx = Math.round(fontSize * 1.1);
        yExpr = `if(lt(t-${step.startSec}\\,${fadeSec})\\,${baseY + slidePx}-(${slidePx}*(t-${step.startSec})/${fadeSec})\\,${baseY})`;
        alphaExpr = `if(lt(t-${step.startSec}\\,${fadeSec})\\,(t-${step.startSec})/${fadeSec}\\,1)`;
      } else if (layer.animation === "slide-left") {
        const slidePx = Math.round(width * 0.06);
        xExprOut = `if(lt(t-${step.startSec}\\,${fadeSec})\\,(${xExpr})+${slidePx}-(${slidePx}*(t-${step.startSec})/${fadeSec})\\,${xExpr})`;
        alphaExpr = `if(lt(t-${step.startSec}\\,${fadeSec})\\,(t-${step.startSec})/${fadeSec}\\,1)`;
      } else if (layer.animation === "slide-right") {
        const slidePx = Math.round(width * 0.06);
        xExprOut = `if(lt(t-${step.startSec}\\,${fadeSec})\\,(${xExpr})-${slidePx}+(${slidePx}*(t-${step.startSec})/${fadeSec})\\,${xExpr})`;
        alphaExpr = `if(lt(t-${step.startSec}\\,${fadeSec})\\,(t-${step.startSec})/${fadeSec}\\,1)`;
      } else if (layer.animation === "scale-in") {
        fontsizeExpr = `if(lt(t-${step.startSec}\\,${fadeSec})\\,${Math.round(fontSize * 0.2)}+(${fontSize}-${Math.round(fontSize * 0.2)})*((t-${step.startSec})/${fadeSec})\\,${fontSize})`;
        alphaExpr = `if(lt(t-${step.startSec}\\,${fadeSec})\\,(t-${step.startSec})/${fadeSec}\\,1)`;
      }

      pushDrawtext(parts, {
        fontfile,
        text: step.text,
        fontSize: fontsizeExpr,
        fontColor,
        x: xExprOut,
        y: yExpr,
        alpha: alphaExpr,
        startSec: step.startSec,
        endSec: step.endSec,
      });
    }
  }

  return parts.join(",");
}

export type ApplyLockedTextOverlayInput = {
  inputVideoPath: string;
  outputVideoPath: string;
  layers: LockedTextLayer[];
  aspectRatio: string | null | undefined;
  viduResolution: string | null | undefined;
  totalDurationMs: number;
  /** Subject-aware avoid zones; heuristics used when omitted. */
  subjectAvoidPlan?: TextAvoidZonePlan;
  stylePreset?: string | null;
};

/** Burn locked text layers onto a merged MP4 using ffmpeg drawtext. */
export async function applyLockedTextOverlay(input: ApplyLockedTextOverlayInput): Promise<void> {
  const active = input.layers.filter((l) => l.locked && l.text.trim());
  if (active.length === 0) {
    await fs.copyFile(input.inputVideoPath, input.outputVideoPath);
    return;
  }

  const { width, height } = resolveInstantVideoDimensions(input.aspectRatio, input.viduResolution);
  const avoidPlan =
    input.subjectAvoidPlan ??
    buildMultiImageAvoidPlan({
      aspectRatio: input.aspectRatio,
      stylePreset: input.stylePreset,
    });
  const safeLayers = applySubjectSafetyToLockedLayers({
    layers: active,
    frameW: width,
    frameH: height,
    avoidPlan,
  });
  const filter = buildDrawtextFilters(safeLayers, width, height);
  if (!filter) {
    await fs.copyFile(input.inputVideoPath, input.outputVideoPath);
    return;
  }

  const fontfile = resolveConfiguredFontPath();
  try {
    await fs.access(fontfile);
  } catch {
    throw new Error(
      `Font file not found for drawtext. Set FFMPEG_FONT_PATH to a readable .ttf file.`
    );
  }

  const binary = await resolveFfmpegForTextOverlay();
  const args = [
    "-y",
    "-i",
    path.resolve(input.inputVideoPath),
    "-vf",
    filter,
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
    path.resolve(input.outputVideoPath),
  ];
  const result = await runFfmpegCapture(binary, args, { timeoutMs: 10 * 60 * 1000 });
  if (result.code !== 0) {
    throw new Error(`Locked text overlay failed: ${result.output.trim().slice(-2500)}`);
  }
}

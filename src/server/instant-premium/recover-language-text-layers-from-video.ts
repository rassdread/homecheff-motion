/**
 * OCR recovery from completed final MP4 when canonical language layers are missing.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  detectedBlocksToCanonicalLayers,
  type CanonicalLanguageTextLayer,
} from "@/lib/canonical-language-text-layers";
import { inferBlockType } from "@/lib/baked-text-detection";
import { requireFfmpegPath, resolveFfmpegBinaries } from "@/lib/ffmpeg/resolve-ffmpeg-binaries";
import { runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import { detectTextBlocksFromImageUrl } from "@/server/image-text-detection";
import { OcrProviderError } from "@/lib/ocr-provider-errors";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";

const FRAME_SAMPLE_FRACTIONS = [0.12, 0.5, 0.88] as const;

async function extractVideoFramePng(params: {
  ffmpeg: string;
  videoPath: string;
  timeSec: number;
  outputPath: string;
}): Promise<boolean> {
  const result = await runFfmpegCapture(
    params.ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      params.timeSec.toFixed(3),
      "-i",
      params.videoPath,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      params.outputPath,
    ],
    { timeoutMs: 45_000 }
  );
  return result.code === 0;
}

async function detectTextFromLocalFrame(framePath: string) {
  const buffer = await fs.readFile(framePath);
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  return detectTextBlocksFromImageUrl(dataUrl, { mode: "full" });
}

export async function recoverLanguageTextLayersFromFinalVideo(params: {
  finalVideoPath: string;
  stylePreset?: string | null;
  durationSeconds?: number | null;
}): Promise<{
  layers: CanonicalLanguageTextLayer[];
  ocrRecoveredCount: number;
  error?: string;
}> {
  let ffmpeg: string;
  try {
    await resolveFfmpegBinaries();
    ffmpeg = await requireFfmpegPath();
  } catch {
    return { layers: [], ocrRecoveredCount: 0, error: "FFmpeg unavailable for frame OCR recovery." };
  }

  const probed = await probeVideoSegment(params.finalVideoPath);
  const durationSec = Math.max(
    1,
    probed?.durationSec ?? params.durationSeconds ?? 8
  );
  const durationMs = Math.round(durationSec * 1000);

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "hc-lang-ocr-recover-"));
  const seenText = new Set<string>();
  const recovered: CanonicalLanguageTextLayer[] = [];

  try {
    for (let i = 0; i < FRAME_SAMPLE_FRACTIONS.length; i += 1) {
      const fraction = FRAME_SAMPLE_FRACTIONS[i]!;
      const timeSec = Math.min(durationSec - 0.05, Math.max(0, durationSec * fraction));
      const framePath = path.join(workDir, `frame-${i}.png`);
      const extracted = await extractVideoFramePng({
        ffmpeg,
        videoPath: params.finalVideoPath,
        timeSec,
        outputPath: framePath,
      });
      if (!extracted) {
        continue;
      }

      try {
        const detection = await detectTextFromLocalFrame(framePath);
        for (const block of detection.blocks) {
          const text = block.text.trim();
          if (text.length < 2) {
            continue;
          }
          const norm = text.toLowerCase();
          if (seenText.has(norm)) {
            continue;
          }
          seenText.add(norm);
          const canonicalLayers = detectedBlocksToCanonicalLayers(
            [
              {
                id: block.id || `ocr-recover-${recovered.length}`,
                text,
                confidence: block.confidence,
                bbox: block.bbox,
                suggestedAlign: block.suggestedAlign,
                blockType: block.blockType ?? inferBlockType(text, block.bbox),
              },
            ],
            params.stylePreset,
            durationMs
          );
          recovered.push(...canonicalLayers);
        }
      } catch (error) {
        if (
          error instanceof OcrProviderError &&
          error.errorCode === "OCR_PROVIDER_NOT_CONFIGURED"
        ) {
          return {
            layers: [],
            ocrRecoveredCount: 0,
            error: error.message,
          };
        }
        console.warn("[language-text-recovery]", {
          phase: "frame_ocr_failed",
          frame: i,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }

  return {
    layers: recovered,
    ocrRecoveredCount: recovered.length,
  };
}

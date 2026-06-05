import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { extractSceneSampleFrame } from "@/server/animation-export/adaptive-overlay-style";
import { buildTextAvoidZonePlan } from "@/server/animation-export/text-avoid-zone-builder";
import type { AvoidBox } from "@/server/animation-export/local-vision/types";
import type { TextAvoidZonePlan } from "@/types/text-avoid-zone";
import { buildSceneDetectionContext } from "@/server/animation-export/local-vision/scene-detection-context";

const SAMPLE_FRACTIONS = [0.08, 0.5, 0.92] as const;

export function computeMultiSampleTimes(durationSec: number): number[] {
  if (durationSec <= 0) {
    return [0];
  }
  return SAMPLE_FRACTIONS.map((f) =>
    Math.max(0, Math.min(durationSec - 0.05, durationSec * f))
  );
}

/** Sample start / middle / end within a scene window on the full timeline. */
export function computeMultiSampleTimesForWindow(
  windowStartSec: number,
  windowEndSec: number
): number[] {
  const duration = Math.max(0, windowEndSec - windowStartSec);
  if (duration <= 0) {
    return [windowStartSec];
  }
  return SAMPLE_FRACTIONS.map((f) =>
    windowStartSec + Math.max(0, Math.min(duration - 0.05, duration * f))
  );
}

async function readSamplePixels(samplePath: string): Promise<Uint8Array | null> {
  try {
    const { default: sharp } = await import("sharp");
    const { data, info } = await sharp(samplePath)
      .resize(64, 64)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.channels >= 3) {
      return new Uint8Array(data);
    }
  } catch {
    /* fallback below */
  }

  try {
    const buf = await fs.readFile(samplePath);
    return buf.length > 0 ? new Uint8Array(buf.slice(0, 64 * 64 * 3)) : null;
  } catch {
    return null;
  }
}

export async function buildMultiSampleAvoidZonePlan(input: {
  videoPath: string;
  durationSec?: number;
  windowStartSec?: number;
  windowEndSec?: number;
  aspectRatio?: string | null;
  stylePreset?: string | null;
  chips?: string[] | null;
  projectTitle?: string | null;
  ocrAvoidBoxes?: AvoidBox[];
  bakedAvoidBoxes?: AvoidBox[];
  enableVision?: boolean;
}): Promise<TextAvoidZonePlan> {
  const sampleTimes =
    input.windowStartSec != null && input.windowEndSec != null
      ? computeMultiSampleTimesForWindow(input.windowStartSec, input.windowEndSec)
      : computeMultiSampleTimes(input.durationSec ?? 0);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hc-text-avoid-"));
  const avoidBoxGroups: AvoidBox[][] = [];

  if (input.ocrAvoidBoxes?.length) {
    avoidBoxGroups.push(input.ocrAvoidBoxes);
  }
  if (input.bakedAvoidBoxes?.length) {
    avoidBoxGroups.push(input.bakedAvoidBoxes);
  }

  let unionPixels: Uint8Array | null = null;
  let samplesOk = 0;

  try {
    for (let i = 0; i < sampleTimes.length; i++) {
      const t = sampleTimes[i]!;
      const samplePath = path.join(tmpDir, `sample-${i}.png`);
      try {
        await extractSceneSampleFrame(input.videoPath, t, samplePath);
        samplesOk++;

        if (input.enableVision) {
          const ctx = await buildSceneDetectionContext(samplePath);
          if (ctx.combinedAvoidBoxes.length > 0) {
            avoidBoxGroups.push(ctx.combinedAvoidBoxes);
          }
        }

        const pixels = await readSamplePixels(samplePath);
        if (pixels) {
          unionPixels = pixels;
        }
      } catch {
        /* skip failed sample */
      }
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  const heuristicOnly = samplesOk === 0 && avoidBoxGroups.flat().length === 0;

  return buildTextAvoidZonePlan({
    avoidBoxes: avoidBoxGroups,
    aspectRatio: input.aspectRatio,
    stylePreset: input.stylePreset,
    chips: input.chips,
    projectTitle: input.projectTitle,
    samplePixels: unionPixels,
    sampleFrameW: 64,
    sampleFrameH: 64,
    sampleTimesSec: sampleTimes,
    heuristicOnly,
  });
}

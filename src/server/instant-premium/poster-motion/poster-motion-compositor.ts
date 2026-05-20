import fs from "node:fs/promises";
import path from "node:path";
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
} from "@/lib/media-export-constants";
import { parsePosterMotionSettings, type PosterMotionSettings } from "@/lib/poster-motion-preserve";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

export type CompositePosterMotionInput = {
  projectId: string;
  workDir: string;
  mergedViduPath: string;
  outputVideoPath: string;
  baseImageUrl: string;
  durationSec: number;
  maxWidth: number;
  posterMotionSettings?: unknown;
};

function ffmpegBinary(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`Could not download base image (${res.status}).`);
  }
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

/**
 * DeeVid-style final composite: static poster base (with optional camera motion) + Vidu motion overlay.
 * Typography remains in the base layer; Vidu motion is blended only as foreground energy.
 */
export async function compositePosterMotionPreserve(
  input: CompositePosterMotionInput
): Promise<{ outputPath: string }> {
  const settings: PosterMotionSettings = parsePosterMotionSettings(input.posterMotionSettings);
  const ffmpeg = (await resolveFfmpegForTextOverlay().catch(() => null)) ?? ffmpegBinary();
  const basePath = path.join(input.workDir, "poster-base.jpg");
  await downloadToFile(input.baseImageUrl, basePath);

  const duration = Math.max(1, Math.round(input.durationSec));
  const fps = 30;
  const frames = duration * fps;
  const maxW = Math.max(360, input.maxWidth);

  const scaleBase = `scale=${maxW}:-2`;
  const cameraFilter = settings.cinematicCameraMotion
    ? `${scaleBase},zoompan=z='min(zoom+0.00035,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:fps=${fps}`
    : `${scaleBase},fps=${fps}`;

  const motionOpacity = settings.particlesGlow ? 0.32 : 0.24;
  const filterComplex = [
    `[0:v]${cameraFilter},format=yuv420p[base]`,
    `[1:v]scale=${maxW}:-2,format=yuv420p[fg]`,
    `[base][fg]blend=all_mode=screen:all_opacity=${motionOpacity}:shortest=1[out]`,
  ].join(";");

  const args = [
    "-y",
    "-loop",
    "1",
    "-i",
    basePath,
    "-i",
    input.mergedViduPath,
    "-filter_complex",
    filterComplex,
    "-map",
    "[out]",
    "-t",
    String(duration),
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-preset",
    FINAL_MERGE_VIDEO_PRESET,
    "-crf",
    String(FINAL_MERGE_VIDEO_CRF),
    ...(FINAL_MERGE_DISABLE_AUDIO ? ["-an"] : []),
    input.outputVideoPath,
  ];

  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 180_000 });
  if (result.code !== 0) {
    throw new Error(`Poster motion composite failed: ${result.output.slice(-500)}`);
  }

  console.info("[hc-instant-premium]", {
    projectId: input.projectId,
    phase: "posterMotionCompositeComplete",
    cinematicCamera: settings.cinematicCameraMotion,
    particlesGlow: settings.particlesGlow,
  });

  return { outputPath: input.outputVideoPath };
}

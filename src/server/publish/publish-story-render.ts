/**
 * Publish story render — Ken Burns, slideshow, voice/image MP4 via ffmpeg.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
} from "@/lib/media-export-constants";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import type { PublishProject } from "@/types/publish-overlay";
import { loadPublishTimelineFromProject } from "@/lib/publish-timeline";
import { isSlideshowProject } from "@/lib/publish-photo-story";
import { isAudioWithImageProject, isVoiceMessageProject, readPublishAudioUrl } from "@/lib/publish-audio-workflows";

const PORTRAIT_W = 1080;
const PORTRAIT_H = 1920;
const FPS = 30;

async function downloadToFile(url: string, dest: string): Promise<void> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:[^;]+;base64,(.+)$/);
    if (!match?.[1]) throw new Error("Invalid data URL");
    await fs.writeFile(dest, Buffer.from(match[1], "base64"));
    return;
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    throw new Error(`Could not download media (${res.status})`);
  }
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

function scalePadFilter(w: number, h: number): string {
  return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black`;
}

function kenBurnsFilter(durationSec: number): string {
  const frames = Math.max(1, Math.round(durationSec * FPS));
  return [
    scalePadFilter(PORTRAIT_W, PORTRAIT_H),
    `zoompan=z='min(zoom+0.00035,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${PORTRAIT_W}x${PORTRAIT_H}:fps=${FPS}`,
  ].join(",");
}

async function runFfmpeg(ffmpeg: string, args: string[]): Promise<void> {
  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 300_000 });
  if (result.code !== 0) {
    throw new Error(result.output.slice(-500) || "ffmpeg render failed");
  }
}

export async function renderKenBurnsVideo(input: {
  imageUrl: string;
  durationSec: number;
  workDir: string;
  outputPath: string;
}): Promise<string> {
  const ffmpeg = await resolveFfmpegForTextOverlay();
  await fs.mkdir(input.workDir, { recursive: true });
  const imagePath = path.join(input.workDir, "photo.jpg");
  await downloadToFile(input.imageUrl, imagePath);

  const filter = kenBurnsFilter(input.durationSec);
  await runFfmpeg(ffmpeg, [
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-vf",
    filter,
    "-t",
    String(Math.max(0.5, input.durationSec)),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    FINAL_MERGE_VIDEO_PRESET,
    "-crf",
    String(FINAL_MERGE_VIDEO_CRF),
    ...(FINAL_MERGE_DISABLE_AUDIO ? ["-an"] : ["-an"]),
    input.outputPath,
  ]);
  return input.outputPath;
}

export async function renderSlideshowVideo(input: {
  imageUrls: string[];
  slideDurationSec: number;
  workDir: string;
  outputPath: string;
}): Promise<string> {
  const ffmpeg = await resolveFfmpegForTextOverlay();
  await fs.mkdir(input.workDir, { recursive: true });
  const segmentPaths: string[] = [];

  for (const [i, url] of input.imageUrls.entries()) {
    const imagePath = path.join(input.workDir, `slide_${i}.jpg`);
    const segPath = path.join(input.workDir, `seg_${i}.mp4`);
    await downloadToFile(url, imagePath);
    const filter = kenBurnsFilter(input.slideDurationSec);
    await runFfmpeg(ffmpeg, [
      "-y",
      "-loop",
      "1",
      "-i",
      imagePath,
      "-vf",
      filter,
      "-t",
      String(Math.max(0.5, input.slideDurationSec)),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      FINAL_MERGE_VIDEO_PRESET,
      "-crf",
      String(FINAL_MERGE_VIDEO_CRF),
      "-an",
      segPath,
    ]);
    segmentPaths.push(segPath);
  }

  const listPath = path.join(input.workDir, "concat.txt");
  const listBody = segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(listPath, listBody);

  await runFfmpeg(ffmpeg, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    input.outputPath,
  ]);
  return input.outputPath;
}

export async function renderImageWithAudioVideo(input: {
  imageUrl: string;
  audioUrl?: string;
  durationSec: number;
  workDir: string;
  outputPath: string;
}): Promise<string> {
  const ffmpeg = await resolveFfmpegForTextOverlay();
  await fs.mkdir(input.workDir, { recursive: true });
  const imagePath = path.join(input.workDir, "visual.jpg");
  await downloadToFile(input.imageUrl, imagePath);

  const silentPath = path.join(input.workDir, "silent.mp4");
  const filter = `${scalePadFilter(PORTRAIT_W, PORTRAIT_H)},fps=${FPS}`;
  await runFfmpeg(ffmpeg, [
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-vf",
    filter,
    "-t",
    String(Math.max(0.5, input.durationSec)),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    FINAL_MERGE_VIDEO_PRESET,
    "-crf",
    String(FINAL_MERGE_VIDEO_CRF),
    "-an",
    silentPath,
  ]);

  if (!input.audioUrl?.trim()) {
    await fs.copyFile(silentPath, input.outputPath);
    return input.outputPath;
  }

  const audioPath = path.join(input.workDir, "audio.bin");
  await downloadToFile(input.audioUrl, audioPath);
  await runFfmpeg(ffmpeg, [
    "-y",
    "-i",
    silentPath,
    "-i",
    audioPath,
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    input.outputPath,
  ]);
  return input.outputPath;
}

export async function renderPublishStoryBaseVideo(
  project: PublishProject,
  workDir: string,
  outputPath: string
): Promise<string> {
  const duration = Math.max(1, project.durationSeconds || 10);
  const timeline = loadPublishTimelineFromProject(project);

  if (isSlideshowProject(project)) {
    const urls = project.imageUrls ?? timeline.items.filter((i) => i.imageUrl).map((i) => i.imageUrl!);
    if (urls.length === 0) throw new Error("Slideshow requires images");
    const firstSlide = timeline.items.find((i) => i.kind === "slide");
    const slideDur =
      firstSlide && firstSlide.endTime > firstSlide.startTime
        ? firstSlide.endTime - firstSlide.startTime
        : duration / urls.length;
    return renderSlideshowVideo({
      imageUrls: urls,
      slideDurationSec: Math.max(1, slideDur),
      workDir,
      outputPath,
    });
  }

  if (isVoiceMessageProject(project) || isAudioWithImageProject(project)) {
    const imageUrl =
      project.imageUrl ??
      timeline.items.find((i) => i.kind === "photo_base" || i.imageUrl)?.imageUrl ??
      project.videoUrl;
    if (!imageUrl) throw new Error("Voice message requires a cover image or poster");
    return renderImageWithAudioVideo({
      imageUrl,
      audioUrl: readPublishAudioUrl(project) || undefined,
      durationSec: duration,
      workDir,
      outputPath,
    });
  }

  const imageUrl =
    project.imageUrl ??
    timeline.items.find((i) => i.kind === "photo_base")?.imageUrl ??
    project.videoUrl;
  if (!imageUrl) throw new Error("Photo story requires an image");
  return renderKenBurnsVideo({ imageUrl, durationSec: duration, workDir, outputPath });
}

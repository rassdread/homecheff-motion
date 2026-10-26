/**
 * Timeline render adapter.
 * Picture segments, black gaps, and source trims are FFmpeg.
 * The mix is mixStudioAudioLayers. Burn-in is burnStoryTextOverlay.
 * No provider, no wallet, no second mixer.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { mixStudioAudioLayers, muxStudioVideoWithMixedAudio } from "@/lib/studio-audio-mix-ffmpeg";
import {
  assembleVisualPieces,
  buildTimelineMixRequest,
  type TimelineAudioInput,
  type TimelineVisualInput,
  type VisualPiece,
} from "@/lib/studio-timeline-render-plan";
import type { TimelineCue } from "@/lib/studio-timeline";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import { burnStoryTextOverlay } from "@/server/animation-export/story-text-overlay";

export type TimelineFilmRenderInput = {
  workDir: string;
  outputPath: string;
  width: number;
  height: number;
  visuals: TimelineVisualInput[];
  audio: TimelineAudioInput[];
  cues: TimelineCue[];
  burnSubtitles: boolean;
  signal?: AbortSignal;
};

export type TimelineFilmRenderResult =
  | { ok: true; outputPath: string; durationMs: number }
  | { ok: false; code: string; message: string };

export async function renderTimelineFilm(input: TimelineFilmRenderInput): Promise<TimelineFilmRenderResult> {
  if (input.width < 160 || input.height < 160 || input.width > 1920 || input.height > 1920) {
    return { ok: false, code: "resolution", message: "Choose a supported resolution." };
  }
  const visuals = assembleVisualPieces(input.visuals);
  if (!visuals.ok) {
    const message =
      visuals.code === "missing_video"
        ? "Add at least one picture clip."
        : visuals.code === "overlap"
          ? "Picture clips overlap. Move them so they do not cover the same time."
          : "A picture clip has an invalid time.";
    return { ok: false, code: visuals.code, message };
  }
  const mix = buildTimelineMixRequest({ totalMs: visuals.totalMs, clips: input.audio });
  if ("ok" in mix) return { ok: false, code: mix.code, message: "An audio clip has an invalid time." };

  if (input.signal?.aborted) {
    return { ok: false, code: "cancelled", message: "Export was cancelled." };
  }
  await mkdir(input.workDir, { recursive: true });
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const segmentPaths: string[] = [];
  for (let index = 0; index < visuals.pieces.length; index += 1) {
    if (input.signal?.aborted) {
      return { ok: false, code: "cancelled", message: "Export was cancelled." };
    }
    const segmentPath = path.join(input.workDir, `segment-${index}.mp4`);
    const encoded = await encodePiece({
      ffmpeg,
      piece: visuals.pieces[index]!,
      outputPath: segmentPath,
      width: input.width,
      height: input.height,
      signal: input.signal,
    });
    if (!encoded.ok) return encoded;
    segmentPaths.push(segmentPath);
  }

  const picturePath = path.join(input.workDir, "picture.mp4");
  const listPath = path.join(input.workDir, "concat.txt");
  const list = segmentPaths.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(listPath, list, "utf8");
  const concatenated = await runFfmpegCapture(
    ffmpeg,
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "25", picturePath],
    { timeoutMs: 180_000 },
  );
  if (input.signal?.aborted) {
    return { ok: false, code: "cancelled", message: "Export was cancelled." };
  }
  if (concatenated.code !== 0) {
    return { ok: false, code: "ffmpeg", message: concatenated.output.slice(-500) || "Picture assembly failed." };
  }

  let withAudio = picturePath;
  if (mix.plan.mixReady) {
    const discretePaths: string[] = [];
    for (let index = 0; index < mix.discreteTrim.length; index += 1) {
      const cue = mix.discreteTrim[index]!;
      const trimmed = path.join(input.workDir, `audio-${index}.wav`);
      const trim = await runFfmpegCapture(
        ffmpeg,
        ["-y", "-ss", (cue.inMs / 1000).toFixed(3), "-t", (cue.durationMs / 1000).toFixed(3), "-i", cue.path, "-vn", "-ar", "44100", "-ac", "2", trimmed],
        { timeoutMs: 60_000 },
      );
      if (trim.code !== 0) return { ok: false, code: "ffmpeg", message: trim.output.slice(-500) || "Audio trim failed." };
      discretePaths.push(trimmed);
    }
    const mixedPath = path.join(input.workDir, "mixed.m4a");
    const mixed = await mixStudioAudioLayers({
      musicPath: mix.musicPath,
      discreteSfxPaths: discretePaths,
      outputPath: mixedPath,
      plan: mix.plan,
    });
    if (!mixed.ok) return { ok: false, code: "mix", message: mixed.message };
    withAudio = path.join(input.workDir, "with-audio.mp4");
    const muxed = await muxStudioVideoWithMixedAudio({
      videoPath: picturePath,
      mixedAudioPath: mixedPath,
      outputPath: withAudio,
      videoDurationSeconds: visuals.totalMs / 1000,
    });
    if (!muxed.ok) return { ok: false, code: "mux", message: muxed.message };
  }

  if (input.burnSubtitles && input.cues.length > 0) {
    const burned = path.join(input.workDir, "burned.mp4");
    try {
      await burnStoryTextOverlay({
        inputVideoPath: withAudio,
        outputVideoPath: burned,
        assContent: cuesToAss(input.cues, input.width, input.height),
        workDir: input.workDir,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Subtitle burn-in failed.";
      return { ok: false, code: "burn", message };
    }
    const copy = await runFfmpegCapture(ffmpeg, ["-y", "-i", burned, "-c", "copy", input.outputPath], { timeoutMs: 60_000 });
    if (copy.code !== 0) return { ok: false, code: "ffmpeg", message: copy.output.slice(-500) || "Could not store the burned file." };
  } else {
    const copy = await runFfmpegCapture(ffmpeg, ["-y", "-i", withAudio, "-c", "copy", input.outputPath], { timeoutMs: 60_000 });
    if (copy.code !== 0) return { ok: false, code: "ffmpeg", message: copy.output.slice(-500) || "Could not store the film." };
  }
  return { ok: true, outputPath: input.outputPath, durationMs: visuals.totalMs };
}

export async function extractLastFrame(videoPath: string, outputPath: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const result = await runFfmpegCapture(ffmpeg, ["-y", "-sseof", "-0.08", "-i", videoPath, "-frames:v", "1", outputPath], { timeoutMs: 30_000 });
  if (result.code !== 0) return { ok: false, message: result.output.slice(-400) || "Could not read the last frame." };
  return { ok: true };
}

async function encodePiece(input: {
  ffmpeg: string;
  piece: VisualPiece;
  outputPath: string;
  width: number;
  height: number;
  signal?: AbortSignal;
}): Promise<{ ok: true } | { ok: false; code: "ffmpeg" | "cancelled"; message: string }> {
  const scale = `scale=${input.width}:${input.height}:force_original_aspect_ratio=decrease,pad=${input.width}:${input.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25`;
  const duration = (input.piece.durationMs / 1000).toFixed(3);
  const args =
    input.piece.kind === "black"
      ? ["-y", "-f", "lavfi", "-i", `color=c=black:s=${input.width}x${input.height}:r=25:d=${duration}`, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", input.outputPath]
      : input.piece.kind === "still"
        ? ["-y", "-loop", "1", "-i", input.piece.path, "-t", duration, "-vf", scale, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", input.outputPath]
        : ["-y", "-ss", (input.piece.inMs / 1000).toFixed(3), "-i", input.piece.path, "-t", duration, "-vf", scale, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", input.outputPath];
  const result = await runFfmpegCapture(input.ffmpeg, args, { timeoutMs: 120_000 });
  if (input.signal?.aborted) return { ok: false, code: "cancelled", message: "Export was cancelled." };
  if (result.code !== 0) return { ok: false, code: "ffmpeg", message: result.output.slice(-500) || "A picture segment failed." };
  return { ok: true };
}

export function cuesToAss(cues: TimelineCue[], width: number, height: number): string {
  const fontSize = Math.max(28, Math.round(height * 0.045));
  const margin = Math.round(height * 0.08);
  const events = cues
    .filter((cue) => cue.text.trim() && cue.endMs > cue.startMs)
    .map((cue) => {
      const text = cue.text.trim().replace(/\\/g, "\\\\").replace(/\n/g, "\\N").replace(/\{/g, "\\{");
      return `Dialogue: 0,${assTime(cue.startMs)},${assTime(cue.endMs)},Default,,0,0,0,,${text}`;
    });
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,Arial,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,${margin},${margin},${margin},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    "",
  ].join("\n");
}

function assTime(ms: number): string {
  const safe = Math.max(0, ms);
  const h = Math.floor(safe / 3_600_000);
  const m = Math.floor((safe % 3_600_000) / 60_000);
  const s = Math.floor((safe % 60_000) / 1000);
  const cs = Math.floor((safe % 1000) / 10);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

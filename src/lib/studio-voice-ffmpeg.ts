/**
 * Studio V32 — FFmpeg helpers for voice mux and subtitle burn-in (no Vidu).
 */

import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import { burnStoryTextOverlay } from "@/server/animation-export/story-text-overlay";
import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

export function buildStudioVoiceMuxFfmpegArgs(params: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  videoDurationSeconds: number;
}): string[] {
  const duration = Math.max(0.1, params.videoDurationSeconds);
  return [
    "-y",
    "-i",
    params.videoPath,
    "-i",
    params.audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    String(duration),
    "-movflags",
    "+faststart",
    params.outputPath,
  ];
}

/** ASS for narration subtitles — bottom safe zone, readable box. */
export function buildStudioNarrationAssContent(params: {
  entries: SubtitleTrackEntry[];
  width: number;
  height: number;
}): string {
  const w = Math.max(320, params.width);
  const h = Math.max(320, params.height);
  const marginV = Math.round(h * 0.12);
  const fontSize = Math.max(22, Math.round(h * 0.038));

  const lines = params.entries
    .filter((e) => e.text.trim().length > 0)
    .map((entry, index) => {
      const start = formatAssTime(entry.start);
      const end = formatAssTime(Math.max(entry.start + 0.05, entry.end));
      const text = entry.text.replace(/\r?\n/g, "\\N").replace(/{/g, "(").replace(/}/g, ")");
      return `Dialogue: 0,${start},${end},StudioNarration,,0,0,0,,${text}`;
    });

  return [
    "[Script Info]",
    "Title: Studio narration",
    "ScriptType: v4.00+",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    `PlayResX: ${w}`,
    `PlayResY: ${h}`,
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: StudioNarration,Arial,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H96000000,0,0,0,0,100,100,0,0,3,2,1,2,48,48,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...lines,
    "",
  ].join("\n");
}

function formatAssTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const cs = Math.floor((clamped % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export async function muxStudioVoiceAudio(params: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  videoDurationSeconds: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const args = buildStudioVoiceMuxFfmpegArgs(params);
  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 10 * 60 * 1000 });
  if (result.code !== 0) {
    return {
      ok: false,
      message: result.output?.slice(-500) ?? "Voice audio mux failed.",
    };
  }
  return { ok: true };
}

export async function burnStudioNarrationSubtitles(params: {
  inputVideoPath: string;
  outputVideoPath: string;
  entries: SubtitleTrackEntry[];
  width: number;
  height: number;
  workDir: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const assContent = buildStudioNarrationAssContent({
      entries: params.entries,
      width: params.width,
      height: params.height,
    });
    await burnStoryTextOverlay({
      inputVideoPath: params.inputVideoPath,
      outputVideoPath: params.outputVideoPath,
      assContent,
      workDir: params.workDir,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Subtitle burn-in failed.",
    };
  }
}

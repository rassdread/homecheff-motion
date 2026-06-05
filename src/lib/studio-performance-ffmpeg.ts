/**
 * Studio V34.5 — lightweight debug performance overlay (ASS burn-in, no Vidu).
 */

import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import { burnStoryTextOverlay } from "@/server/animation-export/story-text-overlay";
import type { MotionCharacterPerformanceFrame } from "@/types/motion-character-performance-export";

export type PerformanceOverlaySegment = {
  start: number;
  end: number;
  text: string;
  active: boolean;
};

function formatAssTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const cs = Math.floor((clamped % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function mouthBar(amount: number): string {
  if (amount >= 0.85) {
    return "████";
  }
  if (amount >= 0.5) {
    return "▆▆▆";
  }
  if (amount >= 0.2) {
    return "▃▃";
  }
  return "▁▁";
}

export function formatPerformanceOverlayLine(frame: MotionCharacterPerformanceFrame): string {
  const mouth = frame.mouthState.toUpperCase();
  const bar = mouthBar(frame.mouthOpenAmount);
  const smile = `${frame.smileStrength}%`;
  if (frame.activeSpeaker) {
    return `● ${frame.characterName} ${bar} ${mouth} smile ${smile}`;
  }
  return `○ ${frame.characterName} idle ${bar}`;
}

/** Group frames into ASS dialogue windows (0.5s) showing active speaker + idle cast. */
export function buildPerformanceOverlaySegments(
  frames: MotionCharacterPerformanceFrame[],
  windowSeconds = 0.5
): PerformanceOverlaySegment[] {
  if (frames.length === 0) {
    return [];
  }
  const maxTime = Math.max(...frames.map((f) => f.time));
  const segments: PerformanceOverlaySegment[] = [];

  for (let start = 0; start <= maxTime; start += windowSeconds) {
    const end = Math.min(maxTime + windowSeconds, start + windowSeconds);
    const inWindow = frames.filter((f) => f.time >= start - 0.01 && f.time < end);
    if (inWindow.length === 0) {
      continue;
    }
    const byChar = new Map<string, MotionCharacterPerformanceFrame>();
    for (const f of inWindow) {
      const prev = byChar.get(f.characterId);
      if (!prev || f.time >= prev.time) {
        byChar.set(f.characterId, f);
      }
    }
    const sorted = [...byChar.values()].sort((a, b) => {
      if (a.activeSpeaker !== b.activeSpeaker) {
        return a.activeSpeaker ? -1 : 1;
      }
      return a.characterName.localeCompare(b.characterName);
    });
    const lines = sorted.map((f) => formatPerformanceOverlayLine(f));
    const active = sorted.some((f) => f.activeSpeaker);
    segments.push({
      start,
      end,
      text: lines.join("\\N"),
      active,
    });
  }

  return segments;
}

export function buildStudioPerformanceAssContent(params: {
  segments: PerformanceOverlaySegment[];
  width: number;
  height: number;
}): string {
  const w = Math.max(320, params.width);
  const h = Math.max(320, params.height);
  const marginV = Math.round(h * 0.08);
  const fontSize = Math.max(18, Math.round(h * 0.028));

  const dialogues = params.segments.map((seg) => {
    const start = formatAssTime(seg.start);
    const end = formatAssTime(Math.max(seg.start + 0.05, seg.end));
    const style = seg.active ? "PerfActive" : "PerfIdle";
    const text = seg.text.replace(/\r?\n/g, "\\N").replace(/{/g, "(").replace(/}/g, ")");
    return `Dialogue: 0,${start},${end},${style},,0,0,0,,${text}`;
  });

  return [
    "[Script Info]",
    "Title: Studio character performance",
    "ScriptType: v4.00+",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    `PlayResX: ${w}`,
    `PlayResY: ${h}`,
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: PerfActive,Arial,${fontSize},&H0000FF00,&H000000FF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,2,0,7,24,24,${marginV},1`,
    `Style: PerfIdle,Arial,${Math.max(16, fontSize - 2)},&H00B0B0B0,&H000000FF,&H00000000,&H50000000,0,0,0,0,100,100,0,0,1,1,0,7,24,24,${marginV + Math.round(fontSize * 1.2)},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...dialogues,
    "",
  ].join("\n");
}

export async function burnStudioPerformanceOverlay(params: {
  inputVideoPath: string;
  outputVideoPath: string;
  frames: MotionCharacterPerformanceFrame[];
  width: number;
  height: number;
  workDir: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const segments = buildPerformanceOverlaySegments(params.frames);
    if (segments.length === 0) {
      return { ok: false, message: "No performance overlay segments to render." };
    }
    const assContent = buildStudioPerformanceAssContent({
      segments,
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
      message: error instanceof Error ? error.message : "Performance overlay burn-in failed.",
    };
  }
}

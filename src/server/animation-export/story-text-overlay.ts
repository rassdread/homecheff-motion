import path from "node:path";
import fs from "node:fs/promises";
import type { InstantSceneText } from "@/lib/instant-premium-mode-types";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

export type StoryOverlayTemplate = "cinematic";

const BRAND_GREEN = "&H00526D00";
const BRAND_BLUE = "&H00B16700";
const TITLE_MARGIN_V = 72;
const SUBTITLE_GAP = 8;

function assTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const cs = Math.round((clamped - Math.floor(clamped)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\N");
}

export type BuildStoryOverlayAssInput = {
  sceneTexts: InstantSceneText[];
  durationSeconds: number;
  width: number;
  height: number;
  template?: StoryOverlayTemplate;
};

/**
 * ASS subtitles for story-mode scene titles (post-Vidu burn-in).
 * Timing: equal slices per scene with 0.2s fade margin at edges.
 */
export function buildStoryOverlayAss(input: BuildStoryOverlayAssInput): string {
  const { sceneTexts, durationSeconds, width, height } = input;
  const sceneCount = Math.max(1, sceneTexts.length);
  const sceneDuration = durationSeconds / sceneCount;
  const titleSize = Math.round(Math.min(width, height) * 0.065);
  const subtitleSize = Math.round(titleSize * 0.55);
  const bottomThirdY = Math.round(height * 0.72);

  const header = [
    "[Script Info]",
    "Title: HomeCheff Story Overlay",
    "ScriptType: v4.00+",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.709",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: HCStoryTitle,Arial,${titleSize},&H00FFFFFF,&H000000FF,${BRAND_GREEN},&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,48,48,${TITLE_MARGIN_V},1`,
    `Style: HCStorySubtitle,Arial,${subtitleSize},&H00FFFFFF,&H000000FF,${BRAND_BLUE},&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,48,48,${TITLE_MARGIN_V + titleSize + SUBTITLE_GAP},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events: string[] = [];
  for (let index = 0; index < sceneTexts.length; index += 1) {
    const scene = sceneTexts[index];
    const title = scene.title.trim();
    const subtitle = scene.subtitle.trim();
    if (!title && !subtitle) {
      continue;
    }
    const start = index * sceneDuration + 0.2;
    const end = (index + 1) * sceneDuration - 0.2;
    if (end <= start) {
      continue;
    }
    const fadeMs = 200;
    const fadeTag = `{\\fad(${fadeMs},${fadeMs})\\pos(${Math.round(width / 2)},${bottomThirdY})}`;
    if (title) {
      events.push(
        `Dialogue: 0,${assTime(start)},${assTime(end)},HCStoryTitle,,0,0,0,,${fadeTag}${escapeAssText(title)}`
      );
    }
    if (subtitle) {
      const subY = bottomThirdY + titleSize + SUBTITLE_GAP;
      const subFade = `{\\fad(${fadeMs},${fadeMs})\\pos(${Math.round(width / 2)},${subY})}`;
      events.push(
        `Dialogue: 0,${assTime(start)},${assTime(end)},HCStorySubtitle,,0,0,0,,${subFade}${escapeAssText(subtitle)}`
      );
    }
  }

  return [...header, ...events].join("\n");
}

function escapeFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:");
}

export type BurnStoryTextOverlayInput = {
  inputVideoPath: string;
  outputVideoPath: string;
  assContent: string;
  workDir: string;
};

export async function burnStoryTextOverlay(input: BurnStoryTextOverlayInput): Promise<void> {
  const assPath = path.join(input.workDir, "story-overlay.ass");
  await fs.writeFile(assPath, input.assContent, "utf8");
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const assEscaped = escapeFilterPath(assPath);
  const vf = `subtitles='${assEscaped}'`;
  const args = [
    "-y",
    "-i",
    input.inputVideoPath,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-c:a",
    "copy",
    input.outputVideoPath,
  ];
  let result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 10 * 60 * 1000 });
  if (result.code !== 0) {
    const fallbackArgs = [
      "-y",
      "-i",
      input.inputVideoPath,
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      input.outputVideoPath,
    ];
    result = await runFfmpegCapture(ffmpeg, fallbackArgs, { timeoutMs: 10 * 60 * 1000 });
  }
  if (result.code !== 0) {
    throw new Error(
      `Story text overlay failed: ${result.output?.slice(-500) ?? "ffmpeg error"}`
    );
  }
}

export async function applyStorySceneTextOverlay(params: {
  inputVideoPath: string;
  outputVideoPath: string;
  sceneTexts: InstantSceneText[];
  durationSeconds: number;
  width: number;
  height: number;
  workDir: string;
  template?: StoryOverlayTemplate;
}): Promise<boolean> {
  const hasCopy = params.sceneTexts.some((s) => s.title.trim() || s.subtitle.trim());
  if (!hasCopy) {
    return false;
  }
  const assContent = buildStoryOverlayAss({
    sceneTexts: params.sceneTexts,
    durationSeconds: params.durationSeconds,
    width: params.width,
    height: params.height,
    template: params.template ?? "cinematic",
  });
  await burnStoryTextOverlay({
    inputVideoPath: params.inputVideoPath,
    outputVideoPath: params.outputVideoPath,
    assContent,
    workDir: params.workDir,
  });
  return true;
}

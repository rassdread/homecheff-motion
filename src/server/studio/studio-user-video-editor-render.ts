/**
 * Local montage for the user video editor.
 * Reuses the story overlay, closing-logo burn, and studio audio mix.
 * Does not import or call Vidu, OpenAI, or a paid voice provider.
 */

import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getResolvedFfprobePathSync, resolveFfmpegBinaries } from "@/lib/ffmpeg/resolve-ffmpeg-binaries";
import {
  activeEditorScenes,
  duckingWindowsForEditor,
  editorVoiceById,
  outputDurationSeconds,
  sceneTimeline,
  textStyleLayers,
  type UserVideoEditorDocument,
} from "@/lib/studio-user-video-editor";
import { burnClosingLogoOverlay } from "@/lib/studio-closing-logo-overlay";
import { mixStudioAudioLayers, muxStudioVideoWithMixedAudio } from "@/lib/studio-audio-mix-ffmpeg";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import { probeVideoDurationSeconds } from "@/server/instant-premium/poster-motion/probe-media-dimensions";
import {
  applyStorySceneTextOverlay,
  burnStoryTextOverlay,
} from "@/server/animation-export/story-text-overlay";

const execFileAsync = promisify(execFile);

export class EditorVoiceUnavailableError extends Error {
  readonly code = "VOICE_UNAVAILABLE";
  constructor(readonly voiceId: string) {
    super("VOICE_UNAVAILABLE");
    this.name = "EditorVoiceUnavailableError";
  }
}

export type EditorRenderInput = {
  document: UserVideoEditorDocument;
  sources: Array<{ sceneId: string; filePath: string }>;
  logoPath?: string | null;
  musicPath?: string | null;
  outputPath: string;
  workDir: string;
  quality: "preview" | "export";
  availableVoiceIds: readonly string[];
};

export async function listAvailableEditorVoiceIds(): Promise<string[]> {
  if (process.platform !== "darwin") return [];
  try {
    const { stdout } = await execFileAsync("say", ["-v", "?"], { timeout: 10_000 });
    const names = new Set(
      stdout
        .split("\n")
        .map((line) => line.trim().split(/\s+/)[0] ?? "")
        .filter(Boolean)
    );
    return ["ellen", "xander", "samantha", "daniel"].filter((id) => {
      const voice = editorVoiceById(id);
      return voice ? names.has(voice.sayName) : false;
    });
  } catch {
    return [];
  }
}

function assertRealPath(filePath: string, roots: string[]): string {
  const resolved = path.resolve(filePath);
  if (resolved.includes("\0")) {
    throw new Error("PATH_REJECTED");
  }
  const allowed = roots.some((root) => resolved === root || resolved.startsWith(`${path.resolve(root)}${path.sep}`));
  if (!allowed) {
    throw new Error("PATH_REJECTED");
  }
  return resolved;
}

async function sourceHasAudio(filePath: string): Promise<boolean> {
  await resolveFfmpegBinaries();
  const ffprobe = getResolvedFfprobePathSync();
  const result = await runFfmpegCapture(ffprobe, [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_type",
    "-of",
    "csv=p=0",
    filePath,
  ]);
  return result.code === 0 && result.output.includes("audio");
}

async function renderSceneClip(params: {
  sourcePath: string;
  outputPath: string;
  trimStart: number;
  trimEnd: number;
  speed: number;
  preset: string;
  crf: string;
}): Promise<void> {
  const span = Math.max(0.4, params.trimEnd - params.trimStart);
  const speed = params.speed;
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const hasAudio = await sourceHasAudio(params.sourcePath);
  const video = `setpts=PTS/${speed},scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,format=yuv420p`;
  const args = ["-y", "-ss", params.trimStart.toFixed(3), "-t", span.toFixed(3), "-i", params.sourcePath];
  if (!hasAudio) {
    args.push("-f", "lavfi", "-t", (span / speed + 0.2).toFixed(3), "-i", "anullsrc=channel_layout=mono:sample_rate=44100");
  }
  const audio = hasAudio
    ? `[0:a]atempo=${speed},aformat=sample_rates=44100:channel_layouts=mono[a]`
    : "[1:a]aformat=sample_rates=44100:channel_layouts=mono,atrim=0:3600[a]";
  args.push(
    "-filter_complex",
    `[0:v]${video}[v];${audio}`,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-preset",
    params.preset,
    "-crf",
    params.crf,
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-shortest",
    "-movflags",
    "+faststart",
    params.outputPath
  );
  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 8 * 60 * 1000 });
  if (result.code !== 0) {
    throw new Error(result.output.slice(-400) || "SCENE_RENDER_FAILED");
  }
}

function assTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${secs.toFixed(2).padStart(5, "0")}`;
}

function assColor(hex: string): string {
  const raw = hex.replace("#", "");
  const r = raw.slice(0, 2);
  const g = raw.slice(2, 4);
  const b = raw.slice(4, 6);
  return `&H00${b}${g}${r}&`;
}

function escapeAss(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

function ctaMotionTag(animation: UserVideoEditorDocument["cta"]["animation"]): string {
  if (animation === "fade") return "{\\fad(280,220)}";
  if (animation === "scale") return "{\\fad(200,220)\\fscx92\\fscy92\\t(0,420,\\fscx100\\fscy100)}";
  return "{\\fad(180,220)\\move(360,1180,360,1080,0,420)}";
}

function buildCtaAss(document: UserVideoEditorDocument, duration: number): string | null {
  if (!document.cta.enabled || !document.cta.title.trim()) return null;
  const start = Math.max(0, Math.min(document.cta.startSeconds, Math.max(0, duration - 0.6)));
  const end = Math.max(start + 0.6, Math.min(document.cta.endSeconds || duration, duration));
  const lines = [document.cta.title, document.cta.subtitle, document.cta.website].map((line) => line.trim()).filter(Boolean);
  const color = assColor(document.cta.color);
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 720",
    "PlayResY: 1280",
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Cta,Arial,42,${color},&H000000FF,&H00FFFFFF,&H64000000,-1,0,0,0,100,100,0,0,3,8,0,2,64,64,210,1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    `Dialogue: 0,${assTime(start)},${assTime(end)},Cta,,0,0,0,,${ctaMotionTag(document.cta.animation)}${lines.map(escapeAss).join("\\N")}`,
  ].join("\n");
}

async function synthesizeVoice(params: {
  document: UserVideoEditorDocument;
  workDir: string;
  availableVoiceIds: readonly string[];
  duration: number;
}): Promise<string | null> {
  const timeline = sceneTimeline(params.document.scenes);
  const spoken = timeline.filter((scene) => params.document.voice.enabled && scene.voiceOverText.trim());
  if (spoken.length === 0) return null;
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const parts: string[] = [];
  for (const scene of timeline) {
    const dest = path.join(params.workDir, `voice-${scene.order}.wav`);
    const text = params.document.voice.enabled ? scene.voiceOverText.trim() : "";
    if (!text) {
      const silent = await runFfmpegCapture(ffmpeg, [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=mono:sample_rate=44100",
        "-t",
        scene.durationSeconds.toFixed(3),
        dest,
      ]);
      if (silent.code !== 0) throw new Error("VOICE_SILENCE_FAILED");
      parts.push(dest);
      continue;
    }
    const voice = editorVoiceById(scene.voiceId ?? params.document.voice.voiceId);
    if (!voice || !params.availableVoiceIds.includes(voice.id)) {
      throw new EditorVoiceUnavailableError(scene.voiceId ?? params.document.voice.voiceId);
    }
    const aiff = path.join(params.workDir, `voice-${scene.order}.aiff`);
    const wordsPerMinute = String(Math.round(175 * params.document.voice.rate));
    try {
      await execFileAsync("say", ["-v", voice.sayName, "-r", wordsPerMinute, "-o", aiff, text], {
        timeout: 30_000,
      });
    } catch {
      throw new EditorVoiceUnavailableError(voice.id);
    }
    const voiced = await runFfmpegCapture(ffmpeg, [
      "-y",
      "-i",
      aiff,
      "-af",
      `loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:${scene.durationSeconds.toFixed(3)}`,
      "-ar",
      "44100",
      "-ac",
      "1",
      dest,
    ]);
    if (voiced.code !== 0) throw new EditorVoiceUnavailableError(voice.id);
    parts.push(dest);
  }
  const listPath = path.join(params.workDir, "voice-concat.txt");
  await writeFile(listPath, parts.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"));
  const mixed = path.join(params.workDir, "voice.wav");
  const concat = await runFfmpegCapture(ffmpeg, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c:a",
    "pcm_s16le",
    "-ar",
    "44100",
    "-ac",
    "1",
    mixed,
  ]);
  if (concat.code !== 0) throw new Error("VOICE_CONCAT_FAILED");
  return mixed;
}

export async function renderUserVideoEditor(input: EditorRenderInput): Promise<{
  durationSeconds: number;
  creditsCharged: 0;
  providerCalls: [];
}> {
  const roots = [input.workDir, path.dirname(input.outputPath), process.cwd(), os.tmpdir(), "/tmp", "/private/tmp"];
  const scenes = activeEditorScenes(input.document);
  if (scenes.length === 0) throw new Error("NO_SCENES");
  await mkdir(input.workDir, { recursive: true });
  const preset = input.quality === "preview" ? "veryfast" : "fast";
  const crf = input.quality === "preview" ? "23" : "18";
  const sourceById = new Map(input.sources.map((source) => [source.sceneId, source.filePath]));
  const clipPaths: string[] = [];
  const layers = textStyleLayers(input.document.textStyle, input.document.fontFamily);

  for (const scene of scenes) {
    const source = sourceById.get(scene.id);
    if (!source) throw new Error("SCENE_SOURCE_MISSING");
    const safeSource = assertRealPath(source, roots);
    const clip = path.join(input.workDir, `clip-${scene.order}.mp4`);
    await renderSceneClip({
      sourcePath: safeSource,
      outputPath: clip,
      trimStart: scene.trimStart,
      trimEnd: scene.trimEnd,
      speed: scene.speed,
      preset,
      crf,
    });
    const titled = path.join(input.workDir, `titled-${scene.order}.mp4`);
    const duration = (await probeVideoDurationSeconds(clip)) ?? (scene.trimEnd - scene.trimStart) / scene.speed;
    if (scene.visualText.trim()) {
      const overlayDir = path.join(input.workDir, `overlay-${scene.order}`);
      await mkdir(overlayDir, { recursive: true });
      const burned = await applyStorySceneTextOverlay({
        inputVideoPath: clip,
        outputVideoPath: titled,
        durationSeconds: duration,
        width: 720,
        height: 1280,
        workDir: overlayDir,
        adaptiveOverlay: false,
        sceneTexts: [
          {
            title: scene.visualText,
            overlayLayerStyles: layers,
          },
        ],
      });
      clipPaths.push(burned ? titled : clip);
    } else {
      clipPaths.push(clip);
    }
  }

  const concatList = path.join(input.workDir, "concat.txt");
  await writeFile(concatList, clipPaths.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"));
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const concatenated = path.join(input.workDir, "concat.mp4");
  const concat = await runFfmpegCapture(ffmpeg, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatList,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    concatenated,
  ]);
  if (concat.code !== 0) throw new Error(concat.output.slice(-400) || "CONCAT_FAILED");

  let picture = concatenated;
  const duration = (await probeVideoDurationSeconds(picture)) ?? outputDurationSeconds(scenes);
  if (input.document.logo.enabled && input.logoPath) {
    const withLogo = path.join(input.workDir, "logo.mp4");
    await burnClosingLogoOverlay({
      inputVideoPath: picture,
      outputVideoPath: withLogo,
      logoPath: input.logoPath,
      startSeconds: 0,
      endSeconds: duration,
      videoDurationSeconds: duration,
      videoWidth: 720,
      placement: input.document.logo.position,
      widthFraction: input.document.logo.scale,
      opacity: input.document.logo.opacity,
    });
    picture = withLogo;
  }

  const cta = buildCtaAss(input.document, duration);
  if (cta) {
    const withCta = path.join(input.workDir, "cta.mp4");
    const ctaDir = path.join(input.workDir, "cta");
    await mkdir(ctaDir, { recursive: true });
    await burnStoryTextOverlay({
      inputVideoPath: picture,
      outputVideoPath: withCta,
      assContent: cta,
      workDir: ctaDir,
    });
    picture = withCta;
  }

  const voicePath = await synthesizeVoice({
    document: input.document,
    workDir: input.workDir,
    availableVoiceIds: input.availableVoiceIds,
    duration,
  });
  if (!voicePath && !input.musicPath) {
    const copy = await runFfmpegCapture(ffmpeg, ["-y", "-i", picture, "-c", "copy", "-movflags", "+faststart", input.outputPath]);
    if (copy.code !== 0) throw new Error("EXPORT_COPY_FAILED");
    return { durationSeconds: duration, creditsCharged: 0, providerCalls: [] };
  }

  const musicWav = input.musicPath ? path.join(input.workDir, "music.wav") : null;
  if (input.musicPath && musicWav) {
    const prepared = await runFfmpegCapture(ffmpeg, [
      "-y",
      "-i",
      input.musicPath,
      "-af",
      "loudnorm=I=-18:TP=-2:LRA=11",
      "-ar",
      "44100",
      "-ac",
      "1",
      musicWav,
    ]);
    if (prepared.code !== 0) throw new Error("MUSIC_PREPARE_FAILED");
  }

  const mixed = path.join(input.workDir, "mixed.m4a");
  const windows = duckingWindowsForEditor(input.document);
  const mix = await mixStudioAudioLayers({
    voicePath,
    musicPath: musicWav,
    outputPath: mixed,
    plan: {
      totalDurationSeconds: duration,
      duckingMode: input.document.music.ducking && voicePath ? "music_under_voice" : "none",
      voiceVolume: input.document.voice.volume,
      musicVolume: input.document.music.volume,
      soundVolume: 0,
      musicFadeInSeconds: input.document.music.fadeIn ? 1.2 : 0,
      musicFadeOutSeconds: input.document.music.fadeOut ? 1.5 : 0,
      musicHardCut: false,
      voiceAudioUrl: null,
      musicAudioUrl: null,
      soundAudioUrl: null,
      musicAssetName: input.document.music.trackId,
      soundAssetName: null,
      sceneSegments: sceneTimeline(input.document.scenes).map((scene) => ({
        sceneId: scene.id,
        order: scene.order,
        startSeconds: scene.startSeconds,
        durationSeconds: scene.durationSeconds,
        transitionType: "cut",
      })),
      mixReady: true,
      duckingEnvelopes: windows.map((window) => ({
        startSeconds: window.startSeconds,
        endSeconds: window.endSeconds,
        musicGain: window.musicGain,
        ambienceGain: 1,
        attackSeconds: 0.25,
        releaseSeconds: 0.45,
      })),
    },
  });
  if (!mix.ok) throw new Error(mix.message);

  const mux = await muxStudioVideoWithMixedAudio({
    videoPath: picture,
    mixedAudioPath: mixed,
    outputPath: input.outputPath,
    videoDurationSeconds: duration,
  });
  if (!mux.ok) throw new Error(mux.message);
  return { durationSeconds: duration, creditsCharged: 0, providerCalls: [] };
}

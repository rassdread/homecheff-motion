/**
 * Local film render. Uses the existing FFmpeg mix and subtitle burn.
 * Does not call Vidu, Replicate, ElevenLabs, or the wallet.
 */

import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { assertPathInsideRoots, resolveLocalEnglishVoice } from "@/lib/studio-film-export";
import { burnStoryTextOverlay } from "@/server/animation-export/story-text-overlay";
import { listAvailableEditorVoiceIds } from "@/server/studio/studio-user-video-editor-render";
import { closingLogoOverlayGeometry } from "@/lib/studio-closing-logo-overlay";
import { mixStudioAudioLayers, muxStudioVideoWithMixedAudio } from "@/lib/studio-audio-mix-ffmpeg";
import {
  buildDutchSubtitleTrack,
  planAdaptiveText,
  planFilmAudio,
  renderSrt,
  type FilmScenePlan,
  type StudioFilmProjectDocument,
} from "@/lib/studio-film-pipeline";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

const execFileAsync = promisify(execFile);

export type FilmRenderClip = {
  sceneId: string;
  filePath: string;
  backgroundLuma: number;
  kind?: "video" | "image";
};
export type FilmRenderAsset = { id: string; filePath: string };

/** ASS timestamps are hours:minutes:seconds.centiseconds. */
export function formatAssCentiseconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 100));
  const cs = total % 100;
  const whole = Math.floor(total / 100);
  const s = whole % 60;
  const m = Math.floor(whole / 60) % 60;
  const h = Math.floor(whole / 3600);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export function filmCtaWindow(durationSeconds: number, lastSubtitleEnd: number): { start: number; end: number } | null {
  if (!(durationSeconds > 0.8)) return null;
  const end = durationSeconds;
  const start = Math.max(0, lastSubtitleEnd, end - 1.6);
  if (!(end - start >= 0.5)) return null;
  return { start, end };
}

function assColor(hex: string): string {
  const raw = hex.replace("#", "");
  const r = raw.slice(0, 2);
  const g = raw.slice(2, 4);
  const b = raw.slice(4, 6);
  return `&H00${b}${g}${r}&`;
}

function assEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\N").replace(/\{/g, "\\{");
}

export function filmOverlayAss(
  project: StudioFilmProjectDocument,
  lumaByScene: Map<string, number> = new Map()
): string {
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 720",
    "PlayResY: 1280",
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Title,Arial,42,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,2,1,8,48,48,48,1",
    "Style: Sub,Arial,32,&H00F8F8FF,&H000000FF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,3,3,0,2,64,64,120,1",
    "Style: Cta,Arial,36,&H00526D00,&H000000FF,&H00FFFFFF,&H64000000,-1,0,0,0,100,100,0,0,3,6,0,2,64,64,220,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const cues = buildDutchSubtitleTrack(project.scenes).cues;
  const cueByScene = new Map(cues.map((cue) => [cue.sceneId, cue]));
  let cursor = 0;
  for (const scene of project.scenes) {
    const placement = planAdaptiveText({
      backgroundLuma: lumaByScene.get(scene.id) ?? 0.2,
      subjectBottom: scene.subjectBottom ?? null,
      userOverride: project.textOverride,
    });
    const start = formatAssCentiseconds(cursor);
    const end = formatAssCentiseconds(cursor + scene.durationSeconds);
    if (scene.englishTitle.trim()) {
      lines.push(
        `Dialogue: 0,${start},${end},Title,,0,0,0,,{\\pos(360,${placement.titleY})\\c${assColor(placement.titleColor)}\\3c&H00000000&}${assEscape(scene.englishTitle.trim())}`
      );
    }
    const cue = cueByScene.get(scene.id);
    if (cue) {
      lines.push(
        `Dialogue: 0,${formatAssCentiseconds(cue.startSeconds)},${formatAssCentiseconds(cue.endSeconds)},Sub,,0,0,0,,{\\pos(360,${placement.subtitleY})}${assEscape(cue.dutch)}`
      );
    }
    cursor += scene.durationSeconds;
  }
  const cta = [project.cta.title, project.cta.subtitle, project.cta.website].filter((line) => line.trim());
  const lastSubtitleEnd = cues.reduce((end, cue) => Math.max(end, cue.endSeconds), 0);
  const window = filmCtaWindow(cursor, lastSubtitleEnd);
  if (cta.length > 0 && window) {
    const ctaY = 1040;
    lines.push(
      `Dialogue: 0,${formatAssCentiseconds(window.start)},${formatAssCentiseconds(window.end)},Cta,,0,0,0,,{\\fad(160,160)\\pos(360,${ctaY})}${cta.map(assEscape).join("\\N")}`
    );
  }
  return `${lines.join("\n")}\n`;
}

async function run(ffmpeg: string, args: string[], label: string): Promise<void> {
  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 120_000 });
  if (result.code !== 0) throw new Error(result.output.slice(-400) || label);
}

export async function renderStudioFilmProject(input: {
  project: StudioFilmProjectDocument;
  clips: FilmRenderClip[];
  musicFiles: FilmRenderAsset[];
  sfxFiles: FilmRenderAsset[];
  logoPath?: string | null;
  workDir: string;
  outputPath: string;
  allowedRoots: string[];
  availableVoiceIds?: readonly string[];
}): Promise<{
  durationSeconds: number;
  srt: string;
  creditsCharged: 0;
  providerCalls: [];
  renderer: "film";
  voices: Array<{ role: string; sayName: string; accentFidelity: false }>;
}> {
  const lumaByScene = new Map(input.clips.map((clip) => [clip.sceneId, clip.backgroundLuma]));
  const ffmpeg = await resolveFfmpegForTextOverlay();
  await mkdir(input.workDir, { recursive: true });
  const roots = [...input.allowedRoots, input.workDir];
  for (const clip of input.clips) assertPathInsideRoots(clip.filePath, roots);
  for (const file of [...input.musicFiles, ...input.sfxFiles]) assertPathInsideRoots(file.filePath, roots);
  if (input.logoPath) assertPathInsideRoots(input.logoPath, roots);
  const total = input.project.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  const normalized: string[] = [];
  for (const scene of input.project.scenes) {
    const clip = input.clips.find((item) => item.sceneId === scene.id);
    if (!clip) throw new Error("SCENE_CLIP_MISSING");
    const dest = path.join(input.workDir, `${scene.id}.mp4`);
    const args = ["-y"];
    if (clip.kind === "image") args.push("-loop", "1", "-framerate", "30");
    args.push(
      "-i",
      clip.filePath,
      "-t",
      scene.durationSeconds.toFixed(3),
      "-vf",
      "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,format=yuv420p",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      dest
    );
    await run(ffmpeg, args, "SCENE_NORMALIZE_FAILED");
    normalized.push(dest);
  }
  const concatList = path.join(input.workDir, "concat.txt");
  await writeFile(concatList, normalized.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"));
  const picture = path.join(input.workDir, "picture.mp4");
  await run(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", concatList, "-c", "copy", picture], "CONCAT_FAILED");

  const silent = path.join(input.workDir, "silent.mp4");
  await run(
    ffmpeg,
    [
      "-y",
      "-i",
      picture,
      "-f",
      "lavfi",
      "-t",
      total.toFixed(3),
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
      silent,
    ],
    "SILENT_AUDIO_FAILED"
  );
  const ass = filmOverlayAss(input.project, lumaByScene);
  await writeFile(path.join(input.workDir, "film-overlay.ass"), ass);
  const burned = path.join(input.workDir, "burned.mp4");
  const assDir = path.join(input.workDir, "ass");
  await mkdir(assDir, { recursive: true });
  await burnStoryTextOverlay({ inputVideoPath: silent, outputVideoPath: burned, assContent: ass, workDir: assDir });
  let visual = burned;
  if (input.project.logo.enabled && input.logoPath) {
    const logo = closingLogoOverlayGeometry({ placement: "top-right", videoWidth: 720, widthFraction: 0.12 });
    const withLogo = path.join(input.workDir, "logo.mp4");
    await run(
      ffmpeg,
      [
        "-y",
        "-i",
        visual,
        "-i",
        input.logoPath,
        "-filter_complex",
        `[1:v]scale=${logo.width}:-1[lg];[0:v][lg]overlay=${logo.x}:${logo.y}`,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-an",
        withLogo,
      ],
      "LOGO_FAILED"
    );
    visual = withLogo;
  }

  const audio = planFilmAudio(input.project.scenes);
  const availableVoiceIds = input.availableVoiceIds ?? (await listAvailableEditorVoiceIds());
  const spoken = await speakFilmLines({
    ffmpeg,
    workDir: input.workDir,
    project: input.project,
    total,
    availableVoiceIds,
  });
  const music = await buildSceneMusic({
    ffmpeg,
    workDir: input.workDir,
    total,
    scenes: input.project.scenes,
    musicFiles: input.musicFiles,
    crossfadeSeconds: audio.musicCrossfades[0]?.seconds ?? 0.4,
  });
  const srt = renderSrt(buildDutchSubtitleTrack(input.project.scenes).cues);
  const srtPath = input.outputPath.replace(/\.mp4$/i, ".srt");
  await writeFile(srtPath, srt);
  const mixed = path.join(input.workDir, "mixed.m4a");
  const mix = await mixStudioAudioLayers({
    voicePath: spoken.filePath,
    musicPath: music,
    discreteSfxPaths: input.sfxFiles.map((file) => file.filePath),
    outputPath: mixed,
    plan: {
      totalDurationSeconds: total,
      duckingMode: "music_under_voice",
      voiceVolume: 1,
      musicVolume: 0.34,
      soundVolume: 0,
      musicFadeInSeconds: 0.2,
      musicFadeOutSeconds: 0.4,
      musicHardCut: false,
      voiceAudioUrl: null,
      musicAudioUrl: null,
      soundAudioUrl: null,
      musicAssetName: null,
      soundAssetName: null,
      sceneSegments: [],
      mixReady: true,
      discreteSfx: input.project.sfxCues.map((cue) => ({
        cueId: cue.id,
        url: cue.id,
        startSeconds: globalCueStart(input.project, cue.sceneId, cue.startSeconds),
        durationSeconds: cue.durationSeconds,
        volume: 0.8,
        assetId: cue.id,
      })),
      duckingEnvelopes: audio.ducking.map((window) => ({
        startSeconds: window.startSeconds,
        endSeconds: window.endSeconds,
        musicGain: window.musicGain,
        ambienceGain: 1,
        attackSeconds: 0.05,
        releaseSeconds: 0.12,
      })),
    },
  });
  if (!mix.ok) throw new Error(mix.message);
  const loudPath = path.join(input.workDir, "normalized.m4a");
  const loud = await runFfmpegCapture(
    ffmpeg,
    ["-y", "-i", mixed, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", loudPath],
    { timeoutMs: 120_000 }
  );
  const mux = await muxStudioVideoWithMixedAudio({
    videoPath: visual,
    mixedAudioPath: loud.code === 0 ? loudPath : mixed,
    outputPath: input.outputPath,
    videoDurationSeconds: total,
  });
  if (!mux.ok) throw new Error(mux.message);
  return { durationSeconds: total, srt, creditsCharged: 0, providerCalls: [], renderer: "film", voices: spoken.voices };
}

function globalCueStart(project: StudioFilmProjectDocument, sceneId: string, startSeconds: number): number {
  let cursor = 0;
  for (const scene of project.scenes) {
    if (scene.id === sceneId) return cursor + startSeconds;
    cursor += scene.durationSeconds;
  }
  return startSeconds;
}

async function speakFilmLines(input: {
  ffmpeg: string;
  workDir: string;
  project: StudioFilmProjectDocument;
  total: number;
  availableVoiceIds: readonly string[];
}): Promise<{ filePath: string | null; voices: Array<{ role: string; sayName: string; accentFidelity: false }> }> {
  const voices: Array<{ role: string; sayName: string; accentFidelity: false }> = [];
  const pieces: Array<{ startSeconds: number; durationSeconds: number; filePath: string }> = [];
  let cursor = 0;
  for (const scene of input.project.scenes) {
    const speech = scene.shots.find((shot) => shot.role === "speaking_closeup");
    const text = scene.englishDialogue.replace(/[\r\n]+/g, " ").trim();
    if (speech && text) {
      const voice = resolveLocalEnglishVoice(scene.voiceRole, input.availableVoiceIds);
      if (!voice.sayName) throw new Error(`FILM_VOICE_UNAVAILABLE:${scene.voiceRole}`);
      voices.push({ role: scene.voiceRole, sayName: voice.sayName, accentFidelity: false });
      const aiff = path.join(input.workDir, `speech-${scene.id}.aiff`);
      const wav = path.join(input.workDir, `speech-${scene.id}.wav`);
      try {
        await execFileAsync("say", ["-v", voice.sayName, "-r", "170", "-o", aiff, text], { timeout: 30_000 });
      } catch {
        throw new Error(`FILM_VOICE_UNAVAILABLE:${scene.voiceRole}`);
      }
      const converted = await runFfmpegCapture(
        input.ffmpeg,
        ["-y", "-i", aiff, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", wav],
        { timeoutMs: 30_000 }
      );
      if (converted.code !== 0) throw new Error("FILM_VOICE_FAILED");
      pieces.push({ startSeconds: cursor + speech.startSeconds, durationSeconds: speech.durationSeconds, filePath: wav });
    }
    cursor += scene.durationSeconds;
  }
  if (pieces.length === 0) return { filePath: null, voices };
  const dest = path.join(input.workDir, "voice.wav");
  const args = ["-y", "-f", "lavfi", "-t", input.total.toFixed(3), "-i", "anullsrc=channel_layout=mono:sample_rate=44100"];
  pieces.forEach((piece) => args.push("-i", piece.filePath));
  const chains = pieces.map((piece, index) => {
    const delay = Math.round(piece.startSeconds * 1000);
    return `[${index + 1}:a]atrim=0:${piece.durationSeconds.toFixed(3)},apad,atrim=0:${piece.durationSeconds.toFixed(3)},adelay=${delay}|${delay},apad,atrim=0:${input.total.toFixed(3)}[p${index}]`;
  });
  chains.push(
    `[0:a]${pieces.map((_, index) => `[p${index}]`).join("")}amix=inputs=${pieces.length + 1}:duration=first:normalize=0,alimiter=limit=0.9[aout]`
  );
  args.push("-filter_complex", chains.join(";"), "-map", "[aout]", dest);
  await run(input.ffmpeg, args, "VOICE_BED_FAILED");
  return { filePath: dest, voices };
}

async function buildSceneMusic(input: {
  ffmpeg: string;
  workDir: string;
  total: number;
  scenes: FilmScenePlan[];
  musicFiles: FilmRenderAsset[];
  crossfadeSeconds: number;
}): Promise<string | null> {
  const used = input.scenes.filter((scene) => input.musicFiles.some((file) => file.id === scene.musicTrackId));
  if (used.length === 0) return null;
  const dest = path.join(input.workDir, "music.wav");
  const args = ["-y"];
  const chains: string[] = [];
  const labels: string[] = [];
  let cursor = 0;
  let inputIndex = 0;
  for (let index = 0; index < input.scenes.length; index += 1) {
    const scene = input.scenes[index]!;
    const file = input.musicFiles.find((item) => item.id === scene.musicTrackId);
    if (!file) {
      cursor += scene.durationSeconds;
      continue;
    }
    args.push("-i", file.filePath);
    const previous = input.scenes[index - 1];
    const next = input.scenes[index + 1];
    const fadeIn = previous && previous.musicTrackId !== scene.musicTrackId ? input.crossfadeSeconds : 0;
    const fadeOut = next && next.musicTrackId !== scene.musicTrackId ? input.crossfadeSeconds : 0;
    const delay = Math.round(cursor * 1000);
    let chain = `[${inputIndex}:a]atrim=0:${scene.durationSeconds.toFixed(3)},asetpts=PTS-STARTPTS`;
    if (fadeIn > 0) chain += `,afade=t=in:st=0:d=${fadeIn.toFixed(3)}`;
    if (fadeOut > 0) chain += `,afade=t=out:st=${Math.max(0, scene.durationSeconds - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}`;
    chain += `,volume=0.8,adelay=${delay}|${delay},apad,atrim=0:${input.total.toFixed(3)}[m${inputIndex}]`;
    chains.push(chain);
    labels.push(`[m${inputIndex}]`);
    inputIndex += 1;
    cursor += scene.durationSeconds;
  }
  chains.push(`${labels.join("")}amix=inputs=${labels.length}:duration=longest:normalize=0,alimiter=limit=0.9[aout]`);
  args.push("-filter_complex", chains.join(";"), "-map", "[aout]", dest);
  await writeFile(path.join(input.workDir, "music-filter.txt"), chains.join("\n"));
  await run(input.ffmpeg, args, "MUSIC_BED_FAILED");
  return dest;
}

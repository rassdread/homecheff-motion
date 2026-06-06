/**
 * Studio — FFmpeg multi-track audio mix (voice + music + sound) via amix.
 */

import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import type { StudioAudioMixPlan } from "@/lib/studio-audio-mix-timeline";
import { buildStudioVoiceMuxFfmpegArgs, muxStudioVoiceAudio } from "@/lib/studio-voice-ffmpeg";

export function buildStudioAudioMixFilterComplex(params: {
  plan: Pick<
    StudioAudioMixPlan,
    | "totalDurationSeconds"
    | "voiceVolume"
    | "musicVolume"
    | "soundVolume"
    | "musicFadeInSeconds"
    | "musicFadeOutSeconds"
  >;
  hasVoice: boolean;
  hasMusic: boolean;
  hasSound: boolean;
}): { filterComplex: string; outputLabel: string } {
  const dur = Math.max(0.5, params.plan.totalDurationSeconds);
  const fi = Math.max(0, params.plan.musicFadeInSeconds);
  const fo = Math.max(0, params.plan.musicFadeOutSeconds);
  const fadeOutStart = Math.max(0, dur - fo);

  const chains: string[] = [];
  const labels: string[] = [];
  let inputIndex = 0;

  if (params.hasVoice) {
    chains.push(`[${inputIndex}:a]volume=${params.plan.voiceVolume.toFixed(3)}[a${inputIndex}]`);
    labels.push(`[a${inputIndex}]`);
    inputIndex++;
  }

  if (params.hasMusic) {
    let musicChain = `[${inputIndex}:a]aloop=loop=-1:size=2e+09,atrim=0:${dur.toFixed(3)}`;
    if (fi > 0) {
      musicChain += `,afade=t=in:st=0:d=${fi.toFixed(3)}`;
    }
    if (fo > 0) {
      musicChain += `,afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fo.toFixed(3)}`;
    }
    musicChain += `,volume=${params.plan.musicVolume.toFixed(3)}[a${inputIndex}]`;
    chains.push(musicChain);
    labels.push(`[a${inputIndex}]`);
    inputIndex++;
  }

  if (params.hasSound) {
    const soundChain = `[${inputIndex}:a]aloop=loop=-1:size=2e+09,atrim=0:${dur.toFixed(3)},volume=${params.plan.soundVolume.toFixed(3)}[a${inputIndex}]`;
    chains.push(soundChain);
    labels.push(`[a${inputIndex}]`);
    inputIndex++;
  }

  if (labels.length === 0) {
    return { filterComplex: "anullsrc=r=44100:cl=stereo,atrim=0:0.1[aout]", outputLabel: "[aout]" };
  }

  if (labels.length === 1) {
    return { filterComplex: chains[0]!.replace(`[a${inputIndex - 1}]`, "[aout]"), outputLabel: "[aout]" };
  }

  const mixInputs = labels.length;
  chains.push(`${labels.join("")}amix=inputs=${mixInputs}:duration=first:dropout_transition=0[aout]`);
  return { filterComplex: chains.join(";"), outputLabel: "[aout]" };
}

export function buildStudioAudioMixFfmpegArgs(params: {
  inputPaths: string[];
  outputPath: string;
  filterComplex: string;
  outputLabel: string;
  durationSeconds: number;
}): string[] {
  const args = ["-y"];
  for (const path of params.inputPaths) {
    args.push("-i", path);
  }
  args.push(
    "-filter_complex",
    params.filterComplex,
    "-map",
    params.outputLabel,
    "-t",
    String(Math.max(0.1, params.durationSeconds)),
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    params.outputPath
  );
  return args;
}

export async function mixStudioAudioLayers(params: {
  voicePath?: string | null;
  musicPath?: string | null;
  soundPath?: string | null;
  outputPath: string;
  plan: StudioAudioMixPlan;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const hasVoice = Boolean(params.voicePath);
  const hasMusic = Boolean(params.musicPath);
  const hasSound = Boolean(params.soundPath);

  if (!hasVoice && !hasMusic && !hasSound) {
    return { ok: false, message: "No audio layers to mix." };
  }

  const inputPaths = [params.voicePath, params.musicPath, params.soundPath].filter(
    (p): p is string => Boolean(p)
  );

  if (inputPaths.length === 1) {
    const ffmpeg = await resolveFfmpegForTextOverlay();
    const dur = Math.max(0.1, params.plan.totalDurationSeconds);
    const args = [
      "-y",
      "-i",
      inputPaths[0]!,
      "-t",
      String(dur),
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      params.outputPath,
    ];
    const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 10 * 60 * 1000 });
    if (result.code !== 0) {
      return { ok: false, message: result.output?.slice(-500) ?? "Audio mix failed." };
    }
    return { ok: true };
  }

  const { filterComplex, outputLabel } = buildStudioAudioMixFilterComplex({
    plan: params.plan,
    hasVoice,
    hasMusic,
    hasSound,
  });

  const ffmpeg = await resolveFfmpegForTextOverlay();
  const args = buildStudioAudioMixFfmpegArgs({
    inputPaths,
    outputPath: params.outputPath,
    filterComplex,
    outputLabel,
    durationSeconds: params.plan.totalDurationSeconds,
  });
  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 10 * 60 * 1000 });
  if (result.code !== 0) {
    return { ok: false, message: result.output?.slice(-500) ?? "Audio mix failed." };
  }
  return { ok: true };
}

export async function muxStudioVideoWithMixedAudio(params: {
  videoPath: string;
  mixedAudioPath: string;
  outputPath: string;
  videoDurationSeconds: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return muxStudioVoiceAudio({
    videoPath: params.videoPath,
    audioPath: params.mixedAudioPath,
    outputPath: params.outputPath,
    videoDurationSeconds: params.videoDurationSeconds,
  });
}

export { buildStudioVoiceMuxFfmpegArgs };

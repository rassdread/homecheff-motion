/**
 * Timeline → existing mixer inputs.
 * Does not spawn FFmpeg, call a provider, or write a wallet.
 *
 * Gap policy: HOLD_BLACK. Empty time between picture clips stays empty
 * black of that length. Clips are not packed together and are not stretched.
 * Overlapping picture clips are rejected. This pipeline concatenates;
 * it does not composite two pictures at once.
 *
 * Audio placement uses the existing mixer. The earliest music clip uses the
 * music bed, including when it starts after 0. musicStartSeconds delays that
 * bed; ducking envelopes stay on the film clock. Later music clips use the
 * discrete cue path and are not ducked, because the mixer has one music bed.
 */

import { MUSIC_UNDER_VOICE_GAIN } from "@/lib/studio-audio-ducking";
import { mixVolumeFromPercent, type StudioAudioMixPlan } from "@/lib/studio-audio-mix-timeline";

export const TIMELINE_GAP_POLICY = "hold_black" as const;

export type TimelineVisualKind = "video" | "still";
export type TimelineAudioTrack = "DIALOGUE" | "NARRATION" | "MUSIC" | "SFX";

export type TimelineVisualInput = {
  path: string;
  kind: TimelineVisualKind;
  startMs: number;
  durationMs: number;
  inMs: number;
};

export type TimelineAudioInput = {
  track: TimelineAudioTrack;
  path: string;
  startMs: number;
  durationMs: number;
  inMs: number;
  volume: number;
};

export type VisualPiece =
  | { kind: "black"; durationMs: number }
  | { kind: "video" | "still"; path: string; inMs: number; durationMs: number };

export type TimelineMixRequest = {
  plan: StudioAudioMixPlan;
  musicPath: string | null;
  discretePaths: string[];
  /** Discrete cues whose source must be trimmed to inMs before the mixer sees them. */
  discreteTrim: Array<{ path: string; inMs: number; durationMs: number }>;
};

export function characterMasterBlocked(input: {
  assignedCharacters: number;
  characterReferenceUrls: string[];
  pickedUrls: string[];
}): boolean {
  if (input.assignedCharacters <= 0) return false;
  return !input.characterReferenceUrls.some((url) => url.trim() && input.pickedUrls.includes(url));
}

export function assembleVisualPieces(
  clips: TimelineVisualInput[],
): { ok: true; pieces: VisualPiece[]; totalMs: number } | { ok: false; code: "timing" | "overlap" | "missing_video" } {
  if (clips.length === 0) return { ok: false, code: "missing_video" };
  const ordered = [...clips].sort((a, b) => a.startMs - b.startMs || a.durationMs - b.durationMs);
  for (const clip of ordered) {
    if (!clip.path.trim() || !Number.isInteger(clip.startMs) || !Number.isInteger(clip.durationMs) || !Number.isInteger(clip.inMs)) {
      return { ok: false, code: "timing" };
    }
    if (clip.startMs < 0 || clip.durationMs <= 0 || clip.inMs < 0) return { ok: false, code: "timing" };
  }
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]!;
    const current = ordered[index]!;
    if (current.startMs < previous.startMs + previous.durationMs) return { ok: false, code: "overlap" };
  }
  const pieces: VisualPiece[] = [];
  let cursor = 0;
  for (const clip of ordered) {
    if (clip.startMs > cursor) pieces.push({ kind: "black", durationMs: clip.startMs - cursor });
    pieces.push({ kind: clip.kind, path: clip.path, inMs: clip.inMs, durationMs: clip.durationMs });
    cursor = clip.startMs + clip.durationMs;
  }
  return { ok: true, pieces, totalMs: cursor };
}

export function buildTimelineMixRequest(input: {
  totalMs: number;
  clips: TimelineAudioInput[];
}): TimelineMixRequest | { ok: false; code: "timing" } {
  const totalSeconds = Math.max(0.1, input.totalMs / 1000);
  const usable = input.clips.filter((clip) => clip.path.trim() && clip.volume > 0);
  for (const clip of usable) {
    if (clip.startMs < 0 || clip.durationMs <= 0 || clip.inMs < 0) return { ok: false, code: "timing" };
  }
  const musicBed = usable
    .filter((clip) => clip.track === "MUSIC")
    .sort((a, b) => a.startMs - b.startMs || a.durationMs - b.durationMs)[0] ?? null;
  const discrete = usable.filter((clip) => clip !== musicBed);
  const speech = usable.filter((clip) => clip.track === "DIALOGUE" || clip.track === "NARRATION");
  const plan: StudioAudioMixPlan = {
    totalDurationSeconds: totalSeconds,
    duckingMode: speech.length > 0 ? "music_under_voice" : "none",
    voiceVolume: 1,
    musicVolume: musicBed ? mixVolumeFromPercent(musicBed.volume) : 0,
    soundVolume: 0,
    musicFadeInSeconds: 0,
    musicFadeOutSeconds: 0,
    musicHardCut: false,
    voiceAudioUrl: null,
    musicAudioUrl: musicBed?.path ?? null,
    soundAudioUrl: null,
    musicAssetName: null,
    soundAssetName: null,
    sceneSegments: [],
    mixReady: usable.length > 0,
    musicSourceOffsetSeconds: musicBed ? musicBed.inMs / 1000 : 0,
    musicStartSeconds: musicBed ? musicBed.startMs / 1000 : 0,
    musicDurationSeconds: musicBed ? musicBed.durationMs / 1000 : undefined,
    duckingEnvelopes: musicBed
      ? speech.map((clip) => ({
          startSeconds: clip.startMs / 1000,
          endSeconds: (clip.startMs + clip.durationMs) / 1000,
          musicGain: MUSIC_UNDER_VOICE_GAIN,
          ambienceGain: 1,
          attackSeconds: 0.05,
          releaseSeconds: 0.2,
        }))
      : [],
    discreteSfx: discrete.map((clip, index) => ({
      cueId: `cue-${index}`,
      url: clip.path,
      startSeconds: clip.startMs / 1000,
      durationSeconds: clip.durationMs / 1000,
      volume: mixVolumeFromPercent(clip.volume),
      assetId: null,
    })),
  };
  return {
    plan,
    musicPath: musicBed?.path ?? null,
    discretePaths: discrete.map((clip) => clip.path),
    discreteTrim: discrete.map((clip) => ({ path: clip.path, inMs: clip.inMs, durationMs: clip.durationMs })),
  };
}

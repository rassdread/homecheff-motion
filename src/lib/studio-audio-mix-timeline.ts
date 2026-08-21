import type { AudioDuckingMode } from "@/types/studio-audio-production-director";
import type { MusicEndBehavior, MusicStartBehavior, MusicTransitionType } from "@/types/studio-music-director";

export type StudioAudioMixSceneSegment = {
  sceneId: string;
  order: number;
  startSeconds: number;
  durationSeconds: number;
  transitionType: MusicTransitionType | string;
};

export type StudioAudioMixPlan = {
  totalDurationSeconds: number;
  duckingMode: AudioDuckingMode;
  voiceVolume: number;
  musicVolume: number;
  soundVolume: number;
  musicFadeInSeconds: number;
  musicFadeOutSeconds: number;
  musicHardCut: boolean;
  voiceAudioUrl: string | null;
  musicAudioUrl: string | null;
  soundAudioUrl: string | null;
  musicAssetName: string | null;
  soundAssetName: string | null;
  sceneSegments: StudioAudioMixSceneSegment[];
  mixReady: boolean;
  /** S2E — discrete timed SFX (same asset may appear multiple times). */
  discreteSfx?: Array<{
    cueId: string;
    url: string;
    startSeconds: number;
    durationSeconds: number;
    volume: number;
    assetId: string | null;
  }>;
  /** S2E-P1 — timed ducking envelopes executed in FFmpeg (not static bed attenuation). */
  duckingEnvelopes?: Array<{
    startSeconds: number;
    endSeconds: number;
    musicGain: number;
    ambienceGain: number;
    attackSeconds: number;
    releaseSeconds: number;
  }>;
  /** S2E timeline fingerprint — 0 provider rebuilds when hash matches. */
  timelineHash?: string | null;
  musicSourceOffsetSeconds?: number;
};

export type StudioAudioMixHandoffPlan = StudioAudioMixPlan & {
  enabled: boolean;
  musicEnabled: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
};

export function mixVolumeFromPercent(value: number): number {
  return Math.max(0, Math.min(1, value / 100));
}

export function fadeSecondsFromStartBehavior(behavior: MusicStartBehavior | string): number {
  if (behavior === "fade_in" || behavior === "ambient_pad") {
    return 2;
  }
  return 0;
}

export function fadeSecondsFromEndBehavior(behavior: MusicEndBehavior | string): number {
  if (behavior === "fade_out" || behavior === "tail") {
    return 2;
  }
  return 0;
}

export function isHardCutTransition(transition: MusicTransitionType | string): boolean {
  return transition === "hard_cut";
}

export function duckingMusicMultiplier(
  mode: AudioDuckingMode,
  hasVoice: boolean
): number {
  if (!hasVoice) {
    return 1;
  }
  switch (mode) {
    case "full_under_voice":
      return 0.2;
    case "music_under_voice":
      return 0.35;
    case "ambient_reduce":
      return 0.55;
    case "none":
    default:
      return 0.65;
  }
}

export function duckingSoundMultiplier(
  mode: AudioDuckingMode,
  hasVoice: boolean
): number {
  if (!hasVoice) {
    return 1;
  }
  if (mode === "ambient_reduce" || mode === "full_under_voice") {
    return 0.45;
  }
  return 0.7;
}

export function buildSceneTimelineSegments(
  scenes: Array<{ id: string; order: number; durationSeconds: number; musicTransitionType?: string }>
): StudioAudioMixSceneSegment[] {
  const sorted = [...scenes].sort((a, b) => a.order - b.order);
  let cursor = 0;
  return sorted.map((scene) => {
    const duration = Math.max(0.5, scene.durationSeconds || 5);
    const segment: StudioAudioMixSceneSegment = {
      sceneId: scene.id,
      order: scene.order,
      startSeconds: cursor,
      durationSeconds: duration,
      transitionType: scene.musicTransitionType?.trim() || "crossfade",
    };
    cursor += duration;
    return segment;
  });
}

export function totalDurationFromSegments(segments: StudioAudioMixSceneSegment[]): number {
  if (segments.length === 0) {
    return 0;
  }
  const last = segments[segments.length - 1]!;
  return last.startSeconds + last.durationSeconds;
}

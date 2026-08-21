/**
 * S2E — Canonical audio / visual timeline contracts.
 * Bridge planning directors → executable mix. No DAW.
 */

export const STUDIO_AUDIO_TIMELINE_VERSION = "s2e.1" as const;

export type StudioVisualSceneSpan = {
  sceneId: string;
  order: number;
  startMs: number;
  endMs: number;
  visualDurationMs: number;
  transitionInMs: number;
  transitionOutMs: number;
};

export type StudioVisualTimeline = {
  version: typeof STUDIO_AUDIO_TIMELINE_VERSION;
  projectId: string;
  totalDurationMs: number;
  sceneSpans: StudioVisualSceneSpan[];
  source: "scene_duration_seconds";
};

export type StudioAudioCueKind =
  | "VOICE_CUE"
  | "MUSIC_CUE"
  | "SFX_CUE"
  | "AMBIENCE_CUE"
  | "DUCKING_CUE"
  | "SUBTITLE_CUE";

export type StudioAudioCueBase = {
  id: string;
  kind: StudioAudioCueKind;
  sceneId: string | null;
  /** Absolute project time (derived from visual spans). */
  startMs: number;
  endMs: number;
  durationMs: number;
  volume: number;
  /** Library / voice asset id — never a signed URL in logs. */
  assetId: string | null;
  /** Opaque pointer for mix execution (URL or storage key). */
  assetPointer: string | null;
  source: "voice_row" | "library" | "preset_hint" | "director" | "subtitle" | "derived";
};

export type StudioVoiceCue = StudioAudioCueBase & {
  kind: "VOICE_CUE";
  speakerId: string | null;
  textHash: string;
  voiceConfigHash: string;
  stale: boolean;
};

export type StudioMusicCue = StudioAudioCueBase & {
  kind: "MUSIC_CUE";
  /** Offset into source asset (music window). */
  sourceOffsetMs: number;
  loop: boolean;
  fadeInMs: number;
  fadeOutMs: number;
};

export type StudioSfxCue = StudioAudioCueBase & {
  kind: "SFX_CUE";
  cueType: string;
  discrete: true;
};

export type StudioAmbienceCue = StudioAudioCueBase & {
  kind: "AMBIENCE_CUE";
  cueType: string;
  discrete: false;
};

export type StudioDuckingCue = StudioAudioCueBase & {
  kind: "DUCKING_CUE";
  targetTrack: "music" | "ambience" | "both";
  gainMultiplier: number;
  attackMs: number;
  releaseMs: number;
  sourceVoiceCueId: string;
};

export type StudioSubtitleCue = StudioAudioCueBase & {
  kind: "SUBTITLE_CUE";
  text: string;
  language: string;
};

export type StudioAudioTimelineStatus =
  | "READY"
  | "MISSING_ASSET"
  | "STALE_ASSET"
  | "TIMING_CONFLICT"
  | "VOICE_TOO_LONG"
  | "UNRESOLVED_SFX"
  | "INVALID_WINDOW"
  | "EMPTY";

export type StudioAudioTimeline = {
  version: typeof STUDIO_AUDIO_TIMELINE_VERSION;
  projectId: string;
  totalDurationMs: number;
  sceneSpans: StudioVisualSceneSpan[];
  tracks: {
    voice: StudioVoiceCue[];
    music: StudioMusicCue[];
    sfx: StudioSfxCue[];
    ambience: StudioAmbienceCue[];
  };
  ducking: StudioDuckingCue[];
  subtitleCues: StudioSubtitleCue[];
  statuses: StudioAudioTimelineStatus[];
  /** Deterministic fingerprint — no URLs. */
  timelineHash: string;
  sourceHashes: {
    visualHash: string;
    dialogueHash: string;
    voiceConfigHash: string;
    musicConfigHash: string;
    sfxConfigHash: string;
  };
  providerCalls: 0;
};

export type DialogueDurationPolicy =
  | "EXTEND_SCENE"
  | "WARN_ONLY"
  | "CLIP_TO_SCENE";

export type StudioAudioMixExecutionPlan = {
  version: typeof STUDIO_AUDIO_TIMELINE_VERSION;
  totalDurationMs: number;
  timelineHash: string;
  voice: { url: string | null; volume: number };
  music: {
    url: string | null;
    volume: number;
    fadeInMs: number;
    fadeOutMs: number;
    loop: boolean;
    sourceOffsetMs: number;
  };
  ambience: { url: string | null; volume: number; loop: boolean };
  /** Discrete timed SFX — same asset may appear many times. */
  discreteSfx: Array<{
    cueId: string;
    url: string;
    startMs: number;
    durationMs: number;
    volume: number;
    assetId: string | null;
  }>;
  duckingEnvelopes: Array<{
    startMs: number;
    endMs: number;
    musicGain: number;
    ambienceGain: number;
    attackMs: number;
    releaseMs: number;
  }>;
  /** Static fallback volumes (current FFmpeg beds). */
  staticDuckingApplied: boolean;
  providerCalls: 0;
};

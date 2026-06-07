/** Studio V37 — Audio Production Director (no audio generation). */

export const AUDIO_FOCUS_TYPES = ["voice", "music", "sound", "balanced"] as const;

export type AudioFocusType = (typeof AUDIO_FOCUS_TYPES)[number];

export const AUDIO_PRIORITY_LEVELS = ["low", "medium", "high"] as const;

export type AudioPriorityLevel = (typeof AUDIO_PRIORITY_LEVELS)[number];

export const AUDIO_DUCKING_MODES = [
  "none",
  "music_under_voice",
  "full_under_voice",
  "ambient_reduce",
] as const;

export type AudioDuckingMode = (typeof AUDIO_DUCKING_MODES)[number];

export type SceneMixRecommendation = {
  voice: number;
  music: number;
  sound: number;
};

export type SceneDuckingRecommendations = {
  music: boolean;
  sound: boolean;
};

export type SceneAudioProductionCue = {
  sceneId: string;
  order: number;
  title: string;
  audioFocus: AudioFocusType;
  voicePriority: number;
  musicPriority: number;
  soundPriority: number;
  duckingMode: AudioDuckingMode;
  duckingRecommendations: SceneDuckingRecommendations;
  mixRecommendation: SceneMixRecommendation;
  speakerPriority: string | null;
  arcPhase: string;
  hasUserOverrides: boolean;
};

export type AudioProductionWarning = {
  code: string;
  severity: "info" | "warning";
  messageKey: string;
  params?: Record<string, string | number>;
};

export type AudioProductionPlan = {
  enabled: boolean;
  style: string;
  priorityStrategy: string;
  audioFocusSummary: string;
  sceneCues: SceneAudioProductionCue[];
  recommendations: string[];
  warnings: AudioProductionWarning[];
  audioScore: number;
  voiceEnabled: boolean;
  musicEnabled: boolean;
  soundEnabled: boolean;
  identityHintKeys?: string[];
  identityContextLines?: string[];
};

/** Motion handoff V17 — audio production plan (no mixed audio). */
export type MotionAudioProductionHandoffPlan = {
  enabled: boolean;
  style: string;
  priorityStrategy: string;
  audioFocusSummary: string;
  sceneCues: SceneAudioProductionCue[];
  audioWarnings: AudioProductionWarning[];
  recommendations: string[];
};

export type MotionSceneAudioProductionHandoff = {
  audioFocus: AudioFocusType;
  voicePriority: number;
  musicPriority: number;
  soundPriority: number;
  duckingRecommendations: SceneDuckingRecommendations;
  mixRecommendation: SceneMixRecommendation;
};

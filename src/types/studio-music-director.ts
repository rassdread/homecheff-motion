import type { StoryArcPhase } from "@/lib/studio-story-arc";

export const MUSIC_CUE_TYPES = [
  "intro",
  "build",
  "transition",
  "climax",
  "resolution",
] as const;

export type MusicCueType = (typeof MUSIC_CUE_TYPES)[number];

export const MUSIC_ENERGY_TARGETS = ["low", "medium", "high"] as const;

export type MusicEnergyTarget = (typeof MUSIC_ENERGY_TARGETS)[number];

export const MUSIC_TRANSITION_TYPES = [
  "hard_cut",
  "crossfade",
  "riser",
  "ambient_bridge",
] as const;

export type MusicTransitionType = (typeof MUSIC_TRANSITION_TYPES)[number];

export const MUSIC_START_BEHAVIORS = ["fade_in", "hard_start", "ambient_pad"] as const;

export type MusicStartBehavior = (typeof MUSIC_START_BEHAVIORS)[number];

export const MUSIC_END_BEHAVIORS = ["fade_out", "hard_end", "tail"] as const;

export type MusicEndBehavior = (typeof MUSIC_END_BEHAVIORS)[number];

export const MUSIC_NARRATIVE_LABELS = [
  "intro",
  "build",
  "momentum",
  "peak",
  "resolution",
] as const;

export type MusicNarrativeLabel = (typeof MUSIC_NARRATIVE_LABELS)[number];

export type MusicNarrativePlanEntry = {
  sceneId: string;
  order: number;
  title: string;
  narrativeLabel: MusicNarrativeLabel;
  cueType: MusicCueType;
  arcPhase: StoryArcPhase;
};

export type SceneMusicCue = {
  sceneId: string;
  order: number;
  title: string;
  cueType: MusicCueType;
  narrativeLabel: MusicNarrativeLabel;
  energyTarget: MusicEnergyTarget;
  transitionType: MusicTransitionType;
  startBehavior: MusicStartBehavior;
  endBehavior: MusicEndBehavior;
  arcPhase: StoryArcPhase;
  emotion: string;
  sceneEnergy: string;
  durationSeconds: number;
  duckingRecommended: boolean;
  dialoguePriority: boolean;
  hasUserOverrides: boolean;
};

export type MusicDirectorWarning = {
  code: string;
  severity: "info" | "warning";
  messageKey: string;
  params?: Record<string, string | number>;
};

export type MusicDirectorPlan = {
  enabled: boolean;
  profileId: string;
  profileLabelKey: string;
  style: string;
  intensity: string;
  narrativeRole: string;
  narrativeSummary: string;
  narrativePlan: MusicNarrativePlanEntry[];
  sceneCues: SceneMusicCue[];
  recommendations: string[];
  warnings: MusicDirectorWarning[];
  tempoRange: [number, number];
  voiceAware: boolean;
  musicScore: number;
};

/** Motion handoff V15 — music planning payload (no audio). */
export type MotionMusicHandoffPlan = {
  enabled: boolean;
  profileId: string;
  profileLabelKey: string;
  style: string;
  intensity: string;
  narrativeRole: string;
  narrativeSummary: string;
  sceneMusicCues: SceneMusicCue[];
  musicNarrativeSummary: string;
  musicWarnings: MusicDirectorWarning[];
  recommendations: string[];
  tempoRange: [number, number];
  voiceAware: boolean;
};

export type MotionSceneMusicCueHandoff = {
  cueType: MusicCueType;
  narrativeLabel: MusicNarrativeLabel;
  energyTarget: MusicEnergyTarget;
  transitionType: MusicTransitionType;
  startBehavior: MusicStartBehavior;
  endBehavior: MusicEndBehavior;
  duckingRecommended: boolean;
};

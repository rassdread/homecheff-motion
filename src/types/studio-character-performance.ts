import type { StudioSceneEnergy } from "@/lib/studio-scene-director";

/** Mouth openness driven by voice amplitude (no phonemes). */
export type MouthMovementState = "closed" | "small" | "medium" | "wide";

export type PerformanceLevel = "low" | "medium" | "high";

export type IdleAnimationStyle = "subtle" | "natural" | "lively";

/** Stored per character — default performance identity. */
export type CharacterPerformanceProfile = {
  characterId: string;
  characterName: string;
  performanceEnabled: boolean;
  defaultSmileStrength: number;
  defaultBlinkRate: PerformanceLevel;
  defaultHeadMovement: PerformanceLevel;
  defaultMouthIntensity: PerformanceLevel;
  idleAnimationStyle: IdleAnimationStyle;
  performanceNotes: string;
  /** Human-readable style label for Motion preview (e.g. Friendly, Calm). */
  styleLabel: string;
};

/** Runtime state passed to Motion per speaker / scene. */
export type CharacterPerformanceState = {
  characterId: string;
  characterName: string;
  activeSpeaker: boolean;
  emotion: string;
  energy: StudioSceneEnergy;
  mouthSpeed: number;
  smileStrength: number;
  blinkRate: PerformanceLevel;
  headMovement: PerformanceLevel;
  idleMovement: IdleAnimationStyle;
  mouthState: MouthMovementState;
};

export type PerformanceEmotionModifier = {
  smileMultiplier: number;
  blinkMultiplier: number;
  mouthMultiplier: number;
  headMultiplier: number;
  mouthSpeedMultiplier: number;
};

export type PerformanceEnergyModifier = {
  energy: StudioSceneEnergy;
  animationMultiplier: number;
};

export type CharacterPerformanceAssignment = CharacterPerformanceProfile;

export type ActiveSpeakerPerformanceData = {
  sceneId: string;
  characterId: string;
  speakerName: string;
  state: CharacterPerformanceState;
};

export type VoiceAmplitudeSample = {
  offsetSeconds: number;
  mouthState: MouthMovementState;
  amplitude: number;
};

export type CharacterPerformanceWarning = {
  code:
    | "performance_disabled"
    | "performance_profile_missing"
    | "performance_extreme_values"
    | "speaker_without_performance_state";
  severity: "low" | "medium";
  message: string;
  characterId?: string;
  characterName?: string;
  sceneId?: string;
};

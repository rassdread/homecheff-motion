/** Studio V36 — Sound Effects Director planning types (no audio generation). */

export const SOUND_ENVIRONMENT_IDS = [
  "city",
  "market",
  "restaurant",
  "garden",
  "office",
  "street",
  "rain",
  "wind",
  "nature",
  "kitchen_ambience",
  "plates",
  "people_talking",
  "birds",
  "leaves",
  "crowd",
  "conversation",
  "movement",
] as const;

export type SoundEnvironmentId = (typeof SOUND_ENVIRONMENT_IDS)[number];

export const SOUND_CHARACTER_IDS = [
  "footsteps",
  "clothing_movement",
  "crowd_presence",
  "applause",
  "laughter",
] as const;

export type SoundCharacterId = (typeof SOUND_CHARACTER_IDS)[number];

export const SOUND_OBJECT_IDS = [
  "door",
  "phone",
  "package",
  "cooking",
  "typing",
  "vehicle",
  "notification",
  "paper",
  "cardboard",
  "engine",
  "road_noise",
  "sizzling",
  "cutting",
  "bag_movement",
  "door_knock",
] as const;

export type SoundObjectId = (typeof SOUND_OBJECT_IDS)[number];

export const SOUND_TRANSITION_IDS = [
  "whoosh",
  "riser",
  "impact",
  "sweep",
  "soft_fade",
  "none",
] as const;

export type SoundTransitionId = (typeof SOUND_TRANSITION_IDS)[number];

export const SOUND_AMBIENT_IDS = [
  "subtle_room_tone",
  "distant_traffic",
  "birds",
  "marketplace_ambience",
] as const;

export type SoundAmbientId = (typeof SOUND_AMBIENT_IDS)[number];

export type SoundId =
  | SoundEnvironmentId
  | SoundCharacterId
  | SoundObjectId
  | SoundTransitionId
  | SoundAmbientId;

export type SceneSoundCue = {
  sceneId: string;
  order: number;
  title: string;
  environmentSounds: SoundEnvironmentId[];
  characterSounds: SoundCharacterId[];
  propSounds: SoundObjectId[];
  transitionSounds: SoundTransitionId[];
  ambientRecommendation: SoundAmbientId[];
  emotion: string;
  sceneEnergy: string;
  locationCategory: string | null;
  densityScore: number;
  duckingRecommended: boolean;
  dialoguePriority: boolean;
  hasUserOverrides: boolean;
};

export type SoundDirectorWarning = {
  code: string;
  severity: "info" | "warning";
  messageKey: string;
  params?: Record<string, string | number>;
};

export type SoundDirectorPlan = {
  enabled: boolean;
  profileId: string;
  profileLabelKey: string;
  density: string;
  sceneCues: SceneSoundCue[];
  recommendations: string[];
  warnings: SoundDirectorWarning[];
  soundScore: number;
  musicAware: boolean;
  voiceAware: boolean;
};

/** Motion handoff V16 — sound planning payload (no audio). */
export type MotionSoundHandoffPlan = {
  enabled: boolean;
  profileId: string;
  profileLabelKey: string;
  density: string;
  sceneSoundCues: SceneSoundCue[];
  soundWarnings: SoundDirectorWarning[];
  recommendations: string[];
  musicAware: boolean;
  voiceAware: boolean;
};

export type MotionSceneSoundCueHandoff = {
  environmentSounds: SoundEnvironmentId[];
  characterSounds: SoundCharacterId[];
  propSounds: SoundObjectId[];
  transitionSounds: SoundTransitionId[];
  ambientRecommendation: SoundAmbientId[];
  duckingRecommended: boolean;
};

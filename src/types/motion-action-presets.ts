export type MotionActionPresetCategory =
  | "sports"
  | "dance"
  | "comedy"
  | "adventure"
  | "lifestyle"
  | "business"
  | "social"
  | "mascots";

export type MotionActionPresetDifficulty = "easy" | "medium" | "hard";

export type MotionActionPresetReliability = "high" | "medium" | "experimental";

export type MotionActionPresetDuration = 5 | 8 | 12;

export type MotionActionPresetMotionMode =
  | "celebration"
  | "entrance"
  | "dance"
  | "sport"
  | "comedy"
  | "cinematic"
  | "lifestyle";

export type MotionActionPresetRequiredInput = "person";

export type MotionActionPresetOptionalInput =
  | "outfit"
  | "background"
  | "prop"
  | "logo"
  | "musicMood"
  | "football_outfit"
  | "stadium_background"
  | "trophy"
  | "microphone"
  | "snowboard"
  | "skateboard"
  | "sports_car"
  | "reporter";

export type MotionActionPresetCharacterRequirements = {
  motionReadyPreferred: boolean;
  fullBodyRequired: boolean;
  handsVisiblePreferred: boolean;
  feetVisiblePreferred: boolean;
  outfitRecommended: string[];
};

export type MotionActionPresetMotionSettings = {
  cameraMotion: string;
  energy: string;
  movement: string;
  pacing: string;
  shotType: string;
};

export type MotionActionPresetSceneSettings = {
  environment: string;
  backgroundPrompt: string;
  atmosphere: string;
  lighting?: string;
};

export type MotionActionPresetStyleSettings = {
  visualStyle: string;
  realismLevel: string;
  cinematicLevel: string;
};

export type MotionActionPresetAudioSuggestions = {
  musicMood: string;
  genre: string;
  voiceSuggestion?: string;
};

export type MotionActionPresetId =
  | "goal_celebration"
  | "stadium_entrance"
  | "championship_celebration"
  | "basketball_dunk_celebration"
  | "snowboard_jump"
  | "skateboard_trick"
  | "cycling_finish"
  | "penalty_kick"
  | "goalkeeper_save"
  | "team_celebration"
  | "moonwalk"
  | "stage_performance"
  | "fashion_runway"
  | "concert_moment"
  | "fans_recognize_me"
  | "red_carpet_moment"
  | "street_interview"
  | "beach_comedy_scene"
  | "award_ceremony"
  | "press_conference"
  | "high_five"
  | "handshake"
  | "group_photo"
  | "hero_entrance"
  | "sports_car_arrival"
  | "mountain_summit"
  | "city_sprint"
  | "superhero_landing"
  | "festival_appearance"
  | "travel_vlog"
  | "airport_arrival"
  | "luxury_entrance"
  | "cooking_tutorial"
  | "restaurant_service"
  | "gardening_activity"
  | "market_vendor"
  | "shopping_trip"
  | "walking_city"
  | "business_presentation"
  | "startup_pitch"
  | "conference_speaker"
  | "networking_event"
  | "product_showcase"
  | "product_launch"
  | "product_unboxing"
  | "brand_reveal"
  | "influencer_reel"
  | "vlog_intro"
  | "podcast_clip"
  | "creator_intro"
  | "mascot_introduction"
  | "mascot_greeting"
  | "mascot_celebration"
  | "mascot_presentation"
  | "mascot_commercial"
  | "photoshoot"
  | "wedding_entrance"
  | "birthday_celebration"
  | "graduation_moment"
  | "fitness_workout"
  | "running_challenge"
  | "boxing_entrance"
  | "training_montage"
  | "dance_challenge"
  | "tiktok_trend";

export type MotionActionPreset = {
  id: MotionActionPresetId;
  category: MotionActionPresetCategory;
  title: string;
  shortDescription: string;
  userFacingDescription: string;
  difficulty: MotionActionPresetDifficulty;
  reliability: MotionActionPresetReliability;
  recommendedDurationSeconds: MotionActionPresetDuration;
  motionMode: MotionActionPresetMotionMode;
  requiredInputs: MotionActionPresetRequiredInput[];
  optionalInputs: MotionActionPresetOptionalInput[];
  characterRequirements: MotionActionPresetCharacterRequirements;
  motionSettings: MotionActionPresetMotionSettings;
  sceneSettings: MotionActionPresetSceneSettings;
  styleSettings: MotionActionPresetStyleSettings;
  audioSuggestions: MotionActionPresetAudioSuggestions;
  sfxSuggestions: string[];
  promptTemplate: string;
  negativePrompt: string;
  feasibilityNote: string;
};

/** Persisted on motion output / poster settings for library consistency. */
export type MotionActionPresetMetadata = {
  actionPresetId: MotionActionPresetId;
  actionPresetCategory: MotionActionPresetCategory;
  actionPresetTitle: string;
  promptTemplate: string;
  feasibilityNote: string;
  requirementMetadata?: import("@/types/action-preset-requirements").ActionPresetRequirementMetadata;
  /** Client-side motion engine evaluation snapshot (identity + pricing + quality). */
  engineSnapshot?: import("@/types/motion-preset-engine").MotionPresetEngineSnapshot;
};

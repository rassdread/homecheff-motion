/** Reusable Publish production blocks — voice, music, SFX, subtitles, text overlays. */

export type PublishVoiceMode = "none" | "ai_voice" | "recorded" | "cloned" | "library";

export type PublishVoiceScope = "project" | "scene";

export type PublishVoiceProvider = "elevenlabs" | "openai" | "homecheff";

export type PublishVoiceConfig = {
  mode: PublishVoiceMode;
  scope: PublishVoiceScope;
  label: string;
  language: string;
  gender: string;
  emotion: string;
  speed: number;
  volume: number;
  voiceId?: string;
  provider?: PublishVoiceProvider;
  script?: string;
  audioUrl?: string;
  audioFileName?: string;
  cloneVoiceId?: string;
  libraryVoiceId?: string;
  sceneVoices: Array<{ sceneId: string; label: string; script: string }>;
};

export type PublishMusicMode = "none" | "generate" | "library" | "upload";

export type PublishMusicProvider = "elevenlabs" | "suno" | "homecheff";

export type PublishMusicConfig = {
  mode: PublishMusicMode;
  label: string;
  genre: string;
  mood: string;
  intensity: number;
  volume: number;
  fadeIn: boolean;
  fadeOut: boolean;
  trackId?: string;
  trackUrl?: string;
  prompt?: string;
  durationMatch?: boolean;
  instrumental?: boolean;
  provider?: PublishMusicProvider;
  uploadFileName?: string;
};

export const PUBLISH_SOUND_EFFECT_CATEGORIES = [
  "city",
  "crowd",
  "footsteps",
  "kitchen",
  "nature",
  "wind",
  "rain",
  "applause",
  "transition",
  "ambience",
] as const;

export type PublishSoundEffectCategory = (typeof PUBLISH_SOUND_EFFECT_CATEGORIES)[number];

export type PublishSoundEffectMode = "none" | "auto" | "manual" | "library" | "upload";

export type PublishSoundEffectItem = {
  id: string;
  category: PublishSoundEffectCategory;
  label: string;
  sceneId?: string;
  assetId?: string;
  uploadFileName?: string;
};

export type PublishSoundEffectsConfig = {
  mode: PublishSoundEffectMode;
  items: PublishSoundEffectItem[];
};

export type PublishSubtitlesMode = "none" | "automatic" | "srt_upload" | "translated";

export type PublishSubtitlesPosition = "top" | "middle" | "bottom";

export type PublishSubtitlesConfig = {
  mode: PublishSubtitlesMode;
  label: string;
  language: string;
  font: string;
  fontSize: number;
  color: string;
  position: PublishSubtitlesPosition;
  animation: string;
};

export const PUBLISH_TEXT_OVERLAY_KINDS = [
  "title",
  "cta",
  "social_handle",
  "logo",
  "end_screen",
  "chapter",
] as const;

export type PublishTextOverlayKind = (typeof PUBLISH_TEXT_OVERLAY_KINDS)[number];

export const PUBLISH_TEXT_OVERLAY_PRESETS = ["minimal", "cinematic", "social", "homecheff"] as const;

export type PublishTextOverlayPreset = (typeof PUBLISH_TEXT_OVERLAY_PRESETS)[number];

export type PublishTextOverlayPosition = "top" | "middle" | "bottom";

export type PublishTextOverlayItem = {
  id: string;
  kind: PublishTextOverlayKind;
  text: string;
  position: PublishTextOverlayPosition;
  preset: PublishTextOverlayPreset;
};

export type PublishTextOverlaysConfig = {
  items: PublishTextOverlayItem[];
  activeItemId?: string;
};

export type PublishProductionConfig = {
  voice: PublishVoiceConfig;
  music: PublishMusicConfig;
  soundEffects: PublishSoundEffectsConfig;
  subtitles: PublishSubtitlesConfig;
  textOverlays: PublishTextOverlaysConfig;
  updatedAt: string;
};

export type PublishProductionSectionId =
  | "voice"
  | "music"
  | "soundEffects"
  | "subtitles"
  | "textOverlays";

export type PublishProductionSummary = {
  section: PublishProductionSectionId;
  label: string;
  active: boolean;
  detail: string;
};

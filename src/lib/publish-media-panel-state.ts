import {
  buildMusicDisplayLabel,
  buildSubtitlesDisplayLabel,
  defaultPublishMusicConfig,
  defaultPublishSoundEffectsConfig,
  defaultPublishSubtitlesConfig,
  defaultPublishVoiceConfig,
  resolveVoiceLabelFromSettings,
} from "@/lib/publish-media-production";
import type {
  PublishMusicConfig,
  PublishMusicMode,
  PublishProductionConfig,
  PublishSoundEffectMode,
  PublishSoundEffectsConfig,
  PublishSubtitlesConfig,
  PublishSubtitlesMode,
  PublishTextOverlayKind,
  PublishTextOverlayItem,
  PublishVoiceConfig,
  PublishVoiceMode,
  PublishVoiceScope,
} from "@/types/publish-media-production";

export type PublishVoicePanelVisibility = {
  emptyState: boolean;
  scopeControls: boolean;
  sceneRows: boolean;
  aiControls: boolean;
  recordedControls: boolean;
  clonedControls: boolean;
  libraryPicker: boolean;
  generateVoiceAction: boolean;
};

export type PublishMusicPanelVisibility = {
  emptyState: boolean;
  generateControls: boolean;
  libraryPicker: boolean;
  uploadControls: boolean;
  sharedControls: boolean;
};

export type PublishSoundEffectsPanelVisibility = {
  emptyState: boolean;
  autoControls: boolean;
  manualControls: boolean;
  libraryPicker: boolean;
  uploadControls: boolean;
};

export type PublishSubtitlesPanelVisibility = {
  emptyState: boolean;
  automaticControls: boolean;
  srtUploadControls: boolean;
  translatedControls: boolean;
  styleControls: boolean;
};

export function voicePanelVisibility(
  voice: PublishVoiceConfig
): PublishVoicePanelVisibility {
  const { mode, scope } = voice;
  return {
    emptyState: mode === "none",
    scopeControls: mode !== "none",
    sceneRows: mode !== "none" && scope === "scene",
    aiControls: mode === "ai_voice",
    recordedControls: mode === "recorded",
    clonedControls: mode === "cloned",
    libraryPicker: mode === "library",
    generateVoiceAction: mode === "ai_voice",
  };
}

export function musicPanelVisibility(music: PublishMusicConfig): PublishMusicPanelVisibility {
  const { mode } = music;
  return {
    emptyState: mode === "none",
    generateControls: mode === "generate",
    libraryPicker: mode === "library",
    uploadControls: mode === "upload",
    sharedControls: mode === "generate" || mode === "library" || mode === "upload",
  };
}

export function soundEffectsPanelVisibility(
  config: PublishSoundEffectsConfig
): PublishSoundEffectsPanelVisibility {
  const { mode } = config;
  return {
    emptyState: mode === "none",
    autoControls: mode === "auto",
    manualControls: mode === "manual",
    libraryPicker: mode === "library",
    uploadControls: mode === "upload",
  };
}

export function subtitlesPanelVisibility(
  subtitles: PublishSubtitlesConfig
): PublishSubtitlesPanelVisibility {
  const { mode } = subtitles;
  return {
    emptyState: mode === "none",
    automaticControls: mode === "automatic",
    srtUploadControls: mode === "srt_upload",
    translatedControls: mode === "translated",
    styleControls: mode !== "none",
  };
}

export function updateVoiceMode(
  voice: PublishVoiceConfig,
  mode: PublishVoiceMode,
  options?: { defaultScript?: string }
): PublishVoiceConfig {
  if (mode === "none") {
    return {
      ...voice,
      mode: "none",
      label: "",
      script: "",
      audioUrl: undefined,
      cloneVoiceId: undefined,
      libraryVoiceId: undefined,
    };
  }
  const next: PublishVoiceConfig = { ...voice, mode };
  if (!next.label.trim()) {
    next.label = resolveVoiceLabelFromSettings(next);
  }
  if ((mode === "ai_voice" || mode === "cloned") && !next.script?.trim() && options?.defaultScript) {
    next.script = options.defaultScript;
  }
  return next;
}

export function updateVoiceScope(voice: PublishVoiceConfig, scope: PublishVoiceScope): PublishVoiceConfig {
  const sceneVoices =
    scope === "scene" && voice.sceneVoices.length === 0
      ? [{ sceneId: "scene_1", label: "Scene 1", script: voice.script ?? "" }]
      : voice.sceneVoices;
  return { ...voice, scope, sceneVoices };
}

export function updateMusicMode(
  music: PublishMusicConfig,
  mode: PublishMusicMode,
  options?: { suggestedMood?: string }
): PublishMusicConfig {
  if (mode === "none") {
    return { ...defaultPublishMusicConfig(), mode: "none", label: "" };
  }
  const next: PublishMusicConfig = { ...music, mode };
  if (!next.mood.trim() && options?.suggestedMood) {
    next.mood = options.suggestedMood;
  }
  next.label = buildMusicDisplayLabel(next) || next.mood;
  if (mode === "generate" && !next.provider) {
    next.provider = "elevenlabs";
  }
  return next;
}

export function updateSoundEffectsMode(
  config: PublishSoundEffectsConfig,
  mode: PublishSoundEffectMode
): PublishSoundEffectsConfig {
  if (mode === "none") {
    return { ...defaultPublishSoundEffectsConfig() };
  }
  if (mode === "auto") {
    return { ...config, mode: "auto", items: [] };
  }
  if (mode === "library" || mode === "upload") {
    return { ...config, mode, items: mode === "library" ? config.items : [] };
  }
  return { ...config, mode: "manual" };
}

export function updateSubtitlesMode(
  subtitles: PublishSubtitlesConfig,
  mode: PublishSubtitlesMode
): PublishSubtitlesConfig {
  if (mode === "none") {
    return { ...defaultPublishSubtitlesConfig() };
  }
  const next = { ...subtitles, mode };
  next.label = buildSubtitlesDisplayLabel(next);
  return next;
}

export function upsertTextOverlayItem(
  items: PublishTextOverlayItem[],
  kind: PublishTextOverlayKind,
  defaultText: string
): { items: PublishTextOverlayItem[]; activeId: string } {
  const existing = items.find((item) => item.kind === kind);
  if (existing) {
    return { items, activeId: existing.id };
  }
  const created: PublishTextOverlayItem = {
    id: crypto.randomUUID(),
    kind,
    text: defaultText,
    position: kind === "cta" || kind === "social_handle" ? "bottom" : "top",
    preset: kind === "social_handle" ? "social" : "homecheff",
  };
  return { items: [...items, created], activeId: created.id };
}

export function productionConfigAfterStepChange(
  project: { metadata?: Record<string, unknown> },
  step: "media" | "review" | "export"
): PublishProductionConfig | null {
  const raw = project.metadata?.publishProduction;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return raw as PublishProductionConfig;
}

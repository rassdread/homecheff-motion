import {
  addPublishOverlay,
  createPublishOverlayId,
  patchPublishOverlay,
} from "@/lib/publish-overlay-timeline";
import {
  addTimelineMusicItem,
  addTimelineVoiceItem,
  loadPublishTimelineFromProject,
  savePublishTimelineToProject,
} from "@/lib/publish-timeline";
import type { PublishProject } from "@/types/publish-overlay";
import type {
  PublishMusicConfig,
  PublishProductionConfig,
  PublishProductionSectionId,
  PublishProductionSummary,
  PublishSoundEffectCategory,
  PublishSoundEffectItem,
  PublishSoundEffectsConfig,
  PublishSubtitlesConfig,
  PublishTextOverlayItem,
  PublishTextOverlaysConfig,
  PublishVoiceConfig,
} from "@/types/publish-media-production";

export const PUBLISH_PRODUCTION_METADATA_KEY = "publishProduction";

export function defaultPublishVoiceConfig(): PublishVoiceConfig {
  return {
    mode: "none",
    scope: "project",
    label: "",
    language: "nl",
    gender: "female",
    emotion: "friendly",
    speed: 1,
    volume: 100,
    provider: "elevenlabs",
    sceneVoices: [],
  };
}

export function defaultPublishMusicConfig(): PublishMusicConfig {
  return {
    mode: "none",
    label: "",
    genre: "cinematic",
    mood: "inspiring",
    intensity: 50,
    volume: 70,
    fadeIn: true,
    fadeOut: true,
  };
}

export function defaultPublishSoundEffectsConfig(): PublishSoundEffectsConfig {
  return { mode: "none", items: [] };
}

export function defaultPublishSubtitlesConfig(): PublishSubtitlesConfig {
  return {
    mode: "none",
    label: "",
    language: "nl",
    font: "Inter",
    fontSize: 18,
    color: "#ffffff",
    position: "bottom",
    animation: "fade",
  };
}

export function defaultPublishTextOverlaysConfig(): PublishTextOverlaysConfig {
  return { items: [] };
}

export function defaultPublishProductionConfig(): PublishProductionConfig {
  return {
    voice: defaultPublishVoiceConfig(),
    music: defaultPublishMusicConfig(),
    soundEffects: defaultPublishSoundEffectsConfig(),
    subtitles: defaultPublishSubtitlesConfig(),
    textOverlays: defaultPublishTextOverlaysConfig(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadPublishProductionFromProject(project: PublishProject): PublishProductionConfig {
  const raw = project.metadata?.[PUBLISH_PRODUCTION_METADATA_KEY];
  if (raw && typeof raw === "object") {
    return mergeProductionWithDefaults(raw as Partial<PublishProductionConfig>);
  }
  return hydrateProductionFromLegacyProject(project);
}

function mergeProductionWithDefaults(partial: Partial<PublishProductionConfig>): PublishProductionConfig {
  const defaults = defaultPublishProductionConfig();
  return {
    voice: { ...defaults.voice, sceneVoices: partial.voice?.sceneVoices ?? [], ...partial.voice },
    music: { ...defaults.music, ...partial.music },
    soundEffects: { ...defaults.soundEffects, ...partial.soundEffects, items: partial.soundEffects?.items ?? [] },
    subtitles: { ...defaults.subtitles, ...partial.subtitles },
    textOverlays: { ...defaults.textOverlays, ...partial.textOverlays, items: partial.textOverlays?.items ?? [] },
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
  };
}

export function hydrateProductionFromLegacyProject(project: PublishProject): PublishProductionConfig {
  const config = defaultPublishProductionConfig();
  const timeline = loadPublishTimelineFromProject(project);
  const voiceItem = timeline.items.find((i) => i.kind === "voice");
  const musicItem = timeline.items.find((i) => i.kind === "music");

  if (voiceItem?.text) {
    config.voice = {
      ...config.voice,
      mode: "ai_voice",
      label: voiceItem.voiceId ? `Voice ${voiceItem.voiceId}` : "AI Voice",
      script: voiceItem.text,
      voiceId: voiceItem.voiceId,
    };
  }

  if (musicItem?.musicMood) {
    config.music = {
      ...config.music,
      mode: "generate",
      label: musicItem.musicMood,
      mood: musicItem.musicMood,
      volume: Math.round((musicItem.volume ?? 0.8) * 100),
    };
  }

  if (project.subtitles.length > 0) {
    const lang = project.subtitles[0]?.language ?? "nl";
    config.subtitles = {
      ...config.subtitles,
      mode: "automatic",
      label: `${lang.toUpperCase()} Auto`,
      language: lang,
    };
  }

  if (project.overlays.length > 0) {
    config.textOverlays.items = project.overlays.map((overlay) => ({
      id: overlay.id,
      kind: overlay.type === "cta" ? "cta" : overlay.type === "title" ? "title" : overlay.type === "logo" ? "logo" : "title",
      text: overlay.text,
      position: overlay.y < 0.34 ? "top" : overlay.y > 0.66 ? "bottom" : "middle",
      preset: "homecheff",
    }));
  }

  const sfxRaw = project.metadata?.publishSoundEffects;
  if (Array.isArray(sfxRaw) && sfxRaw.length > 0) {
    config.soundEffects = {
      mode: "manual",
      items: sfxRaw as PublishSoundEffectItem[],
    };
  }

  return config;
}

export function savePublishProductionToProject(
  project: PublishProject,
  production: PublishProductionConfig
): PublishProject {
  return {
    ...project,
    metadata: {
      ...project.metadata,
      [PUBLISH_PRODUCTION_METADATA_KEY]: {
        ...production,
        updatedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function patchPublishProduction(
  project: PublishProject,
  patch: Partial<PublishProductionConfig>
): PublishProject {
  const current = loadPublishProductionFromProject(project);
  return savePublishProductionToProject(project, {
    ...current,
    ...patch,
    voice: patch.voice ? { ...current.voice, ...patch.voice } : current.voice,
    music: patch.music ? { ...current.music, ...patch.music } : current.music,
    soundEffects: patch.soundEffects
      ? { ...current.soundEffects, ...patch.soundEffects }
      : current.soundEffects,
    subtitles: patch.subtitles ? { ...current.subtitles, ...patch.subtitles } : current.subtitles,
    textOverlays: patch.textOverlays
      ? { ...current.textOverlays, ...patch.textOverlays }
      : current.textOverlays,
  });
}

export function isProductionSectionActive(
  config: PublishProductionConfig,
  section: PublishProductionSectionId
): boolean {
  switch (section) {
    case "voice":
      return config.voice.mode !== "none";
    case "music":
      return config.music.mode !== "none";
    case "soundEffects":
      return config.soundEffects.mode !== "none";
    case "subtitles":
      return config.subtitles.mode !== "none";
    case "textOverlays":
      return config.textOverlays.items.length > 0;
    default:
      return false;
  }
}

export function countActiveSoundEffects(config: PublishProductionConfig): number {
  if (config.soundEffects.mode === "auto") {
    return 8;
  }
  if (config.soundEffects.mode === "library" || config.soundEffects.mode === "upload") {
    return Math.max(1, config.soundEffects.items.length);
  }
  return config.soundEffects.items.length;
}

export function buildVoiceDisplayLabel(config: PublishVoiceConfig): string {
  if (config.mode === "none" || !config.label.trim()) {
    return "";
  }
  return config.label.trim();
}

export function buildVoiceReviewDetail(voice: PublishVoiceConfig): string {
  if (voice.mode === "none") {
    return "publish.media.review.voiceNone";
  }
  return buildVoiceDisplayLabel(voice) || "publish.media.review.none";
}

export function buildMusicDisplayLabel(config: PublishMusicConfig): string {
  if (config.mode === "none") {
    return "";
  }
  if (config.label.trim()) {
    return config.label.trim();
  }
  return `${config.genre} ${config.mood}`.replace(/^\w/, (c) => c.toUpperCase());
}

export function buildSubtitlesDisplayLabel(config: PublishSubtitlesConfig): string {
  if (config.mode === "none") {
    return "";
  }
  if (config.label.trim()) {
    return config.label.trim();
  }
  const lang = config.language === "nl" ? "Dutch" : config.language === "en" ? "English" : config.language;
  if (config.mode === "automatic") {
    return `${lang} Auto`;
  }
  if (config.mode === "srt_upload") {
    return `${lang} SRT`;
  }
  if (config.mode === "translated") {
    return `${lang} Translated`;
  }
  return lang;
}

export function buildProductionSummaries(config: PublishProductionConfig): PublishProductionSummary[] {
  const voiceDetail = buildVoiceReviewDetail(config.voice);
  const musicDetail = buildMusicDisplayLabel(config.music);
  const sfxCount = countActiveSoundEffects(config);
  const subtitlesDetail = buildSubtitlesDisplayLabel(config.subtitles);
  const overlayCount = config.textOverlays.items.length;

  return [
    {
      section: "voice",
      label: "publish.media.review.voice",
      active: config.voice.mode !== "none",
      detail: voiceDetail,
    },
    {
      section: "music",
      label: "publish.media.review.music",
      active: config.music.mode !== "none",
      detail: musicDetail || "publish.media.review.none",
    },
    {
      section: "soundEffects",
      label: "publish.media.review.soundEffects",
      active: config.soundEffects.mode !== "none",
      detail:
        config.soundEffects.mode === "none"
          ? "publish.media.review.none"
          : "publish.media.review.sfxActive",
    },
    {
      section: "subtitles",
      label: "publish.media.review.subtitles",
      active: config.subtitles.mode !== "none",
      detail: subtitlesDetail || "publish.media.review.none",
    },
    {
      section: "textOverlays",
      label: "publish.media.review.textOverlays",
      active: overlayCount > 0,
      detail:
        overlayCount > 0 ? "publish.media.review.overlaysActive" : "publish.media.review.none",
    },
  ];
}

export function productionNeedsEmptyStateCtas(config: PublishProductionConfig): boolean {
  return (
    config.voice.mode === "none" &&
    config.music.mode === "none" &&
    config.soundEffects.mode === "none" &&
    config.subtitles.mode === "none" &&
    config.textOverlays.items.length === 0
  );
}

export function createSoundEffectItem(category: PublishSoundEffectCategory): PublishSoundEffectItem {
  return {
    id: createPublishOverlayId(),
    category,
    label: category.replace(/_/g, " "),
  };
}

export function createTextOverlayItem(
  kind: PublishTextOverlayItem["kind"],
  text: string
): PublishTextOverlayItem {
  return {
    id: createPublishOverlayId(),
    kind,
    text,
    position: kind === "cta" || kind === "social_handle" ? "bottom" : "top",
    preset: kind === "social_handle" ? "social" : "homecheff",
  };
}

export function resolveVoiceLabelFromSettings(voice: PublishVoiceConfig): string {
  if (voice.mode === "none") {
    return "";
  }
  const lang =
    voice.language === "nl" ? "Dutch" : voice.language === "en" ? "English" : voice.language;
  const gender = voice.gender === "female" ? "Female" : voice.gender === "male" ? "Male" : voice.gender;
  const emotion = voice.emotion.charAt(0).toUpperCase() + voice.emotion.slice(1);
  if (voice.mode === "library" && voice.label) {
    return voice.label;
  }
  return `${lang} ${gender} – ${emotion}`;
}

/** Sync production config into timeline + metadata for export. */
export function applyProductionConfigToProject(project: PublishProject): PublishProject {
  const production = loadPublishProductionFromProject(project);
  let next = savePublishProductionToProject(project, production);
  let timeline = loadPublishTimelineFromProject(next);

  timeline = {
    ...timeline,
    items: timeline.items.filter(
      (item) => item.kind !== "voice" && item.kind !== "music"
    ),
  };

  if (production.voice.mode !== "none" && production.voice.script?.trim()) {
    timeline = addTimelineVoiceItem(timeline, {
      script: production.voice.script,
      voiceId: production.voice.voiceId,
    });
  }

  if (production.music.mode !== "none") {
    timeline = addTimelineMusicItem(timeline, {
      mood: production.music.label || production.music.mood,
      endTime: timeline.durationSeconds,
    });
    const musicItem = timeline.items.find((i) => i.kind === "music");
    if (musicItem) {
      timeline = {
        ...timeline,
        items: timeline.items.map((item) =>
          item.id === musicItem.id
            ? { ...item, volume: production.music.volume / 100 }
            : item
        ),
      };
    }
  }

  next = savePublishTimelineToProject(next, { ...timeline, pendingRender: true });

  next = {
    ...next,
    metadata: {
      ...next.metadata,
      voiceScript: production.voice.script,
      musicDirection: production.music.label || production.music.mood,
      musicVolume: production.music.volume,
      musicFadeIn: production.music.fadeIn,
      musicFadeOut: production.music.fadeOut,
      publishSoundEffects: production.soundEffects.items,
      publishSoundEffectsMode: production.soundEffects.mode,
      subtitlesMode: production.subtitles.mode,
      subtitlesLanguage: production.subtitles.language,
      subtitlesStyle: {
        font: production.subtitles.font,
        fontSize: production.subtitles.fontSize,
        color: production.subtitles.color,
        position: production.subtitles.position,
        animation: production.subtitles.animation,
      },
      textOverlayPreset: production.textOverlays.items[0]?.preset,
    },
  };

  for (const overlayItem of production.textOverlays.items) {
    const overlayType =
      overlayItem.kind === "cta" ? "cta"
      : overlayItem.kind === "logo" ? "logo"
      : overlayItem.kind === "title" ? "title"
      : "text";
    const existing = next.overlays.find((o) => o.id === overlayItem.id);
    const y = overlayItem.position === "top" ? 0.12 : overlayItem.position === "bottom" ? 0.82 : 0.5;
    if (existing) {
      next = patchPublishOverlay(next, existing.id, { text: overlayItem.text, y });
    } else {
      next = addPublishOverlay(next, overlayType);
      const added = next.overlays[next.overlays.length - 1];
      if (added) {
        next = patchPublishOverlay(next, added.id, {
          text: overlayItem.text,
          y,
        });
      }
    }
  }

  return next;
}

export function applyProductionConfigForExport(project: PublishProject): PublishProject {
  return applyProductionConfigToProject(project);
}

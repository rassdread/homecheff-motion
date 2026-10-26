/**
 * User video editor document.
 * Local montage only: speed, trim, order, text, voice script, music, logo, and CTA.
 * This module never quotes, reserves, or calls a video provider.
 */

import type { StoryOverlayLayerStyles } from "@/lib/story-overlay-layer-styles";

export const EDITOR_SPEEDS = [0.75, 1, 1.1, 1.15, 1.25, 1.5] as const;
export type EditorSpeed = (typeof EDITOR_SPEEDS)[number];

export const EDITOR_TEXT_STYLES = [
  "minimal",
  "modern",
  "premium",
  "energetic",
  "creative",
] as const;
export type EditorTextStyle = (typeof EDITOR_TEXT_STYLES)[number];

export const EDITOR_ANIMATIONS = ["none", "fade", "slide-up", "slide-left", "scale"] as const;
export type EditorAnimation = (typeof EDITOR_ANIMATIONS)[number];

export const EDITOR_LOGO_POSITIONS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
] as const;
export type EditorLogoPosition = (typeof EDITOR_LOGO_POSITIONS)[number];

export const EDITOR_MUSIC_CATEGORIES = [
  "Upbeat",
  "Feelgood",
  "Funky",
  "Lifestyle",
  "Corporate",
  "Cinematic",
  "Rustig",
] as const;
export type EditorMusicCategory = (typeof EDITOR_MUSIC_CATEGORIES)[number];

export const EDITOR_FONTS = ["Arial", "Arial Black"] as const;
export type EditorFont = (typeof EDITOR_FONTS)[number];

/** Voices this process can actually synthesize. Availability is checked on the server. */
export const EDITOR_VOICE_CATALOG = [
  {
    id: "ellen",
    sayName: "Ellen",
    language: "nl",
    gender: "female",
    locale: "nl_BE",
    label: "Ellen — Nederlands (België)",
  },
  {
    id: "xander",
    sayName: "Xander",
    language: "nl",
    gender: "male",
    locale: "nl_NL",
    label: "Xander — Nederlands",
  },
  {
    id: "samantha",
    sayName: "Samantha",
    language: "en",
    gender: "female",
    locale: "en_US",
    label: "Samantha — English",
  },
  {
    id: "daniel",
    sayName: "Daniel",
    language: "en",
    gender: "male",
    locale: "en_GB",
    label: "Daniel — English",
  },
] as const;

export type EditorVoiceId = (typeof EDITOR_VOICE_CATALOG)[number]["id"];

export type UserVideoEditorScene = {
  id: string;
  order: number;
  trimStart: number;
  trimEnd: number;
  speed: EditorSpeed;
  visualText: string;
  voiceOverText: string;
  voiceId: EditorVoiceId | null;
  removed: boolean;
};

export type UserVideoEditorDocument = {
  version: 1;
  mode: "simple" | "advanced";
  scenes: UserVideoEditorScene[];
  voice: {
    enabled: boolean;
    voiceId: EditorVoiceId;
    rate: number;
    volume: number;
  };
  music: {
    trackId: string | null;
    volume: number;
    ducking: boolean;
    fadeIn: boolean;
    fadeOut: boolean;
  };
  textStyle: EditorTextStyle;
  textAnimation: EditorAnimation;
  fontFamily: EditorFont;
  logo: {
    enabled: boolean;
    source: "none" | "project" | "upload";
    position: EditorLogoPosition;
    scale: number;
    opacity: number;
  };
  cta: {
    enabled: boolean;
    title: string;
    subtitle: string;
    website: string;
    color: string;
    animation: "slide-up" | "fade" | "scale";
    startSeconds: number;
    endSeconds: number;
  };
};

export type EditorMusicTrack = {
  id: string;
  title: string;
  artist: string;
  source: string;
  license: string;
  attributionRequired: boolean;
  attributionText: string | null;
  durationSeconds: number;
  category: EditorMusicCategory;
  previewUrl: string;
};

export function editorLocalEditCost(): {
  bucket: "local";
  credits: 0;
  callsVidu: false;
  callsOpenAiImages: false;
  callsPaidTts: false;
} {
  return {
    bucket: "local",
    credits: 0,
    callsVidu: false,
    callsOpenAiImages: false,
    callsPaidTts: false,
  };
}

export function isEditorSpeed(value: number): value is EditorSpeed {
  return (EDITOR_SPEEDS as readonly number[]).includes(value);
}

export function editorVoiceById(id: string | null | undefined) {
  return EDITOR_VOICE_CATALOG.find((voice) => voice.id === id) ?? null;
}

/** Spoken script uses voice-over text only. On-screen copy is never appended. */
export function spokenScriptFromEditor(document: UserVideoEditorDocument): string[] {
  return activeEditorScenes(document)
    .map((scene) => scene.voiceOverText.trim())
    .filter(Boolean);
}

export function visualScriptFromEditor(document: UserVideoEditorDocument): string[] {
  return activeEditorScenes(document)
    .map((scene) => scene.visualText.trim())
    .filter(Boolean);
}

export function activeEditorScenes(document: UserVideoEditorDocument): UserVideoEditorScene[] {
  return [...document.scenes]
    .filter((scene) => !scene.removed)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function outputDurationSeconds(
  scenes: Array<Pick<UserVideoEditorScene, "trimStart" | "trimEnd" | "speed" | "removed">>
): number {
  return scenes
    .filter((scene) => !scene.removed)
    .reduce((total, scene) => {
      const span = Math.max(0, scene.trimEnd - scene.trimStart);
      return total + span / scene.speed;
    }, 0);
}

export function reorderEditorScenes(
  scenes: UserVideoEditorScene[],
  sceneId: string,
  direction: "earlier" | "later"
): UserVideoEditorScene[] {
  const ordered = [...scenes].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const index = ordered.findIndex((scene) => scene.id === sceneId);
  const swapWith = direction === "earlier" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= ordered.length) {
    return ordered.map((scene, order) => ({ ...scene, order }));
  }
  const next = [...ordered];
  const current = next[index]!;
  next[index] = next[swapWith]!;
  next[swapWith] = current;
  return next.map((scene, order) => ({ ...scene, order }));
}

export function textStyleLayers(style: EditorTextStyle, fontFamily: EditorFont): StoryOverlayLayerStyles {
  void fontFamily;
  const warm = "#FFF8F0";
  const shared = {
    alignment: "center" as const,
    position: "middle" as const,
  };
  if (style === "minimal") {
    return {
      title: {
        ...shared,
        textColor: "#FFFFFF",
        fontSize: "smaller",
        backdropEnabled: false,
        shadow: "light",
        outline: "light",
      },
    };
  }
  if (style === "premium") {
    return {
      title: {
        ...shared,
        textColor: "#F7F3EA",
        fontSize: "normal",
        backdropEnabled: false,
        shadow: "medium",
        outline: "medium",
      },
    };
  }
  if (style === "energetic") {
    return {
      title: {
        ...shared,
        textColor: warm,
        fontSize: "normal",
        backdropEnabled: true,
        backdropColor: "#006D52",
        backdropOpacity: 0.72,
        shadow: "light",
        outline: "none",
      },
    };
  }
  if (style === "creative") {
    return {
      title: {
        ...shared,
        textColor: warm,
        fontSize: "smaller",
        backdropEnabled: true,
        backdropColor: "#1C1917",
        backdropOpacity: 0.55,
        shadow: "medium",
        outline: "none",
      },
    };
  }
  return {
    title: {
      ...shared,
        textColor: warm,
      fontSize: "smaller",
      backdropEnabled: true,
      backdropColor: "#006D52",
      backdropOpacity: 0.38,
      shadow: "light",
      outline: "none",
    },
  };
}

export function animationForEditor(value: EditorAnimation): EditorAnimation {
  return value;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function clipText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function asSpeed(value: unknown): EditorSpeed {
  const number = typeof value === "number" ? value : Number(value);
  return isEditorSpeed(number) ? number : 1;
}

function asVoice(value: unknown, fallback: EditorVoiceId): EditorVoiceId {
  const found = editorVoiceById(typeof value === "string" ? value : "");
  return found ? found.id : fallback;
}

export function emptyEditorDocument(): UserVideoEditorDocument {
  return {
    version: 1,
    mode: "simple",
    scenes: [],
    voice: { enabled: false, voiceId: "ellen", rate: 1, volume: 1 },
    music: { trackId: null, volume: 0.35, ducking: true, fadeIn: true, fadeOut: true },
    textStyle: "modern",
    textAnimation: "slide-up",
    fontFamily: "Arial",
    logo: { enabled: false, source: "none", position: "top-right", scale: 0.16, opacity: 1 },
    cta: {
      enabled: false,
      title: "",
      subtitle: "",
      website: "",
      color: "#006D52",
      animation: "slide-up",
      startSeconds: 0,
      endSeconds: 0,
    },
  };
}

export function parseUserVideoEditorDocument(raw: unknown): UserVideoEditorDocument {
  const base = emptyEditorDocument();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const row = raw as Record<string, unknown>;
  const voice = row.voice && typeof row.voice === "object" ? (row.voice as Record<string, unknown>) : {};
  const music = row.music && typeof row.music === "object" ? (row.music as Record<string, unknown>) : {};
  const logo = row.logo && typeof row.logo === "object" ? (row.logo as Record<string, unknown>) : {};
  const cta = row.cta && typeof row.cta === "object" ? (row.cta as Record<string, unknown>) : {};
  const scenes = Array.isArray(row.scenes) ? row.scenes : [];
  const textStyle = EDITOR_TEXT_STYLES.includes(row.textStyle as EditorTextStyle)
    ? (row.textStyle as EditorTextStyle)
    : base.textStyle;
  const textAnimation = EDITOR_ANIMATIONS.includes(row.textAnimation as EditorAnimation)
    ? (row.textAnimation as EditorAnimation)
    : base.textAnimation;
  const fontFamily = EDITOR_FONTS.includes(row.fontFamily as EditorFont)
    ? (row.fontFamily as EditorFont)
    : base.fontFamily;
  const logoPosition = EDITOR_LOGO_POSITIONS.includes(logo.position as EditorLogoPosition)
    ? (logo.position as EditorLogoPosition)
    : "top-right";
  const ctaAnimation =
    cta.animation === "fade" || cta.animation === "scale" || cta.animation === "slide-up"
      ? cta.animation
      : "slide-up";
  const color = typeof cta.color === "string" && /^#[0-9a-fA-F]{6}$/.test(cta.color) ? cta.color : "#006D52";
  const rawTrackId = typeof music.trackId === "string" ? music.trackId.trim() : "";
  const trackId = /^fm_[a-z0-9_]{3,80}$/.test(rawTrackId) ? rawTrackId : null;

  return {
    version: 1,
    mode: row.mode === "advanced" ? "advanced" : "simple",
    scenes: scenes.slice(0, 24).map((item, index) => {
      const scene = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const id = clipText(scene.id, 80) || `scene-${index + 1}`;
      const trimStart = clampNumber(scene.trimStart, 0, 120, 0);
      const trimEnd = clampNumber(scene.trimEnd, trimStart + 0.4, 120, trimStart + 6);
      const voiceId = editorVoiceById(typeof scene.voiceId === "string" ? scene.voiceId : "");
      return {
        id,
        order: clampNumber(scene.order, 0, 99, index),
        trimStart,
        trimEnd,
        speed: asSpeed(scene.speed),
        visualText: clipText(scene.visualText, 80),
        voiceOverText: clipText(scene.voiceOverText, 240),
        voiceId: voiceId ? voiceId.id : null,
        removed: scene.removed === true,
      };
    }),
    voice: {
      enabled: voice.enabled !== false,
      voiceId: asVoice(voice.voiceId, "ellen"),
      rate: clampNumber(voice.rate, 0.85, 1.15, 1),
      volume: clampNumber(voice.volume, 0, 1, 1),
    },
    music: {
      trackId,
      volume: clampNumber(music.volume, 0, 1, 0.35),
      ducking: music.ducking !== false,
      fadeIn: music.fadeIn !== false,
      fadeOut: music.fadeOut !== false,
    },
    textStyle,
    textAnimation,
    fontFamily,
    logo: {
      enabled: logo.enabled === true,
      source: logo.source === "project" || logo.source === "upload" ? logo.source : "none",
      position: logoPosition,
      scale: clampNumber(logo.scale, 0.08, 0.28, 0.16),
      opacity: clampNumber(logo.opacity, 0.15, 1, 1),
    },
    cta: {
      enabled: cta.enabled === true,
      title: clipText(cta.title, 80),
      subtitle: clipText(cta.subtitle, 160),
      website: clipText(cta.website, 80),
      color,
      animation: ctaAnimation,
      startSeconds: clampNumber(cta.startSeconds, 0, 600, 0),
      endSeconds: clampNumber(cta.endSeconds, 0, 600, 0),
    },
  };
}

export function sceneTimeline(
  scenes: UserVideoEditorScene[]
): Array<UserVideoEditorScene & { startSeconds: number; durationSeconds: number }> {
  let cursor = 0;
  return activeEditorScenes({ ...emptyEditorDocument(), scenes }).map((scene) => {
    const durationSeconds = Math.max(0.2, (scene.trimEnd - scene.trimStart) / scene.speed);
    const row = { ...scene, startSeconds: cursor, durationSeconds };
    cursor += durationSeconds;
    return row;
  });
}

export function duckingWindowsForEditor(
  document: UserVideoEditorDocument
): Array<{ startSeconds: number; endSeconds: number; musicGain: number }> {
  if (!document.voice.enabled || !document.music.ducking) return [];
  return sceneTimeline(document.scenes)
    .filter((scene) => scene.voiceOverText.trim().length > 0)
    .map((scene) => ({
      startSeconds: scene.startSeconds,
      endSeconds: scene.startSeconds + scene.durationSeconds,
      musicGain: 0.35,
    }));
}

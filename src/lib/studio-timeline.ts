/**
 * Film timeline decisions. No database, no providers, no wallet writes.
 * Times are integer milliseconds.
 * SRT and WebVTT are written by the existing subtitle module.
 */

import { buildSrtFromSubtitleEntries } from "@/lib/studio-subtitle-track";

export const TIMELINE_TRACK_TYPES = ["VIDEO", "DIALOGUE", "NARRATION", "MUSIC", "SFX", "SUBTITLE"] as const;
export type TimelineTrackType = (typeof TIMELINE_TRACK_TYPES)[number];

export const TIMELINE_MEDIA_KINDS = [
  "scene",
  "scene_image",
  "library_asset",
  "animation_transition",
  "animation_export",
  "narration_script",
  "uploaded_video",
] as const;
export type TimelineMediaKind = (typeof TIMELINE_MEDIA_KINDS)[number];

export const COMMON_SUBTITLE_LANGUAGES = [
  { tag: "en", label: "English" },
  { tag: "en-US", label: "English (United States)" },
  { tag: "en-GB", label: "English (United Kingdom)" },
  { tag: "nl", label: "Nederlands" },
  { tag: "nl-NL", label: "Nederlands (Nederland)" },
  { tag: "es", label: "Español" },
  { tag: "es-ES", label: "Español (España)" },
  { tag: "es-MX", label: "Español (México)" },
  { tag: "fr", label: "Français" },
  { tag: "fr-FR", label: "Français (France)" },
  { tag: "de", label: "Deutsch" },
  { tag: "de-DE", label: "Deutsch (Deutschland)" },
  { tag: "pt-BR", label: "Português (Brasil)" },
  { tag: "pt-PT", label: "Português (Portugal)" },
  { tag: "ar", label: "العربية" },
  { tag: "zh-Hans", label: "中文（简体）" },
  { tag: "it", label: "Italiano" },
  { tag: "ja", label: "日本語" },
  { tag: "ko", label: "한국어" },
] as const;

const BASE_TRACKS: Array<{ type: TimelineTrackType; sortOrder: number }> = [
  { type: "VIDEO", sortOrder: 0 },
  { type: "DIALOGUE", sortOrder: 1 },
  { type: "NARRATION", sortOrder: 2 },
  { type: "MUSIC", sortOrder: 3 },
  { type: "SFX", sortOrder: 4 },
];

export type TimelineCue = {
  id?: string;
  text: string;
  startMs: number;
  endMs: number;
  sceneId?: string;
};

export type CueCheck =
  | { ok: true; outsideFilm: boolean }
  | { ok: false; code: "negative" | "order" | "empty" | "overlap" };

export function isTimelineTrackType(value: string): value is TimelineTrackType {
  return (TIMELINE_TRACK_TYPES as readonly string[]).includes(value);
}

export function defaultTimelineTracks(): Array<{ type: TimelineTrackType; sortOrder: number; language: string }> {
  return BASE_TRACKS.map((track) => ({ ...track, language: "" }));
}

export function nextSubtitleOrder(orders: number[]): number {
  return orders.length === 0 ? 5 : Math.max(...orders) + 1;
}

/** Preserve regional variants. es-MX stays es-MX and is not folded into es-ES. */
export function normalizeLanguageTag(raw: string): string | null {
  const trimmed = raw.trim().replace(/_/g, "-");
  if (!trimmed || trimmed.length > 35) return null;
  const parts = trimmed.split("-");
  if (parts.length > 4) return null;
  const language = parts[0] ?? "";
  if (!/^[A-Za-z]{2,3}$/.test(language)) return null;
  const normalized = [language.toLowerCase()];
  for (const part of parts.slice(1)) {
    if (/^[A-Za-z]{4}$/.test(part)) {
      normalized.push(part[0]!.toUpperCase() + part.slice(1).toLowerCase());
    } else if (/^[A-Za-z]{2}$/.test(part)) {
      normalized.push(part.toUpperCase());
    } else if (/^[0-9]{3}$/.test(part) || /^[A-Za-z0-9]{5,8}$/.test(part)) {
      normalized.push(part);
    } else {
      return null;
    }
  }
  return normalized.join("-");
}

export function searchLanguages(query: string): Array<{ tag: string; label: string }> {
  const needle = query.trim().toLowerCase();
  const rows = COMMON_SUBTITLE_LANGUAGES.map((row) => ({ tag: row.tag, label: row.label }));
  if (!needle) return rows;
  return rows.filter((row) => row.tag.toLowerCase().includes(needle) || row.label.toLowerCase().includes(needle));
}

export function volumePercent(value: number): number | null {
  if (!Number.isInteger(value) || value < 0 || value > 100) return null;
  return value;
}

export function validateCue(cue: TimelineCue, filmEndMs: number | null, others: TimelineCue[]): CueCheck {
  if (!cue.text.trim()) return { ok: false, code: "empty" };
  if (cue.startMs < 0 || cue.endMs < 0) return { ok: false, code: "negative" };
  if (!Number.isInteger(cue.startMs) || !Number.isInteger(cue.endMs)) return { ok: false, code: "order" };
  if (cue.startMs >= cue.endMs) return { ok: false, code: "order" };
  const overlaps = others.some((other) => other !== cue && other.id !== cue.id && cue.startMs < other.endMs && other.startMs < cue.endMs);
  if (overlaps) return { ok: false, code: "overlap" };
  return { ok: true, outsideFilm: filmEndMs != null && cue.endMs > filmEndMs };
}

export function cuesFromStored(raw: unknown): TimelineCue[] {
  if (!Array.isArray(raw)) return [];
  const cues: TimelineCue[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    const startMs = integerMs(record.startMs, record.start);
    const endMs = integerMs(record.endMs, record.end);
    if (!text || startMs == null || endMs == null) continue;
    cues.push({
      text,
      startMs,
      endMs,
      sceneId: typeof record.sceneId === "string" ? record.sceneId : undefined,
    });
  }
  return cues;
}

/**
 * One subtitle source per film.
 * A storyboard film reads StudioStoryboardSubtitleTrack only.
 * Clip text is ignored there, even if it differs.
 * A film without a storyboard reads the subtitle clips.
 */
export function authoritativeSubtitleCues(input: {
  storyboardId: string | null;
  storedEntries: unknown;
  trackId: string;
  clips: Array<{ id: string; text: string; startMs: number; durationMs: number; sourceId: string }>;
}): { source: "storyboard_track" | "timeline_clips"; cues: TimelineCue[] } {
  if (input.storyboardId) {
    return {
      source: "storyboard_track",
      cues: cuesFromStored(input.storedEntries).map((cue, index) => ({ ...cue, id: `${input.trackId}:${index}` })),
    };
  }
  return {
    source: "timeline_clips",
    cues: input.clips.map((clip) => ({
      id: clip.id,
      text: clip.text,
      startMs: clip.startMs,
      endMs: clip.startMs + clip.durationMs,
      sceneId: clip.sourceId || undefined,
    })),
  };
}

export function cuesToStored(cues: TimelineCue[]): Array<Record<string, unknown>> {
  return cues.map((cue) => ({
    text: cue.text.trim(),
    startMs: cue.startMs,
    endMs: cue.endMs,
    start: cue.startMs / 1000,
    end: cue.endMs / 1000,
    ...(cue.sceneId ? { sceneId: cue.sceneId } : {}),
  }));
}

function integerMs(preferred: unknown, seconds: unknown): number | null {
  if (typeof preferred === "number" && Number.isInteger(preferred)) return preferred;
  if (typeof seconds === "number" && Number.isFinite(seconds)) return Math.round(seconds * 1000);
  return null;
}

export function formatTimestamp(ms: number, separator: "," | "."): string {
  const safe = Math.max(0, Math.trunc(ms));
  const h = Math.floor(safe / 3_600_000);
  const m = Math.floor((safe % 3_600_000) / 60_000);
  const s = Math.floor((safe % 60_000) / 1000);
  const milli = safe % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${separator}${String(milli).padStart(3, "0")}`;
}

function cuesAsSubtitleEntries(cues: TimelineCue[]) {
  return cues
    .filter((cue) => cue.text.trim() && cue.endMs > cue.startMs)
    .map((cue) => ({
      start: cue.startMs / 1000,
      end: cue.endMs / 1000,
      text: cue.text.trim(),
      sceneId: cue.sceneId,
    }));
}

export function buildSrt(cues: TimelineCue[]): string {
  return buildSrtFromSubtitleEntries(cuesAsSubtitleEntries(cues));
}

export function buildVtt(cues: TimelineCue[], language: string): string {
  const body = cuesAsSubtitleEntries(cues)
    .map((entry) => `${formatTimestamp(Math.round(entry.start * 1000), ".")} --> ${formatTimestamp(Math.round(entry.end * 1000), ".")}\n${entry.text}`)
    .join("\n\n");
  return `WEBVTT\nLanguage: ${language}\n\n${body}`.trim();
}

export function subtitleFilename(title: string, language: string, extension: "srt" | "vtt"): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "film";
  return `${slug}.${language}.${extension}`;
}

export type ClipPatch = {
  startMs?: number;
  durationMs?: number;
  inMs?: number;
  outMs?: number | null;
  volume?: number;
  muted?: boolean;
  text?: string;
};

export type ClipShape = {
  startMs: number;
  durationMs: number;
  inMs: number;
  outMs: number | null;
  volume: number;
  muted: boolean;
  text: string;
};

export function applyClipPatch(current: ClipShape, patch: ClipPatch): { ok: true; value: ClipShape } | { ok: false; code: "timing" | "volume" } {
  const next: ClipShape = {
    startMs: patch.startMs ?? current.startMs,
    durationMs: patch.durationMs ?? current.durationMs,
    inMs: patch.inMs ?? current.inMs,
    outMs: patch.outMs === undefined ? current.outMs : patch.outMs,
    volume: patch.volume ?? current.volume,
    muted: patch.muted ?? current.muted,
    text: patch.text ?? current.text,
  };
  if (!Number.isInteger(next.startMs) || next.startMs < 0) return { ok: false, code: "timing" };
  if (!Number.isInteger(next.durationMs) || next.durationMs <= 0) return { ok: false, code: "timing" };
  if (!Number.isInteger(next.inMs) || next.inMs < 0) return { ok: false, code: "timing" };
  if (next.outMs != null && (!Number.isInteger(next.outMs) || next.outMs <= next.inMs)) return { ok: false, code: "timing" };
  if (volumePercent(next.volume) == null) return { ok: false, code: "volume" };
  return { ok: true, value: next };
}

export function trimEdge(current: ClipShape, edge: "start" | "end", atMs: number): ReturnType<typeof applyClipPatch> {
  if (!Number.isInteger(atMs)) return { ok: false, code: "timing" };
  if (edge === "start") {
    const end = current.startMs + current.durationMs;
    if (atMs < 0 || atMs >= end) return { ok: false, code: "timing" };
    const delta = atMs - current.startMs;
    return applyClipPatch(current, { startMs: atMs, durationMs: current.durationMs - delta, inMs: current.inMs + Math.max(0, delta) });
  }
  if (atMs <= current.startMs) return { ok: false, code: "timing" };
  return applyClipPatch(current, { durationMs: atMs - current.startMs });
}

export function tracksAreCompatible(from: TimelineTrackType, to: TimelineTrackType): boolean {
  return from === to;
}

export function sameRevision(current: number, expected: number): boolean {
  return Number.isInteger(expected) && current === expected;
}

export function existingSourceIds(sourceIds: string[], sourceId: string): boolean {
  return sourceIds.includes(sourceId);
}

export type DialogueView = {
  preparedText: string | null;
  audioStatus: "ready" | "not_generated";
  speakerStatus: "unassigned";
};

export function presentDialogue(input: { text: string | null; audioUrl: string | null }): DialogueView {
  const prepared = input.text?.trim() || null;
  return {
    preparedText: prepared,
    audioStatus: input.audioUrl?.trim() ? "ready" : "not_generated",
    speakerStatus: "unassigned",
  };
}

export type NarrationView = {
  script: string;
  audioStatus: "ready" | "not_generated" | "no_script";
};

export function presentNarration(input: { script: string; audioUrl: string | null }): NarrationView {
  const script = input.script.trim();
  if (!script && !input.audioUrl?.trim()) return { script: "", audioStatus: "no_script" };
  return { script, audioStatus: input.audioUrl?.trim() ? "ready" : "not_generated" };
}

export function filmEndMs(clips: Array<{ startMs: number; durationMs: number }>): number {
  return clips.reduce((end, clip) => Math.max(end, clip.startMs + clip.durationMs), 0);
}

export function clampPlayhead(value: number, filmEnd: number): number {
  if (!Number.isFinite(value)) return 0;
  const end = Number.isFinite(filmEnd) ? Math.max(0, filmEnd) : 0;
  return Math.min(end, Math.max(0, value));
}

export function advancePlayhead(value: number, deltaMs: number, filmEnd: number): { next: number; ended: boolean } {
  const end = Math.max(filmEnd, 1000);
  const next = value + Math.max(0, deltaMs);
  if (next >= end) return { next: end, ended: true };
  return { next, ended: false };
}

export function cueAt(cues: TimelineCue[], playheadMs: number): TimelineCue | null {
  return cues.find((cue) => playheadMs >= cue.startMs && playheadMs < cue.endMs) ?? null;
}

export function audibleClip(input: { muted: boolean; trackMuted: boolean; volume: number; trackVolume: number; playbackUrl: string | null }): boolean {
  if (!input.playbackUrl) return false;
  if (input.muted || input.trackMuted) return false;
  return input.volume > 0 && input.trackVolume > 0;
}

export function msFromPixels(pixels: number, pixelsPerSecond: number): number {
  if (pixelsPerSecond <= 0) return 0;
  return Math.max(0, Math.round((pixels / pixelsPerSecond) * 1000));
}

export function futureTranslationPlan(): { executes: false; requiresApproval: true; overwritesManualEdits: false } {
  return { executes: false, requiresApproval: true, overwritesManualEdits: false };
}

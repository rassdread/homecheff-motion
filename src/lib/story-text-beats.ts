/**
 * Multi-beat text layers — parse, resolve, and sync legacy string fields.
 */

export const MAX_LAYER_BEATS = 5;

export type TextBeatLayerKey =
  | "headline"
  | "title"
  | "subtitle"
  | "hero"
  | "finale";

export function parseTextBeats(raw: unknown, max = MAX_LAYER_BEATS): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function resolveTextBeats(params: {
  beats?: unknown;
  legacy?: string;
  uppercase?: boolean;
  max?: number;
}): string[] {
  const parsed = parseTextBeats(params.beats, params.max);
  if (parsed.length > 0) {
    return params.uppercase ? parsed.map((line) => line.toUpperCase()) : parsed;
  }
  const legacy = typeof params.legacy === "string" ? params.legacy.trim() : "";
  if (!legacy) {
    return [];
  }
  if (legacy.includes("\n")) {
    return legacy
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, params.max ?? MAX_LAYER_BEATS)
      .map((line) => (params.uppercase ? line.toUpperCase() : line));
  }
  return [params.uppercase ? legacy.toUpperCase() : legacy];
}

/** Draft/UI rows — always show at least one editable beat. */
export function beatsForEditor(beats: string[] | undefined, legacy = ""): string[] {
  const resolved = beats?.length ? beats : legacy.trim() ? [legacy] : [];
  return resolved.length > 0 ? resolved : [""];
}

export function trimBeats(beats: string[]): string[] {
  return beats.map((line) => line.trim()).filter(Boolean).slice(0, MAX_LAYER_BEATS);
}

export function syncLegacyFieldFromBeats(beats: string[]): string {
  return beats.map((line) => line.trim()).find(Boolean) ?? "";
}

export type SceneTextBeatFields = {
  headlineBeats: string[];
  titleBeats: string[];
  subtitleBeats: string[];
  heroTextBeats: string[];
  finaleTextBeats: string[];
};

export function hasAnyTextBeats(scene: SceneTextBeatFields): boolean {
  return (
    scene.headlineBeats.length > 1 ||
    scene.titleBeats.length > 1 ||
    scene.subtitleBeats.length > 1 ||
    scene.heroTextBeats.length > 1 ||
    scene.finaleTextBeats.length > 1
  );
}

export function pickBeatArraysForApi(scene: SceneTextBeatFields): Partial<{
  headlineBeats: string[];
  titleBeats: string[];
  subtitleBeats: string[];
  heroTextBeats: string[];
  finaleTextBeats: string[];
}> {
  const out: Partial<{
    headlineBeats: string[];
    titleBeats: string[];
    subtitleBeats: string[];
    heroTextBeats: string[];
    finaleTextBeats: string[];
  }> = {};
  if (scene.headlineBeats.length > 1) {
    out.headlineBeats = scene.headlineBeats;
  }
  if (scene.titleBeats.length > 1) {
    out.titleBeats = scene.titleBeats;
  }
  if (scene.subtitleBeats.length > 1) {
    out.subtitleBeats = scene.subtitleBeats;
  }
  if (scene.heroTextBeats.length > 1) {
    out.heroTextBeats = scene.heroTextBeats;
  }
  if (scene.finaleTextBeats.length > 1) {
    out.finaleTextBeats = scene.finaleTextBeats;
  }
  return out;
}

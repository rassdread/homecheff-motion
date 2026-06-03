/**
 * ASS inline accent / highlight tags for Story Mode overlay text.
 */

import type { NormalizedSceneText } from "@/lib/story-overlay-templates";
import { detectAccentWords } from "@/lib/story-overlay-templates";

export type AccentHighlightColors = {
  primaryColorAss: string;
  accentColorAss: string;
};

export function escapeAssText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\N");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split accent input into uppercase tokens (words in a phrase). */
export function tokenizeAccentPhrase(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean)
    .map((part) => part.toUpperCase());
}

function spansOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && b.start < a.end;
}

function phrasePattern(tokens: string[]): RegExp {
  const chunks = tokens.map((token) => escapeRegExp(token));
  const gap = "[^A-Za-z0-9]*";
  return new RegExp(chunks.join(gap), "gi");
}

function wordPattern(token: string): RegExp {
  return new RegExp(`(?:^|[^A-Za-z0-9])(${escapeRegExp(token)})(?=[^A-Za-z0-9]|$)`, "gi");
}

function findAccentSpans(line: string, tokens: string[]): Array<{ start: number; end: number }> {
  if (tokens.length === 0) {
    return [];
  }
  const re = tokens.length === 1 ? wordPattern(tokens[0]!) : phrasePattern(tokens);
  const spans: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    if (tokens.length === 1 && match[1]) {
      const token = match[1];
      const start = match.index + match[0].indexOf(token);
      spans.push({ start, end: start + token.length });
    } else {
      spans.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return spans;
}

/** Apply inline ASS color tags for matched accent words/phrases (case-insensitive). */
export function applyAccentHighlightsToAssLine(
  line: string,
  accentWords: string[],
  colors: AccentHighlightColors
): string {
  const phraseTokens = accentWords
    .map(tokenizeAccentPhrase)
    .filter((tokens) => tokens.length > 0)
    .sort((a, b) => b.join(" ").length - a.join(" ").length);

  if (phraseTokens.length === 0) {
    return escapeAssText(line);
  }

  const spans: Array<{ start: number; end: number }> = [];
  for (const tokens of phraseTokens) {
    for (const span of findAccentSpans(line, tokens)) {
      if (!spans.some((existing) => spansOverlap(existing, span))) {
        spans.push(span);
      }
    }
  }

  if (spans.length === 0) {
    return escapeAssText(line);
  }

  spans.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const span of spans) {
    if (merged.some((existing) => spansOverlap(existing, span))) {
      continue;
    }
    merged.push(span);
  }

  let out = "";
  let cursor = 0;
  for (const span of merged) {
    if (span.start > cursor) {
      out += escapeAssText(line.slice(cursor, span.start));
    }
    out += `{\\c${colors.accentColorAss}&}${escapeAssText(line.slice(span.start, span.end))}{\\c${colors.primaryColorAss}&}`;
    cursor = span.end;
  }
  out += escapeAssText(line.slice(cursor));
  return out;
}

export function resolveSceneAccentWords(
  scene: Pick<NormalizedSceneText, "accentWords">,
  fallbackText = "",
  options?: { allowAutoDetect?: boolean }
): string[] {
  const manual = scene.accentWords.map((word) => word.trim()).filter(Boolean);
  if (manual.length > 0) {
    return manual;
  }
  if (options?.allowAutoDetect === false) {
    return [];
  }
  return detectAccentWords(fallbackText, scene);
}

export function sceneAccentFallbackText(scene: Pick<NormalizedSceneText, "headlineBeats" | "titleBeats" | "subtitleBeats" | "heroText" | "title" | "subtitle" | "extraLines">): string {
  return [
    ...scene.headlineBeats,
    ...scene.titleBeats,
    ...scene.subtitleBeats,
    scene.heroText,
    scene.title,
    scene.subtitle,
    ...scene.extraLines,
  ]
    .filter(Boolean)
    .join(" ");
}

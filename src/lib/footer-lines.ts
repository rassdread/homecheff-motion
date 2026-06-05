/**
 * Multi-line footer CTA — normalize legacy `finaleFooter` and `footerLines[]`.
 */

import { MAX_FINALE_FOOTER_CHARS } from "@/lib/story-overlay-templates";

export const MAX_FOOTER_LINES = 6;

export type FooterLineSource = {
  footerLines?: unknown;
  finaleFooter?: unknown;
};

export function parseFooterLinesFromScene(scene: FooterLineSource): string[] {
  if (Array.isArray(scene.footerLines)) {
    const fromArray = scene.footerLines
      .filter((line): line is string => typeof line === "string")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.slice(0, MAX_FINALE_FOOTER_CHARS))
      .slice(0, MAX_FOOTER_LINES);
    if (fromArray.length > 0) {
      return fromArray;
    }
  }
  const legacy = typeof scene.finaleFooter === "string" ? scene.finaleFooter.trim() : "";
  if (!legacy) {
    return [];
  }
  return [legacy.slice(0, MAX_FINALE_FOOTER_CHARS)];
}

/** Editor state: at least one row when on final frame. */
export function footerLinesForEditor(scene: FooterLineSource): string[] {
  const parsed = parseFooterLinesFromScene(scene);
  return parsed.length > 0 ? [...parsed] : [""];
}

export function syncFooterPersistence(editorLines: string[]): {
  footerLines: string[];
  finaleFooter: string;
} {
  const footerLines = editorLines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(0, MAX_FINALE_FOOTER_CHARS))
    .slice(0, MAX_FOOTER_LINES);
  return {
    footerLines,
    finaleFooter: footerLines[0] ?? "",
  };
}

export function hasFooterContent(scene: FooterLineSource): boolean {
  return parseFooterLinesFromScene(scene).length > 0;
}

export function moveFooterLine(lines: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= lines.length) {
    return lines;
  }
  const next = [...lines];
  const [item] = next.splice(fromIndex, 1);
  if (!item) {
    return lines;
  }
  next.splice(toIndex, 0, item);
  return next;
}

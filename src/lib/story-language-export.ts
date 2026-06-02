/**
 * Story Mode language export helpers — overlay-only from clean video.
 */

import { parseInstantMode } from "@/lib/instant-premium-mode-types";
import {
  hasSceneOverlayContent,
  parseInstantSceneTexts,
  type InstantSceneText,
} from "@/lib/story-overlay-templates";
import type { LanguageExportCode } from "@/lib/video-language-export";
import { translateSceneTexts, parseSceneTextsJson } from "@/lib/translate-scene-texts";

export const LANGUAGE_EXPORT_NO_CLEAN = "LANGUAGE_EXPORT_NO_CLEAN";

export function projectUsesStoryOverlay(project: {
  instantMode: string;
  instantSceneTexts: unknown;
}): boolean {
  if (parseInstantMode(project.instantMode) !== "story") {
    return false;
  }
  return parseInstantSceneTexts(project.instantSceneTexts).some((scene) =>
    hasSceneOverlayContent(scene)
  );
}

export function resolveCleanVideoUrlForOverlay(project: {
  instantCleanFinalVideoUrl: string | null;
}): string | null {
  const clean = project.instantCleanFinalVideoUrl?.trim();
  return clean || null;
}

/** Canonical storyboard language stored on the project (not re-translated). */
export function storySourceLanguageCode(): LanguageExportCode {
  return "original";
}

export async function prepareStorySceneTexts(params: {
  project: { instantSceneTexts: unknown };
  languageCode: LanguageExportCode;
  sceneTextOverrides?: InstantSceneText[];
  /** When true, use overrides as-is (reviewed composition) without machine translation. */
  skipTranslation?: boolean;
}): Promise<{
  sceneTexts: InstantSceneText[];
  translationProvider: string;
  translationFailed?: boolean;
  translationMessage?: string;
  sourceLanguage: LanguageExportCode;
  targetLanguage: LanguageExportCode;
}> {
  const sourceLanguage = storySourceLanguageCode();
  const targetLanguage = params.languageCode;
  const base =
    params.sceneTextOverrides?.length ?
      params.sceneTextOverrides
    : parseSceneTextsJson(params.project.instantSceneTexts);

  if (
    params.languageCode === "original" ||
    params.skipTranslation ||
    params.sceneTextOverrides?.length
  ) {
    return {
      sceneTexts: base,
      translationProvider:
        params.skipTranslation || params.sceneTextOverrides?.length ? "user_reviewed" : "none",
      sourceLanguage,
      targetLanguage,
    };
  }

  const translated = await translateSceneTexts({
    sceneTexts: base,
    targetLanguage: params.languageCode,
  });

  return {
    sceneTexts: translated.sceneTexts,
    translationProvider: translated.provider,
    translationFailed: translated.translationFailed,
    translationMessage: translated.translationError,
    sourceLanguage,
    targetLanguage,
  };
}

export function sceneTextsSummary(sceneTexts: InstantSceneText[]): string {
  const parts: string[] = [];
  for (const scene of sceneTexts) {
    if (typeof scene.heroText === "string" && scene.heroText.trim()) {
      parts.push(scene.heroText.trim());
    }
    if (typeof scene.title === "string" && scene.title.trim()) {
      parts.push(scene.title.trim());
    }
    if (typeof scene.subtitle === "string" && scene.subtitle.trim()) {
      parts.push(scene.subtitle.trim());
    }
    if (Array.isArray(scene.extraLines)) {
      for (const line of scene.extraLines) {
        if (typeof line === "string" && line.trim()) {
          parts.push(line.trim());
        }
      }
    }
    if (Array.isArray(scene.lines)) {
      for (const line of scene.lines) {
        if (typeof line === "string" && line.trim()) {
          parts.push(line.trim());
        }
      }
    }
  }
  const joined = parts.slice(0, 3).join(" · ");
  return joined.length > 120 ? `${joined.slice(0, 117)}…` : joined;
}

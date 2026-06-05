/**
 * Live storyboard overlay preview — field order matches on-screen render.
 */

import type { InstantSceneTextDraft } from "@/components/instant/instant-mode-panel";
import { parseFooterLinesFromScene } from "@/lib/footer-lines";
import type { SceneOverlayTemplate } from "@/lib/story-overlay-templates";
import { resolveTextBeats } from "@/lib/story-text-beats";

export type StoryboardOverlayPreviewLine = {
  id: string;
  kind:
    | "headline"
    | "title"
    | "subtitle"
    | "extra_line"
    | "sequence_line"
    | "hero_finale"
    | "footer";
  styleLayer: import("@/lib/story-overlay-layer-styles").StoryOverlayStyleLayer;
  labelKey: string;
  /** 1-based beat index when labelKey ends with Beat */
  beatNumber?: number;
  text: string;
};

function showHeadline(template: SceneOverlayTemplate): boolean {
  return template === "auto" || template === "scene" || template === "hero";
}

function showTitleSubtitle(template: SceneOverlayTemplate): boolean {
  return template === "auto" || template === "scene" || template === "hero";
}

function defaultSequenceLines(scene: InstantSceneTextDraft): string[] {
  if (scene.lines.length > 0) {
    return scene.lines;
  }
  if (scene.heroText.trim()) {
    return [scene.heroText, ""];
  }
  return ["", ""];
}

export function buildStoryboardOverlayPreviewLines(
  scene: InstantSceneTextDraft,
  options?: { isFinalFrame?: boolean }
): StoryboardOverlayPreviewLine[] {
  const lines: StoryboardOverlayPreviewLine[] = [];
  const isFinalFrame = options?.isFinalFrame ?? false;

  if (showHeadline(scene.template)) {
    const headlineBeats = resolveTextBeats({
      beats: scene.headlineBeats,
      legacy: scene.heroText,
      uppercase: true,
    });
    for (const [index, text] of headlineBeats.entries()) {
      if (!text.trim()) {
        continue;
      }
      const styleLayer = scene.template === "hero" ? "hero" : "headline";
      lines.push({
        id: `headline-${index}`,
        kind: "headline",
        styleLayer,
        labelKey:
          index === 0 && headlineBeats.length === 1
            ? "instant.storyboard.preview.headline"
            : "instant.storyboard.preview.headlineBeat",
        beatNumber: headlineBeats.length > 1 ? index + 1 : undefined,
        text: text.trim(),
      });
    }
  }

  if (showTitleSubtitle(scene.template)) {
    const titleBeats = resolveTextBeats({ beats: scene.titleBeats, legacy: scene.title });
    for (const [index, text] of titleBeats.entries()) {
      if (!text.trim()) {
        continue;
      }
      lines.push({
        id: `title-${index}`,
        kind: "title",
        styleLayer: "title",
        labelKey:
          index === 0 && titleBeats.length === 1
            ? "instant.storyboard.preview.title"
            : "instant.storyboard.preview.titleBeat",
        beatNumber: titleBeats.length > 1 ? index + 1 : undefined,
        text: text.trim(),
      });
    }
  }

  if (showTitleSubtitle(scene.template)) {
    const subtitleBeats = resolveTextBeats({ beats: scene.subtitleBeats, legacy: scene.subtitle });
    for (const [index, text] of subtitleBeats.entries()) {
      if (!text.trim()) {
        continue;
      }
      lines.push({
        id: `subtitle-${index}`,
        kind: "subtitle",
        styleLayer: "subtitle",
        labelKey:
          index === 0 && subtitleBeats.length === 1
            ? "instant.storyboard.preview.subtitle"
            : "instant.storyboard.preview.subtitleBeat",
        beatNumber: subtitleBeats.length > 1 ? index + 1 : undefined,
        text: text.trim(),
      });
    }
  }

  for (const [index, line] of scene.extraLines.entries()) {
    if (!line.trim()) {
      continue;
    }
    lines.push({
      id: `extra-${index}`,
      kind: "extra_line",
      styleLayer: "subtitle",
      labelKey: "instant.storyboard.preview.extraLine",
      text: line.trim(),
    });
  }

  if (scene.template === "sequence") {
    for (const [index, line] of defaultSequenceLines(scene).entries()) {
      if (!line.trim()) {
        continue;
      }
      lines.push({
        id: `sequence-${index}`,
        kind: "sequence_line",
        styleLayer: "hero",
        labelKey: "instant.storyboard.preview.sequenceLine",
        text: line.trim(),
      });
    }
    if (scene.heroFinale && scene.heroFinaleText.trim()) {
      lines.push({
        id: "hero-finale",
        kind: "hero_finale",
        styleLayer: "finale",
        labelKey: "instant.storyboard.preview.heroFinale",
        text: scene.heroFinaleText.trim().toUpperCase(),
      });
    }
  }

  if (isFinalFrame) {
    const footerLines = parseFooterLinesFromScene(scene);
    footerLines.forEach((line, index) => {
      lines.push({
        id: `footer-${index}`,
        kind: "footer",
        styleLayer: "footer",
        labelKey:
          footerLines.length > 1 ?
            "instant.storyboard.preview.footerLine"
          : "instant.storyboard.preview.footer",
        beatNumber: footerLines.length > 1 ? index + 1 : undefined,
        text: line,
      });
    });
  }

  return lines;
}

export function storyboardPreviewHasContent(lines: StoryboardOverlayPreviewLine[]): boolean {
  return lines.some((line) => line.text.trim().length > 0);
}

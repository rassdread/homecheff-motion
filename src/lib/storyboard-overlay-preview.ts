/**
 * Live storyboard overlay preview — field order matches on-screen render.
 */

import type { InstantSceneTextDraft } from "@/components/instant/instant-mode-panel";
import type { SceneOverlayTemplate } from "@/lib/story-overlay-templates";

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
  labelKey: string;
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

  if (showHeadline(scene.template) && scene.heroText.trim()) {
    lines.push({
      id: "headline",
      kind: "headline",
      labelKey: "instant.storyboard.preview.headline",
      text: scene.heroText.trim().toUpperCase(),
    });
  }

  if (showTitleSubtitle(scene.template) && scene.title.trim()) {
    lines.push({
      id: "title",
      kind: "title",
      labelKey: "instant.storyboard.preview.title",
      text: scene.title.trim(),
    });
  }

  if (showTitleSubtitle(scene.template) && scene.subtitle.trim()) {
    lines.push({
      id: "subtitle",
      kind: "subtitle",
      labelKey: "instant.storyboard.preview.subtitle",
      text: scene.subtitle.trim(),
    });
  }

  for (const [index, line] of scene.extraLines.entries()) {
    if (!line.trim()) {
      continue;
    }
    lines.push({
      id: `extra-${index}`,
      kind: "extra_line",
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
        labelKey: "instant.storyboard.preview.sequenceLine",
        text: line.trim(),
      });
    }
    if (scene.heroFinale && scene.heroFinaleText.trim()) {
      lines.push({
        id: "hero-finale",
        kind: "hero_finale",
        labelKey: "instant.storyboard.preview.heroFinale",
        text: scene.heroFinaleText.trim().toUpperCase(),
      });
    }
  }

  if (isFinalFrame && scene.finaleFooter.trim()) {
    lines.push({
      id: "footer",
      kind: "footer",
      labelKey: "instant.storyboard.preview.footer",
      text: scene.finaleFooter.trim(),
    });
  }

  return lines;
}

export function storyboardPreviewHasContent(lines: StoryboardOverlayPreviewLine[]): boolean {
  return lines.some((line) => line.text.trim().length > 0);
}

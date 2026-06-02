import type { InstantSceneTextDraft } from "@/components/instant/instant-mode-panel";
import {
  MAX_EXTRA_LINES,
  type InstantSceneText,
} from "@/lib/story-overlay-templates";

/** Serialize wizard / language-editor draft row to API sceneTexts payload. */
export function instantSceneTextFromDraft(
  scene: InstantSceneTextDraft,
  index: number,
  totalCount: number
): InstantSceneText {
  const isLast = index >= totalCount - 1;
  const transitionSeconds = scene.transitionDurationSeconds ?? scene.durationSeconds;
  const extraLines = scene.extraLines.map((line) => line.trim()).filter(Boolean).slice(0, MAX_EXTRA_LINES);
  const lines = scene.lines.map((line) => line.trim()).filter(Boolean);
  return {
    template: scene.template,
    ...(isLast ?
      {}
    : {
        transitionDurationSeconds: transitionSeconds,
        durationSeconds: transitionSeconds,
      }),
    heroText: scene.heroText.trim() || undefined,
    title: scene.title.trim() || undefined,
    subtitle: scene.subtitle.trim() || undefined,
    extraLines: extraLines.length > 0 ? extraLines : undefined,
    accentWords: scene.accentWords
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean),
    lines: lines.length > 0 ? lines : undefined,
    heroFinale: scene.template === "sequence" ? scene.heroFinale : undefined,
    heroFinaleText:
      scene.template === "sequence" && scene.heroFinaleText.trim() ?
        scene.heroFinaleText.trim()
      : undefined,
    finaleFooter:
      isLast && scene.finaleFooter.trim() ? scene.finaleFooter.trim() : undefined,
  };
}

export function instantSceneTextsFromDrafts(
  drafts: InstantSceneTextDraft[],
  imageCount: number
): InstantSceneText[] {
  const count = Math.max(1, imageCount);
  return drafts.slice(0, count).map((scene, index) => instantSceneTextFromDraft(scene, index, count));
}

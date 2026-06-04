import type { InstantSceneTextDraft } from "@/lib/instant-scene-text-draft-model";
import {
  MAX_EXTRA_LINES,
  normalizeSceneText,
  type InstantSceneText,
} from "@/lib/story-overlay-templates";
import { hasCustomOverlayLayerStyles, sanitizeOverlayLayerStyles } from "@/lib/story-overlay-layer-styles";
import { pickBeatArraysForApi, trimBeats } from "@/lib/story-text-beats";
import { resolveSceneEmotionId } from "@/lib/animation-scene-emotions";

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
  const resolvedEmotion = resolveSceneEmotionId({
    emotionMode: scene.emotionMode,
    emotion: scene.emotion,
    autoEmotion: scene.autoEmotion,
    sceneIndex: index,
    sceneCount: totalCount,
    textSignals: {
      heroText: scene.heroText,
      title: scene.title,
      subtitle: scene.subtitle,
      heroFinaleText: scene.heroFinaleText,
      finaleFooter: scene.finaleFooter,
      extraLines: scene.extraLines,
      lines: scene.lines,
    },
  });

  const normalized = normalizeSceneText({
    template: scene.template,
    heroText: scene.heroText.trim() || undefined,
    title: scene.title.trim() || undefined,
    subtitle: scene.subtitle.trim() || undefined,
    headlineBeats: trimBeats(scene.headlineBeats),
    titleBeats: trimBeats(scene.titleBeats),
    subtitleBeats: trimBeats(scene.subtitleBeats),
    heroTextBeats: trimBeats(scene.heroTextBeats),
    finaleTextBeats: trimBeats(scene.finaleTextBeats),
  });

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
    ...pickBeatArraysForApi(normalized),
    ...(hasCustomOverlayLayerStyles(scene.overlayLayerStyles) ?
      { overlayLayerStyles: sanitizeOverlayLayerStyles(scene.overlayLayerStyles) }
    : {}),
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
    emotionMode: scene.emotionMode,
    emotion: scene.emotionMode === "manual" ? scene.emotion : undefined,
    autoEmotion: scene.emotionMode === "auto" ? (scene.autoEmotion ?? resolvedEmotion) : undefined,
    actingIntensity: scene.actingIntensity,
  };
}

export function instantSceneTextsFromDrafts(
  drafts: InstantSceneTextDraft[],
  imageCount: number
): InstantSceneText[] {
  const count = Math.max(1, imageCount);
  return drafts.slice(0, count).map((scene, index) => instantSceneTextFromDraft(scene, index, count));
}

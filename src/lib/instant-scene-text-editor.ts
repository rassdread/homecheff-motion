import {
  emptySceneTextDraft,
  type InstantSceneTextDraft,
} from "@/components/instant/instant-mode-panel";
import {
  normalizeSceneText,
  STORY_SCENE_DURATION_OPTIONS,
  type StorySceneDurationSeconds,
} from "@/lib/story-overlay-templates";
import { parseSceneTextsJson } from "@/lib/translate-scene-texts";
import { beatsForEditor } from "@/lib/story-text-beats";
import { sanitizeOverlayLayerStyles } from "@/lib/story-overlay-layer-styles";

function toDraftDuration(
  value: number | undefined,
  fallback: StorySceneDurationSeconds = 5
): StorySceneDurationSeconds {
  if (value === 3 || value === 5 || value === 7) {
    return value;
  }
  return STORY_SCENE_DURATION_OPTIONS.includes(
    fallback as (typeof STORY_SCENE_DURATION_OPTIONS)[number]
  )
    ? fallback
    : 5;
}

/** Map persisted/API scene text to wizard draft row (editor load). */
export function sceneTextToDraft(
  scene: ReturnType<typeof parseSceneTextsJson>[number]
): InstantSceneTextDraft {
  const pace = toDraftDuration(scene.transitionDurationSeconds ?? scene.durationSeconds);
  const heroText = scene.heroText ?? "";
  const title = scene.title ?? "";
  const subtitle = scene.subtitle ?? "";
  const heroFinaleText = scene.heroFinaleText ?? "";
  return {
    ...emptySceneTextDraft(pace),
    template: scene.template ?? "auto",
    transitionDurationSeconds: pace,
    durationSeconds: pace,
    heroText,
    title,
    subtitle,
    headlineBeats: beatsForEditor(
      Array.isArray(scene.headlineBeats) ? scene.headlineBeats.map(String) : undefined,
      heroText
    ),
    titleBeats: beatsForEditor(
      Array.isArray(scene.titleBeats) ? scene.titleBeats.map(String) : undefined,
      title
    ),
    subtitleBeats: beatsForEditor(
      Array.isArray(scene.subtitleBeats) ? scene.subtitleBeats.map(String) : undefined,
      subtitle
    ),
    heroTextBeats: beatsForEditor(
      Array.isArray(scene.heroTextBeats) ? scene.heroTextBeats.map(String) : undefined,
      heroText
    ),
    finaleTextBeats: beatsForEditor(
      Array.isArray(scene.finaleTextBeats) ? scene.finaleTextBeats.map(String) : undefined,
      heroFinaleText
    ),
    extraLines: Array.isArray(scene.extraLines) ? scene.extraLines.map(String) : [],
    accentWords: Array.isArray(scene.accentWords) ? scene.accentWords.join(", ") : "",
    lines: Array.isArray(scene.lines) ? scene.lines.map(String) : [],
    heroFinale: scene.heroFinale !== false,
    heroFinaleText: scene.heroFinaleText ?? "",
    finaleFooter: scene.finaleFooter ?? "",
    overlayLayerStyles: sanitizeOverlayLayerStyles(
      (scene as { overlayLayerStyles?: unknown }).overlayLayerStyles as
        | import("@/lib/story-overlay-layer-styles").StoryOverlayLayerStyles
        | undefined
    ),
  };
}

/** Build editor drafts from stored project scene texts. */
export function buildSceneTextDraftsFromProject(
  instantSceneTexts: unknown,
  imageCount: number
): InstantSceneTextDraft[] {
  const parsed = parseSceneTextsJson(instantSceneTexts);
  const count = Math.max(1, imageCount, parsed.length);
  return Array.from({ length: count }, (_, index) =>
    sceneTextToDraft(parsed[index] ?? normalizeSceneText({}))
  );
}

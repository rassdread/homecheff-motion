import { mapHandoffSceneToPersistedText, mapStudioEmotionToMotion } from "@/lib/studio-motion-handoff-map";
import type { InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import {
  emptyNormalizedSceneText,
  normalizeStorySceneDurationSeconds,
  type NormalizedSceneText,
} from "@/lib/story-overlay-templates";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

export function mergeStudioHandoffIntoSceneText(params: {
  current: NormalizedSceneText | undefined;
  studioScene: MotionHandoffPayload["scenes"][number];
  syncTexts: boolean;
  syncEmotions: boolean;
  syncDurations: boolean;
  transitionSeconds: InstantTransitionSeconds;
  isLast: boolean;
}): NormalizedSceneText {
  const base = params.current ?? emptyNormalizedSceneText();
  const mapped = mapHandoffSceneToPersistedText(params.studioScene, params.transitionSeconds);

  let next: NormalizedSceneText = { ...base };

  if (params.syncTexts) {
    next = {
      ...next,
      title: mapped.title.trim() || next.title,
      subtitle: mapped.subtitle.trim() || next.subtitle,
      heroText: mapped.heroText.trim() || next.heroText,
      extraLines: mapped.extraLines.length > 0 ? mapped.extraLines : next.extraLines,
    };
  }

  if (params.syncEmotions) {
    const emotionPatch = mapStudioEmotionToMotion(params.studioScene.emotion);
    next = {
      ...next,
      emotionMode: emotionPatch.emotionMode,
      emotion: emotionPatch.emotionMode === "manual" ? emotionPatch.emotion : undefined,
      autoEmotion: emotionPatch.emotionMode === "auto" ? next.autoEmotion : undefined,
    };
  }

  if (params.syncDurations && !params.isLast) {
    const duration = normalizeStorySceneDurationSeconds(
      params.studioScene.durationSeconds,
      params.transitionSeconds
    );
    next = {
      ...next,
      transitionDurationSeconds: duration,
      durationSeconds: duration,
    };
  }

  return next;
}

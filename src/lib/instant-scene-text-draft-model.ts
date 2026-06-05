/**
 * Server-safe scene text draft defaults (used by API routes and client editors).
 */

import type {
  AnimationSceneEmotionId,
  SceneActingIntensity,
  SceneEmotionMode,
} from "@/lib/animation-scene-emotions";
import {
  DEFAULT_SCENE_EMOTION_MODE,
  DEFAULT_STORY_ACTING_INTENSITY,
} from "@/lib/animation-scene-emotions";
import type { InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import type { StoryOverlayLayerStyles } from "@/lib/story-overlay-layer-styles";
import type { SceneOverlayTemplate, StorySceneDurationSeconds } from "@/lib/story-overlay-templates";

export function storyDurationDefault(
  transitionSeconds: number
): StorySceneDurationSeconds {
  if (transitionSeconds === 3) {
    return 3;
  }
  if (transitionSeconds === 8) {
    return 7;
  }
  return 5;
}

export type InstantSceneTextDraft = {
  template: SceneOverlayTemplate;
  /** Duration of transition into the next frame (ignored on last frame). */
  transitionDurationSeconds: StorySceneDurationSeconds;
  /** @deprecated Mirrored from transitionDurationSeconds for API compatibility. */
  durationSeconds: StorySceneDurationSeconds;
  heroText: string;
  title: string;
  subtitle: string;
  headlineBeats: string[];
  titleBeats: string[];
  subtitleBeats: string[];
  heroTextBeats: string[];
  finaleTextBeats: string[];
  extraLines: string[];
  accentWords: string;
  lines: string[];
  heroFinale: boolean;
  heroFinaleText: string;
  finaleFooter: string;
  footerLines: string[];
  emotionMode: SceneEmotionMode;
  emotion?: AnimationSceneEmotionId;
  autoEmotion?: AnimationSceneEmotionId;
  actingIntensity: SceneActingIntensity;
  overlayLayerStyles: StoryOverlayLayerStyles;
};

export function emptySceneTextDraft(
  fallbackTransitionSeconds: InstantTransitionSeconds | number = 5
): InstantSceneTextDraft {
  const pace = storyDurationDefault(fallbackTransitionSeconds);
  return {
    template: "auto",
    transitionDurationSeconds: pace,
    durationSeconds: pace,
    heroText: "",
    title: "",
    subtitle: "",
    headlineBeats: [],
    titleBeats: [],
    subtitleBeats: [],
    heroTextBeats: [],
    finaleTextBeats: [],
    extraLines: [],
    accentWords: "",
    lines: [],
    heroFinale: true,
    heroFinaleText: "",
    finaleFooter: "",
    footerLines: [""],
    emotionMode: DEFAULT_SCENE_EMOTION_MODE,
    actingIntensity: DEFAULT_STORY_ACTING_INTENSITY,
    overlayLayerStyles: {},
  };
}

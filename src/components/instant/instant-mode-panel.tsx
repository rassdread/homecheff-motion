"use client";

import type { InstantMode, InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import { INSTANT_TRANSITION_SECONDS_OPTIONS } from "@/lib/instant-premium-mode-types";
import { STORY_SCENE_DURATION_OPTIONS } from "@/lib/story-overlay-templates";
import { useActiveTranslator } from "@/i18n/client";
import type { SceneOverlayTemplate, StorySceneDurationSeconds } from "@/lib/story-overlay-templates";
import type {
  AnimationSceneEmotionId,
  SceneActingIntensity,
  SceneEmotionMode,
} from "@/lib/animation-scene-emotions";
import {
  DEFAULT_SCENE_EMOTION_MODE,
  DEFAULT_STORY_ACTING_INTENSITY,
} from "@/lib/animation-scene-emotions";

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
  emotionMode: SceneEmotionMode;
  emotion?: AnimationSceneEmotionId;
  autoEmotion?: AnimationSceneEmotionId;
  actingIntensity: SceneActingIntensity;
  overlayLayerStyles: import("@/lib/story-overlay-layer-styles").StoryOverlayLayerStyles;
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
    emotionMode: DEFAULT_SCENE_EMOTION_MODE,
    actingIntensity: DEFAULT_STORY_ACTING_INTENSITY,
    overlayLayerStyles: {},
  };
}

type InstantModePanelProps = {
  instantMode: InstantMode;
  onInstantModeChange: (mode: InstantMode) => void;
  transitionSeconds: InstantTransitionSeconds;
  onTransitionSecondsChange: (seconds: InstantTransitionSeconds) => void;
  imageCount: number;
  frameCount: number;
  transitionCount: number;
  videoDurationSeconds: number;
  storyboardDurationSeconds: number;
  perTransitionProviderSeconds: number;
  estimatedPriceLabel: string;
  pacingOptionsShareSamePrice: boolean;
};

const TRANSITION_DURATION_LABEL_KEYS: Record<
  InstantTransitionSeconds,
  { title: string; subtitle: string }
> = {
  3: {
    title: "instant.mode.duration.fast",
    subtitle: "instant.mode.duration.fastHint",
  },
  5: {
    title: "instant.mode.duration.standard",
    subtitle: "instant.mode.duration.standardHint",
  },
  8: {
    title: "instant.mode.duration.cinematic",
    subtitle: "instant.mode.duration.cinematicHint",
  },
};

const STORY_FALLBACK_DURATION_KEYS: Record<
  StorySceneDurationSeconds,
  { title: string; subtitle: string }
> = {
  3: {
    title: "instant.storyboard.duration.3",
    subtitle: "instant.mode.duration.fastHint",
  },
  5: {
    title: "instant.storyboard.duration.5",
    subtitle: "instant.mode.duration.standardHint",
  },
  7: {
    title: "instant.storyboard.duration.7",
    subtitle: "instant.storyboard.durationHint",
  },
};

function storyFallbackFromTransition(
  seconds: InstantTransitionSeconds
): StorySceneDurationSeconds {
  return storyDurationDefault(seconds);
}

export function InstantModePanel({
  instantMode,
  onInstantModeChange,
  transitionSeconds,
  onTransitionSecondsChange,
  imageCount,
  frameCount,
  transitionCount,
  videoDurationSeconds,
  storyboardDurationSeconds,
  perTransitionProviderSeconds,
  estimatedPriceLabel,
  pacingOptionsShareSamePrice,
}: InstantModePanelProps) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{t("instant.mode.selectorTitle")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onInstantModeChange("transition")}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              instantMode === "transition" ?
                "border-emerald-500 bg-emerald-50 shadow-sm"
              : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <p className="text-sm font-semibold text-zinc-900">{t("instant.mode.transition.title")}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">
              {t("instant.mode.transition.description")}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onInstantModeChange("story")}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              instantMode === "story" ?
                "border-emerald-500 bg-emerald-50 shadow-sm"
              : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <p className="text-sm font-semibold text-zinc-900">{t("instant.mode.story.title")}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">
              {t("instant.mode.story.description")}
            </p>
          </button>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-zinc-900">
          {instantMode === "story" ?
            t("instant.storyboard.defaultTransitionPaceTitle")
          : t("instant.mode.durationTitle")}
        </p>
        {instantMode === "story" ?
          <p className="mt-1 text-xs text-zinc-500">{t("instant.storyboard.defaultTransitionPaceHint")}</p>
        : null}
        <div className="mt-3 flex flex-col gap-2">
          {instantMode === "story" ?
            STORY_SCENE_DURATION_OPTIONS.map((seconds) => {
              const keys = STORY_FALLBACK_DURATION_KEYS[seconds];
              const selected = storyFallbackFromTransition(transitionSeconds) === seconds;
              return (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => {
                    const mapped: InstantTransitionSeconds =
                      seconds === 3 ? 3 : seconds === 7 ? 8 : 5;
                    onTransitionSecondsChange(mapped);
                  }}
                  className={`rounded-xl border px-4 py-2.5 text-left ${
                    selected ?
                      "border-emerald-500 bg-emerald-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-900">{t(keys.title as never)}</p>
                  <p className="text-xs text-zinc-500">{t(keys.subtitle as never)}</p>
                </button>
              );
            })
          : INSTANT_TRANSITION_SECONDS_OPTIONS.map((seconds) => {
              const keys = TRANSITION_DURATION_LABEL_KEYS[seconds];
              const selected = transitionSeconds === seconds;
              return (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => onTransitionSecondsChange(seconds)}
                  className={`rounded-xl border px-4 py-2.5 text-left ${
                    selected ?
                      "border-emerald-500 bg-emerald-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-900">{t(keys.title as never)}</p>
                  <p className="text-xs text-zinc-500">{t(keys.subtitle as never)}</p>
                </button>
              );
            })}
        </div>
      </div>

      {imageCount >= 2 ? (
        <div className="space-y-2">
          <p className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            {instantMode === "story" ?
              storyboardDurationSeconds !== videoDurationSeconds ?
                t("instant.storyboard.statsDetailed", {
                  scenes: frameCount,
                  storyboard: storyboardDurationSeconds,
                  video: videoDurationSeconds,
                  price: estimatedPriceLabel,
                })
              : t("instant.storyboard.statsTransition", {
                  frames: frameCount,
                  transitions: transitionCount,
                  seconds: videoDurationSeconds,
                  price: estimatedPriceLabel,
                })
            : t("instant.mode.stats", {
                images: imageCount,
                transitions: transitionCount,
                seconds: videoDurationSeconds,
                price: estimatedPriceLabel,
              })}
          </p>
          {pacingOptionsShareSamePrice ?
            <p className="rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2 text-xs text-sky-950">
              {t("instant.pricing.samePricePacingOnly")}
            </p>
          : null}
          {instantMode === "story" && perTransitionProviderSeconds !== storyDurationDefault(transitionSeconds) ?
            <p className="text-xs text-zinc-500">
              {t("instant.pricing.providerPerTransition", {
                seconds: perTransitionProviderSeconds,
              })}
            </p>
          : null}
        </div>
      ) : null}

      {instantMode === "story" && imageCount > 0 ?
        <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          {t("instant.mode.story.warning")}
        </p>
      : null}
    </div>
  );
}

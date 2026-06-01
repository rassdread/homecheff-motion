"use client";

import type { InstantMode, InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import { INSTANT_TRANSITION_SECONDS_OPTIONS } from "@/lib/instant-premium-mode-types";
import { useActiveTranslator } from "@/i18n/client";

export type InstantSceneTextDraft = {
  title: string;
  subtitle: string;
};

type InstantModePanelProps = {
  instantMode: InstantMode;
  onInstantModeChange: (mode: InstantMode) => void;
  transitionSeconds: InstantTransitionSeconds;
  onTransitionSecondsChange: (seconds: InstantTransitionSeconds) => void;
  imageCount: number;
  transitionCount: number;
  totalDurationSeconds: number;
  estimatedPriceLabel: string;
  sceneTexts: InstantSceneTextDraft[];
  onSceneTextChange: (index: number, patch: Partial<InstantSceneTextDraft>) => void;
};

const DURATION_LABEL_KEYS: Record<
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

export function InstantModePanel({
  instantMode,
  onInstantModeChange,
  transitionSeconds,
  onTransitionSecondsChange,
  imageCount,
  transitionCount,
  totalDurationSeconds,
  estimatedPriceLabel,
  sceneTexts,
  onSceneTextChange,
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
        <p className="text-sm font-semibold text-zinc-900">{t("instant.mode.durationTitle")}</p>
        <div className="mt-3 flex flex-col gap-2">
          {INSTANT_TRANSITION_SECONDS_OPTIONS.map((seconds) => {
            const keys = DURATION_LABEL_KEYS[seconds];
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
        <p className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          {t("instant.mode.stats", {
            images: imageCount,
            transitions: transitionCount,
            seconds: totalDurationSeconds,
            price: estimatedPriceLabel,
          })}
        </p>
      ) : null}

      {instantMode === "story" && imageCount > 0 ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
            {t("instant.mode.story.warning")}
          </p>
          {sceneTexts.map((scene, index) => (
            <div
              key={index}
              className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("instant.mode.sceneLabel", { index: index + 1 })}
              </p>
              <label className="mt-2 block text-xs text-zinc-500">
                {t("instant.mode.sceneTitle")}
                <input
                  type="text"
                  value={scene.title}
                  onChange={(e) => onSceneTextChange(index, { title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                  placeholder={t("instant.mode.sceneTitlePlaceholder")}
                />
              </label>
              <label className="mt-2 block text-xs text-zinc-500">
                {t("instant.mode.sceneSubtitle")}
                <input
                  type="text"
                  value={scene.subtitle}
                  onChange={(e) => onSceneTextChange(index, { subtitle: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                  placeholder={t("instant.mode.sceneSubtitlePlaceholder")}
                />
              </label>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

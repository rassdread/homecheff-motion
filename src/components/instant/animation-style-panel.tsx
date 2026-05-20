"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  ANIMATION_STYLE_IDS,
  applyAnimationStyleToPosterSettings,
  getAnimationStyle,
  normalizeAnimationStyleId,
  type AnimationStyleId,
} from "@/lib/animation-style-presets";
import type { InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";
import { analyzeSceneIntelligence } from "@/lib/scene-intelligence";

const TONE_BORDER: Record<string, string> = {
  violet: "border-violet-400 ring-violet-400",
  amber: "border-amber-400 ring-amber-400",
  emerald: "border-emerald-400 ring-emerald-400",
  sky: "border-sky-400 ring-sky-400",
  zinc: "border-zinc-400 ring-zinc-400",
  rose: "border-rose-400 ring-rose-400",
};

type Props = {
  settings: PosterMotionSettings;
  imageCount: number;
  userIntent?: string;
  imageHints?: string[];
  /** Hide auto-detected scene hints from creators (admin can enable). */
  showSceneHints?: boolean;
  onStyleChange: (styleId: AnimationStyleId, settings: PosterMotionSettings) => void;
  onStylePresetChange?: (preset: InstantPremiumStylePreset) => void;
};

export function AnimationStylePanel({
  settings,
  imageCount,
  userIntent,
  imageHints,
  showSceneHints = false,
  onStyleChange,
  onStylePresetChange,
}: Props) {
  const t = useActiveTranslator();
  const activeId = normalizeAnimationStyleId(settings.animationStyleId);

  function selectStyle(styleId: AnimationStyleId) {
    const style = getAnimationStyle(styleId);
    const scene = analyzeSceneIntelligence({
      animationStyleId: styleId,
      userIntent,
      imageCount,
      imageHints,
    });
    const next = applyAnimationStyleToPosterSettings(styleId, {
      ...settings,
      sceneIntelligence: scene,
      emotionalActingPreset:
        style.emotionalActingPreset === "auto_detect"
          ? scene.resolvedEmotionalPreset
          : style.emotionalActingPreset,
    });
    onStyleChange(styleId, next);
    onStylePresetChange?.(style.stylePreset);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          {t("instant.creatorStep.animationType")}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
          {t("instant.animationStyle.creatorIntro")}
        </p>
      </div>

      <div className="grid gap-3">
        {ANIMATION_STYLE_IDS.map((id) => {
          const style = getAnimationStyle(id);
          const selected = activeId === id;
          const ring = TONE_BORDER[style.iconTone] ?? TONE_BORDER.violet;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectStyle(id)}
              className={`rounded-2xl border-2 px-5 py-4 text-left transition ${
                selected
                  ? `bg-violet-50/90 ring-2 ${ring} border-transparent`
                  : "border-zinc-200/90 bg-white hover:border-violet-200 hover:shadow-sm"
              }`}
            >
              <span className="text-base font-semibold text-zinc-900">{t(style.labelKey as never)}</span>
              <span className="mt-1.5 block text-sm text-zinc-600">{t(style.descriptionKey as never)}</span>
              {id === "cartoon_animation" ? (
                <span className="mt-2 inline-block rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-medium text-white">
                  {t("instant.animationStyle.recommended")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {showSceneHints && settings.sceneIntelligence?.detectedRoles?.length ? (
        <p className="rounded-lg border border-violet-200/60 bg-violet-50/50 px-2 py-1.5 text-[11px] text-violet-950">
          {t("instant.animationStyle.sceneDetected", {
            roles: settings.sceneIntelligence.detectedRoles
              .map((r) => r.roleId.replace(/_/g, " "))
              .join(", "),
          })}
        </p>
      ) : null}
    </div>
  );
}


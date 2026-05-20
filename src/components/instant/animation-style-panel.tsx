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
  const activeVisual = getAnimationStyle(activeId).identity.visual;

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
          const { visual } = style.identity;
          const selected = activeId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectStyle(id)}
              className={`rounded-2xl border-2 px-5 py-4 text-left transition ${
                selected ? visual.cardSelected : `${visual.cardIdle} ${visual.cardHover}`
              }`}
            >
              <span className="text-base font-semibold text-zinc-900">{t(style.labelKey as never)}</span>
              <span className="mt-1 block text-xs font-medium text-zinc-500">
                {t(visual.identityTaglineKey as never)}
              </span>
              <span className="mt-1.5 block text-sm text-zinc-600">{t(style.descriptionKey as never)}</span>
              {id === "cartoon_animation" ? (
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${visual.badge}`}
                >
                  {t("instant.animationStyle.recommended")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {showSceneHints && settings.sceneIntelligence?.detectedRoles?.length ? (
        <p
          className={`rounded-lg border px-2 py-1.5 text-[11px] ${
            activeVisual.cardSelected.includes("violet")
              ? "border-violet-200/60 bg-violet-50/50 text-violet-950"
              : "border-zinc-200 bg-zinc-50 text-zinc-800"
          }`}
        >
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

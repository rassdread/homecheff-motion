"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  DEFAULT_OVERLAY_STYLE,
  DEFAULT_TEXT_RENDER_MODE,
  usesPosterMotionPreserve,
  type OverlayStyle,
  type TextRenderMode,
} from "@/lib/hybrid-motion-overlay";
import { AnimationStylePanel } from "@/components/instant/animation-style-panel";
import { AdvancedMotionDeveloperPanel } from "@/components/instant/advanced-motion-developer-panel";
import {
  applyAnimationStyleToPosterSettings,
  DEFAULT_ANIMATION_STYLE_ID,
} from "@/lib/animation-style-presets";
import type { InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import {
  DEFAULT_POSTER_MOTION_SETTINGS,
  type PosterMotionSettings,
} from "@/lib/poster-motion-preserve";

type Props = {
  textRenderMode: TextRenderMode;
  overlayStyle: OverlayStyle;
  posterMotionSettings: PosterMotionSettings;
  imageCount: number;
  userIntent?: string;
  imageHints?: string[];
  isAdmin?: boolean;
  onTextRenderModeChange: (mode: TextRenderMode) => void;
  onOverlayStyleChange: (style: OverlayStyle) => void;
  onPosterMotionSettingsChange: (patch: Partial<PosterMotionSettings>) => void;
  onStylePresetChange?: (preset: InstantPremiumStylePreset) => void;
};

export function TextIntegrationPanel({
  textRenderMode,
  overlayStyle,
  posterMotionSettings,
  imageCount,
  userIntent,
  imageHints,
  isAdmin = false,
  onTextRenderModeChange,
  onOverlayStyleChange,
  onPosterMotionSettingsChange,
  onStylePresetChange,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      {usesPosterMotionPreserve(textRenderMode) ? (
        <>
          <AnimationStylePanel
            settings={posterMotionSettings}
            imageCount={imageCount}
            userIntent={userIntent}
            imageHints={imageHints}
            onStyleChange={(_styleId, next) => onPosterMotionSettingsChange(next)}
            onStylePresetChange={onStylePresetChange}
          />
          <p className="mt-2 text-[11px] text-emerald-800">{t("instant.animationStyle.textSafeHint")}</p>
          <AdvancedMotionDeveloperPanel
            textRenderMode={textRenderMode}
            overlayStyle={overlayStyle}
            posterMotionSettings={posterMotionSettings}
            isAdmin={isAdmin}
            onTextRenderModeChange={onTextRenderModeChange}
            onOverlayStyleChange={onOverlayStyleChange}
            onPosterMotionSettingsChange={onPosterMotionSettingsChange}
            onStylePresetChange={onStylePresetChange}
          />
        </>
      ) : (
        <p className="text-xs text-emerald-900/80">{t("instant.textIntegration.legacyModeHint")}</p>
      )}

      {textRenderMode === DEFAULT_TEXT_RENDER_MODE ? (
        <p className="mt-2 text-[11px] text-emerald-800">{t("instant.textIntegration.recommended")}</p>
      ) : null}
    </div>
  );
}

export {
  DEFAULT_TEXT_RENDER_MODE,
  DEFAULT_OVERLAY_STYLE,
  DEFAULT_POSTER_MOTION_SETTINGS,
  applyAnimationStyleToPosterSettings,
  DEFAULT_ANIMATION_STYLE_ID,
};

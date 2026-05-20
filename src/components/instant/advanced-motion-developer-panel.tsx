"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { ManualForegroundRegionsPanel } from "@/components/instant/manual-foreground-regions-panel";
import { PosterMotionPanel } from "@/components/instant/poster-motion-panel";
import { PremiumPolishPanel } from "@/components/instant/premium-polish-panel";
import {
  OVERLAY_STYLES,
  TEXT_RENDER_MODES,
  type OverlayStyle,
  type TextRenderMode,
} from "@/lib/hybrid-motion-overlay";
import { getPremiumPolishPreset, type PremiumPolishPresetId } from "@/lib/premium-polish-presets";
import type { InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";

const MODE_LABEL_KEYS: Record<TextRenderMode, string> = {
  poster_motion_preserve: "instant.textIntegration.mode.posterMotion",
  deevid_text_safe: "instant.textIntegration.mode.deevid",
  hybrid_overlay: "instant.textIntegration.mode.hybrid",
  ai_protection: "instant.textIntegration.mode.aiProtection",
  exact_freeze: "instant.textIntegration.mode.exactFreeze",
  none: "instant.textIntegration.mode.none",
};

type Props = {
  textRenderMode: TextRenderMode;
  overlayStyle: OverlayStyle;
  posterMotionSettings: PosterMotionSettings;
  isAdmin?: boolean;
  onTextRenderModeChange: (mode: TextRenderMode) => void;
  onOverlayStyleChange: (style: OverlayStyle) => void;
  onPosterMotionSettingsChange: (patch: Partial<PosterMotionSettings>) => void;
  onStylePresetChange?: (preset: InstantPremiumStylePreset) => void;
};

export function AdvancedMotionDeveloperPanel({
  textRenderMode,
  overlayStyle,
  posterMotionSettings,
  isAdmin = false,
  onTextRenderModeChange,
  onOverlayStyleChange,
  onPosterMotionSettingsChange,
  onStylePresetChange,
}: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-zinc-800"
        onClick={() => setOpen((v) => !v)}
      >
        {t("instant.advancedMotion.title")}
        <span className="text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="border-t border-zinc-200 px-3 pb-3">
          <p className="mt-2 text-[11px] text-zinc-600">{t("instant.advancedMotion.hint")}</p>

          <fieldset className="mt-3">
            <legend className="text-xs font-medium text-zinc-700">
              {t("instant.textIntegration.modeLabel")}
            </legend>
            <div className="mt-2 grid gap-2">
              {TEXT_RENDER_MODES.map((mode) => (
                <label
                  key={mode}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                    textRenderMode === mode ? "border-zinc-500 bg-white" : "border-zinc-200 bg-white/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="textRenderModeAdvanced"
                    checked={textRenderMode === mode}
                    onChange={() => onTextRenderModeChange(mode)}
                  />
                  <span className="font-medium text-zinc-900">{t(MODE_LABEL_KEYS[mode] as never)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-3">
            <label className="text-xs font-medium text-zinc-700">
              {t("instant.textIntegration.styleLabel")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs"
              value={overlayStyle}
              onChange={(e) => onOverlayStyleChange(e.target.value as OverlayStyle)}
            >
              {OVERLAY_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>

          <PremiumPolishPanel
            settings={posterMotionSettings}
            onPresetChange={(presetId: PremiumPolishPresetId) => {
              const preset = getPremiumPolishPreset(presetId);
              onStylePresetChange?.(preset.stylePreset);
            }}
            onSettingsChange={onPosterMotionSettingsChange}
          />
          <ManualForegroundRegionsPanel
            regions={posterMotionSettings.manualForegroundRegions ?? []}
            onChange={(manualForegroundRegions) =>
              onPosterMotionSettingsChange({ manualForegroundRegions })
            }
          />
          <PosterMotionPanel settings={posterMotionSettings} onChange={onPosterMotionSettingsChange} />
        </div>
      ) : null}
    </div>
  );
}

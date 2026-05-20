"use client";

import { useMemo, useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
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
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import {
  buildCompactInstantStoryBlock,
  buildCompactViduMotionPrompt,
  estimateBudgetedViduPromptLength,
  VIDU_PROMPT_MAX_CHARS,
} from "@/lib/vidu-prompt-budget";
import { isIndexedDbAvailable } from "@/lib/instant-premium-wizard-storage";

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
  showAdminDiagnostics?: boolean;
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
  showAdminDiagnostics = false,
  onTextRenderModeChange,
  onOverlayStyleChange,
  onPosterMotionSettingsChange,
  onStylePresetChange,
}: Props) {
  const t = useActiveTranslator();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const viduPromptEstimate = useMemo(() => {
    if (!mounted) {
      return { chars: 0, log: { charsAfter: 0, maxChars: VIDU_PROMPT_MAX_CHARS } };
    }
    const profile = resolvePremiumPolishProfile(posterMotionSettings);
    const motion = buildCompactViduMotionPrompt(profile, {
      transitionOrder: 1,
      transitionTotal: 3,
    });
    const story = buildCompactInstantStoryBlock({
      aspectRatio: "9:16",
      duration: 8,
      styleLine: "Warm cinematic food promo style.",
      chipSummary: "(none — rely on defaults above.)",
      continuityLine: "Balanced continuity with subtle variation.",
      userIntent: "(none — follow defaults and chip directions only.)",
    });
    return estimateBudgetedViduPromptLength({ storyBlock: story, motionBlock: motion });
  }, [mounted, posterMotionSettings]);

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
          {showAdminDiagnostics ? (
            <p
              className="mt-2 rounded-lg border border-violet-200/80 bg-violet-50/60 px-2 py-1.5 font-mono text-[10px] text-violet-950"
              suppressHydrationWarning
            >
              {mounted
                ? t("instant.advancedMotion.viduPromptBudget", {
                    chars: viduPromptEstimate.chars,
                    max: VIDU_PROMPT_MAX_CHARS,
                  })
                : `Vidu prompt: — / ${VIDU_PROMPT_MAX_CHARS}`}
              <br />
              {mounted ? ` · indexedDb: ${isIndexedDbAvailable() ? "yes" : "no"}` : null}
            </p>
          ) : null}

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

"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { AdvancedMotionDeveloperPanel } from "@/components/instant/advanced-motion-developer-panel";
import { LockedTextLayersEditor, type LockedTextLayerDraft } from "@/components/instant/locked-text-layers-editor";
import type { OverlayStyle, TextRenderMode } from "@/lib/hybrid-motion-overlay";
import {
  INSTANT_PREMIUM_CHIP_IDS,
  type InstantPremiumChipId,
  type InstantPremiumContinuityStrength,
} from "@/lib/instant-premium-prompt";
import type { InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import type { TextImplyingChipId } from "@/lib/locked-text-layer";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";

const CHIP_LABEL_KEYS: Record<InstantPremiumChipId, string> = {
  slow_zoom_in: "instant.chip.slow_zoom_in",
  cinematic_soft: "instant.chip.cinematic_soft",
  subtle_pan: "instant.chip.subtle_pan",
  close_up_focus: "instant.chip.close_up_focus",
  focus_details: "instant.chip.focus_details",
  subject_centered: "instant.chip.subject_centered",
  food_appetizing: "instant.chip.food_appetizing",
  more_dynamic: "instant.chip.more_dynamic",
  ai_decide: "instant.chip.ai_decide",
};

type Props = {
  isAdmin: boolean;
  showAdminDiagnostics?: boolean;
  textRenderMode: TextRenderMode;
  overlayStyle: OverlayStyle;
  posterMotionSettings: PosterMotionSettings;
  aspectRatio: "9:16" | "16:9";
  continuityStrength: InstantPremiumContinuityStrength;
  chips: (InstantPremiumChipId | TextImplyingChipId)[];
  lockedTextMode: boolean;
  lockedTextLayers: LockedTextLayerDraft[];
  fastRenderMode: boolean;
  onTextRenderModeChange: (mode: TextRenderMode) => void;
  onOverlayStyleChange: (style: OverlayStyle) => void;
  onPosterMotionSettingsChange: (patch: Partial<PosterMotionSettings>) => void;
  onStylePresetChange?: (preset: InstantPremiumStylePreset) => void;
  onAspectRatioChange: (ratio: "9:16" | "16:9") => void;
  onContinuityStrengthChange: (v: InstantPremiumContinuityStrength) => void;
  onChipsChange: (chips: (InstantPremiumChipId | TextImplyingChipId)[]) => void;
  onLockedTextModeChange: (v: boolean) => void;
  onLockedTextLayersChange: (layers: LockedTextLayerDraft[]) => void;
  onFastRenderModeChange: (v: boolean) => void;
};

export function AdvancedCreatorSettingsPanel(props: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);

  if (!props.isAdmin) {
    return null;
  }

  const chipSet = new Set(props.chips);

  function toggleChip(id: InstantPremiumChipId | TextImplyingChipId) {
    const next = chipSet.has(id) ? props.chips.filter((c) => c !== id) : [...props.chips, id];
    props.onChipsChange(next);
  }

  return (
    <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50/90">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-zinc-800"
        onClick={() => setOpen((v) => !v)}
      >
        {t("instant.advancedCreator.title")}
        <span className="text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-zinc-200 px-4 pb-4 pt-3">
          <p className="text-xs text-zinc-600">{t("instant.advancedCreator.hint")}</p>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={props.fastRenderMode}
              onChange={(e) => props.onFastRenderModeChange(e.target.checked)}
            />
            <span>{t("instant.fastRender.label")}</span>
          </label>

          <div>
            <p className="text-xs font-medium text-zinc-800">{t("instant.step6.title")}</p>
            <div className="mt-2 flex gap-2">
              {(["9:16", "16:9"] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => props.onAspectRatioChange(ratio)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-medium ${
                    props.aspectRatio === ratio
                      ? "border-zinc-600 bg-white"
                      : "border-zinc-200 bg-white/80"
                  }`}
                >
                  {ratio === "9:16" ? t("instant.step6.vertical") : t("instant.step6.horizontal")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-800">{t("instant.step5.continuityTitle")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["balanced", "strict"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => props.onContinuityStrengthChange(c)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                    props.continuityStrength === c
                      ? "border-zinc-600 bg-white"
                      : "border-zinc-200 bg-white/80"
                  }`}
                >
                  {c === "strict"
                    ? t("instant.step5.continuityStrict")
                    : t("instant.step5.continuityBalanced")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-800">{t("instant.step5.chipsTitle")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {INSTANT_PREMIUM_CHIP_IDS.filter((id) => id !== "ai_decide").map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleChip(id)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    chipSet.has(id) ? "border-zinc-600 bg-white" : "border-zinc-200"
                  }`}
                >
                  {t(CHIP_LABEL_KEYS[id] as never)}
                </button>
              ))}
            </div>
          </div>

          <LockedTextLayersEditor
            enabled={props.lockedTextMode}
            onEnabledChange={props.onLockedTextModeChange}
            layers={props.lockedTextLayers}
            onLayersChange={props.onLockedTextLayersChange}
          />

          <AdvancedMotionDeveloperPanel
            textRenderMode={props.textRenderMode}
            overlayStyle={props.overlayStyle}
            posterMotionSettings={props.posterMotionSettings}
            isAdmin={props.isAdmin}
            showAdminDiagnostics={props.showAdminDiagnostics}
            onTextRenderModeChange={props.onTextRenderModeChange}
            onOverlayStyleChange={props.onOverlayStyleChange}
            onPosterMotionSettingsChange={props.onPosterMotionSettingsChange}
            onStylePresetChange={props.onStylePresetChange}
          />
        </div>
      ) : null}
    </div>
  );
}

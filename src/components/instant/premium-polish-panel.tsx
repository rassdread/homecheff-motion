"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  PREMIUM_POLISH_PRESET_IDS,
  getPremiumPolishPreset,
  type PremiumPolishPresetId,
} from "@/lib/premium-polish-presets";
import { CAMERA_PRESET_IDS, type CameraPresetId } from "@/lib/premium-camera-presets";
import { FX_PRESET_IDS, type FxPresetId } from "@/lib/premium-fx-presets";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";
import { DEFAULT_PREMIUM_POLISH_PRESET_ID } from "@/lib/premium-polish-presets";
import {
  SEGMENT_TRANSITION_TYPES,
  type SegmentTransitionType,
} from "@/lib/segment-transition-types";
import { MOTION_ENERGY_LEVELS, type MotionEnergy } from "@/lib/premium-motion-engine";

type Props = {
  settings: PosterMotionSettings;
  onPresetChange: (presetId: PremiumPolishPresetId) => void;
  onSettingsChange: (patch: Partial<PosterMotionSettings>) => void;
};

function applyPresetToSettings(presetId: PremiumPolishPresetId): Partial<PosterMotionSettings> {
  const preset = getPremiumPolishPreset(presetId);
  return {
    premiumPresetId: presetId,
    motionEnergy: preset.motionEnergy,
    segmentTransitionType: preset.transitionType,
    cameraPreset: preset.cameraPreset,
    fxPreset: preset.fxPreset,
    comicPreset: preset.comicPreset,
    segmentationProvider: preset.segmentationProvider,
    textPreservation: preset.textPreservation,
    minimalCompositorPolish: preset.minimalCompositorPolish,
    characterMotion: preset.characterMotion,
  };
}

export function PremiumPolishPanel({ settings, onPresetChange, onSettingsChange }: Props) {
  const t = useActiveTranslator();
  const presetId = settings.premiumPresetId ?? DEFAULT_PREMIUM_POLISH_PRESET_ID;
  const preset = getPremiumPolishPreset(presetId);

  return (
    <div className="mt-4 rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50/90 to-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-violet-950">{t("instant.premiumPolish.title")}</h3>
      <p className="mt-1 text-xs leading-relaxed text-violet-900/85">{t("instant.premiumPolish.intro")}</p>

      <div className="mt-3">
        <p className="text-xs font-medium text-zinc-800">{t("instant.premiumPolish.presetLabel")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PREMIUM_POLISH_PRESET_IDS.map((id) => {
            const option = getPremiumPolishPreset(id);
            return (
            <button
              key={id}
              type="button"
              onClick={() => {
                onPresetChange(id);
                onSettingsChange(applyPresetToSettings(id));
              }}
              className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                presetId === id
                  ? "border-violet-500 bg-violet-100/80 ring-1 ring-violet-400"
                  : "border-zinc-200 bg-white hover:border-violet-300"
              }`}
            >
              <span className="font-semibold text-zinc-900">{t(option.labelKey as never)}</span>
              <span className="mt-0.5 block text-zinc-600">{t(option.descriptionKey as never)}</span>
            </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs">
          <span className="font-medium text-zinc-800">{t("instant.premiumPolish.motionEnergy")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            value={settings.motionEnergy ?? preset.motionEnergy}
            onChange={(e) => onSettingsChange({ motionEnergy: e.target.value as MotionEnergy })}
          >
            {MOTION_ENERGY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="font-medium text-zinc-800">{t("instant.premiumPolish.transition")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            value={settings.segmentTransitionType ?? preset.transitionType}
            onChange={(e) =>
              onSettingsChange({ segmentTransitionType: e.target.value as SegmentTransitionType })
            }
          >
            {SEGMENT_TRANSITION_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {tt}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="font-medium text-zinc-800">{t("instant.premiumPolish.camera")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            value={settings.cameraPreset ?? preset.cameraPreset}
            onChange={(e) => onSettingsChange({ cameraPreset: e.target.value as CameraPresetId })}
          >
            {CAMERA_PRESET_IDS.filter((c) => c !== "none").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="font-medium text-zinc-800">{t("instant.premiumPolish.fx")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            value={settings.fxPreset ?? preset.fxPreset}
            onChange={(e) => onSettingsChange({ fxPreset: e.target.value as FxPresetId })}
          >
            {FX_PRESET_IDS.filter((f) => f !== "none").map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-2 text-[11px] text-zinc-600">{t("instant.premiumPolish.beforeAfter")}</p>
      <p className="mt-2 rounded-lg border border-violet-200/60 bg-violet-50/50 px-2 py-1.5 text-[11px] text-violet-950">
        {t("instant.premiumPolish.pipelineHint")}
      </p>
    </div>
  );
}

export function PremiumPresetSummary({ settings }: { settings: PosterMotionSettings }) {
  const t = useActiveTranslator();
  const presetId = settings.premiumPresetId ?? DEFAULT_PREMIUM_POLISH_PRESET_ID;
  const preset = getPremiumPolishPreset(presetId);
  return (
    <p className="text-[11px] text-zinc-600">
      {t("instant.premiumPolish.summary", {
        preset: t(preset.labelKey as never),
        transition: settings.segmentTransitionType ?? preset.transitionType,
        energy: settings.motionEnergy ?? preset.motionEnergy,
      })}
    </p>
  );
}

"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  STUDIO_IDLE_ANIMATION_STYLES,
  STUDIO_PERFORMANCE_LEVELS,
} from "@/lib/studio-character-performance";
import type { StudioCharacterDetail } from "@/types/studio-api";

export type CharacterPerformanceFormState = {
  performanceEnabled: boolean;
  defaultSmileStrength: number;
  defaultBlinkRate: string;
  defaultHeadMovement: string;
  defaultMouthIntensity: string;
  idleAnimationStyle: string;
  performanceNotes: string;
};

export function characterPerformanceStateFromDetail(
  character: StudioCharacterDetail
): CharacterPerformanceFormState {
  return {
    performanceEnabled: character.performanceEnabled,
    defaultSmileStrength: character.defaultSmileStrength ?? 70,
    defaultBlinkRate: character.defaultBlinkRate || "medium",
    defaultHeadMovement: character.defaultHeadMovement || "medium",
    defaultMouthIntensity: character.defaultMouthIntensity || "medium",
    idleAnimationStyle: character.idleAnimationStyle || "subtle",
    performanceNotes: character.performanceNotes || "",
  };
}

type Props = {
  value: CharacterPerformanceFormState;
  onChange: (next: CharacterPerformanceFormState) => void;
};

export function StudioCharacterPerformanceProfilePanel({ value, onChange }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
        <input
          type="checkbox"
          checked={value.performanceEnabled}
          onChange={(e) => onChange({ ...value, performanceEnabled: e.target.checked })}
        />
        {t("studio.characterPerformance.enabled")}
      </label>

      <div>
        <label className="text-sm font-medium text-zinc-800">
          {t("studio.characterPerformance.smileStrength")} ({value.defaultSmileStrength}%)
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={value.defaultSmileStrength}
          disabled={!value.performanceEnabled}
          onChange={(e) =>
            onChange({ ...value, defaultSmileStrength: Number(e.target.value) })
          }
          className="mt-1 w-full"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">{t("studio.characterPerformance.blinkRate")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={value.defaultBlinkRate}
            disabled={!value.performanceEnabled}
            onChange={(e) => onChange({ ...value, defaultBlinkRate: e.target.value })}
          >
            {STUDIO_PERFORMANCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`studio.characterPerformance.level.${level}` as never)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">{t("studio.characterPerformance.headMovement")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={value.defaultHeadMovement}
            disabled={!value.performanceEnabled}
            onChange={(e) => onChange({ ...value, defaultHeadMovement: e.target.value })}
          >
            {STUDIO_PERFORMANCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`studio.characterPerformance.level.${level}` as never)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">{t("studio.characterPerformance.mouthIntensity")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={value.defaultMouthIntensity}
            disabled={!value.performanceEnabled}
            onChange={(e) => onChange({ ...value, defaultMouthIntensity: e.target.value })}
          >
            {STUDIO_PERFORMANCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`studio.characterPerformance.level.${level}` as never)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">{t("studio.characterPerformance.idleStyle")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={value.idleAnimationStyle}
            disabled={!value.performanceEnabled}
            onChange={(e) => onChange({ ...value, idleAnimationStyle: e.target.value })}
          >
            {STUDIO_IDLE_ANIMATION_STYLES.map((style) => (
              <option key={style} value={style}>
                {t(`studio.characterPerformance.idle.${style}` as never)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-zinc-800">{t("studio.characterPerformance.notes")}</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          rows={3}
          value={value.performanceNotes}
          disabled={!value.performanceEnabled}
          onChange={(e) => onChange({ ...value, performanceNotes: e.target.value })}
        />
      </label>
    </div>
  );
}

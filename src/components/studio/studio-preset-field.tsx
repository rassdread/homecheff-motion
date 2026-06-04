"use client";

import { STUDIO_SCENE_CUSTOM_VALUE } from "@/lib/studio-scene-presets";
import { useActiveTranslator } from "@/i18n/client";

type StudioPresetFieldProps = {
  label: string;
  group: "action" | "emotion" | "camera";
  presets: readonly string[];
  value: string;
  onChange: (value: string) => void;
};

export function StudioPresetField({
  label,
  group,
  presets,
  value,
  onChange,
}: StudioPresetFieldProps) {
  const t = useActiveTranslator();
  const isPreset = presets.includes(value as (typeof presets)[number]);
  const selectValue = isPreset ? value : value.trim() ? STUDIO_SCENE_CUSTOM_VALUE : "";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === STUDIO_SCENE_CUSTOM_VALUE) {
            onChange(isPreset ? "" : value);
            return;
          }
          onChange(next);
        }}
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
      >
        <option value="">—</option>
        {presets.map((preset) => (
          <option key={preset} value={preset}>
            {t(`studio.storyboards.preset.${group}.${preset}` as Parameters<typeof t>[0])}
          </option>
        ))}
        <option value={STUDIO_SCENE_CUSTOM_VALUE}>
          {t("studio.storyboards.preset.custom")}
        </option>
      </select>
      {selectValue === STUDIO_SCENE_CUSTOM_VALUE || (!isPreset && value.trim()) ? (
        <input
          type="text"
          value={isPreset ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("studio.storyboards.preset.customPlaceholder")}
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        />
      ) : null}
    </div>
  );
}

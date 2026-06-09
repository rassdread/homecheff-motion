"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  listBodyDesignerPresets,
  patchBodyDesignerParams,
  resolveBodyDesignerPreset,
  resolveBodyDesignerSliderRange,
  type BodyDesignerSliderKey,
} from "@/lib/editor-body-designer";
import type { CharacterBodyDesignerParams } from "@/types/homecheff-visual-editor";
import type { AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";

type Props = {
  value: CharacterBodyDesignerParams;
  objectType?: AssetVisionObjectType | string;
  onChange: (next: CharacterBodyDesignerParams) => void;
  onReset: () => void;
};

const SLIDER_KEYS: BodyDesignerSliderKey[] = [
  "headScale",
  "eyeScale",
  "shoulderWidth",
  "armThickness",
  "waistWidth",
  "legLength",
  "handSize",
  "footSize",
  "height",
];

export function EditorBodyDesignerPanel({ value, objectType, onChange, onReset }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("editor.bodyDesigner.title")}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-zinc-200 px-2 py-1 text-[10px] font-semibold uppercase text-zinc-700"
        >
          {t("editor.bodyDesigner.reset")}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-600">{t("editor.bodyDesigner.lead")}</p>

      <div className="mt-3 flex flex-wrap gap-1">
        {listBodyDesignerPresets().map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(resolveBodyDesignerPreset(preset))}
            className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
              value.stylizationPreset === preset
                ? "bg-[#0067B1] text-white"
                : "border border-zinc-200 text-zinc-700"
            }`}
          >
            {t(`editor.bodyDesigner.preset.${preset}` as never)}
          </button>
        ))}
      </div>

      {value.stylizationPreset === "custom" ?
        <label className="mt-3 block text-xs font-medium text-zinc-700">
          {t("editor.bodyDesigner.customLabel")}
          <input
            type="text"
            value={value.stylizationCustom ?? ""}
            onChange={(e) => onChange(patchBodyDesignerParams(value, { stylizationCustom: e.target.value }, objectType))}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
      : null}

      <div className="mt-4 space-y-3">
        {SLIDER_KEYS.map((key) => {
          const range = resolveBodyDesignerSliderRange(key, objectType);
          return (
            <label key={key} className="block text-xs font-medium text-zinc-700">
              {t(`editor.bodyDesigner.slider.${key}` as never)} ({Math.round(value[key] * 100)}%)
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={value[key]}
                onChange={(e) =>
                  onChange(
                    patchBodyDesignerParams(value, { [key]: Number(e.target.value) } as Partial<CharacterBodyDesignerParams>, objectType)
                  )
                }
                className="mt-1 w-full"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
